import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from clients.services import get_client_by_id, get_or_create_client_by_identity
from queues.models import Queue, QueueStatus, Ticket


logger = logging.getLogger(__name__)


def build_queue_snapshot(queue: Queue) -> dict:
    waiting_qs = queue.tickets.filter(status=QueueStatus.WAITING).order_by('enqueued_at', 'id')
    current_ticket = (
        queue.tickets
        .filter(status=QueueStatus.IN_SERVICE)
        .order_by('-updated_at', '-id')
        .first()
    )

    if current_ticket is None:
        current_ticket = (
            queue.tickets
            .filter(status=QueueStatus.CALLED)
            .order_by('-updated_at', '-id')
            .first()
        )

    return {
        'queue_id': queue.id,
        'queue_name': queue.name,
        'waiting_count': waiting_qs.count(),
        'current_ticket': current_ticket,
        'waiting_tickets': list(waiting_qs),
    }


def get_queue_snapshot(queue_id: int) -> dict:
    try:
        queue = Queue.objects.get(pk=queue_id)
    except Queue.DoesNotExist as exc:
        logger.exception('Queue not found while building snapshot. queue_id=%s', queue_id)
        raise NotFound('Очередь не найдена.') from exc

    return build_queue_snapshot(queue)

def add_new_ticket(queue: Queue, client_id: int) -> Ticket:
    # 1. Атомарно увеличиваем счетчик в очереди и получаем обновленный объект
    with transaction.atomic():
        queue = Queue.objects.select_for_update().get(pk=queue.pk)
        queue.last_ticket_number += 1
        queue.save()

        next_number = queue.last_ticket_number
        display_number = f'Q{queue.id}-{next_number:04d}'

        return Ticket.objects.create(
            queue=queue,
            display_number=display_number,
            client_id=client_id,
            status=QueueStatus.WAITING
        )


def resolve_client(queue: Queue, client_id: int | None, client_data: dict | None):
    if client_id:
        client = get_client_by_id(client_id)
    else:
        client = get_or_create_client_by_identity(
            client_data=client_data or {},
            branch_id=str(queue.branch_id),
        )

    return client


def join_queue(queue_id: int, client_id: int | None = None, client_data: dict | None = None) -> Ticket:
    with transaction.atomic():
        try:
            queue = Queue.objects.select_for_update().get(pk=queue_id)
        except Queue.DoesNotExist as exc:
            logger.exception('Queue not found while joining queue. queue_id=%s', queue_id)
            raise NotFound('Очередь не найдена.') from exc

        client = resolve_client(
            queue=queue,
            client_id=client_id,
            client_data=client_data,
        )

        has_active_ticket = queue.tickets.filter(
            client_id=client.id,
            status__in=[QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE],
        ).exists()
        if has_active_ticket:
            logger.error(
                'Client already has active ticket in queue. queue_id=%s client_id=%s',
                queue.id,
                client.id,
            )
            raise ValidationError(
                {
                    'client': ['У клиента уже есть активный талон в этой очереди.']
                }
            )

        return add_new_ticket(queue=queue, client_id=client.id)

def update_ticket(ticket_id: int, new_status: QueueStatus) -> Ticket:
    new_status = QueueStatus(new_status)

    allowed_transitions: dict[QueueStatus, set[QueueStatus]] = {
        QueueStatus.WAITING: {QueueStatus.CALLED, QueueStatus.SKIPPED},
        QueueStatus.CALLED: {QueueStatus.WAITING, QueueStatus.IN_SERVICE, QueueStatus.SKIPPED},
        QueueStatus.IN_SERVICE: {QueueStatus.COMPLETED, QueueStatus.SKIPPED},
        QueueStatus.SKIPPED: set(),
        QueueStatus.COMPLETED: set(),
    }

    with transaction.atomic():
        try:
            ticket = Ticket.objects.select_related('queue', 'client').select_for_update().get(pk=ticket_id)
        except Ticket.DoesNotExist as exc:
            logger.exception('Ticket not found while updating status. ticket_id=%s', ticket_id)
            raise NotFound('Талон не найден.') from exc

        current_status = QueueStatus(ticket.status)
        if current_status == new_status:
            return ticket

        if new_status not in allowed_transitions[current_status]:
            logger.error(
                'Invalid ticket status transition. ticket_id=%s from=%s to=%s',
                ticket_id,
                current_status,
                new_status,
            )
            raise ValidationError(
                {
                    'status': [
                        f'Недопустимый переход статуса: {current_status} -> {new_status}.'
                    ]
                }
            )

        update_fields = ['status']
        ticket.status = new_status

        # Для завершения обслуживания или выхода/удаления фиксируем момент окончания.
        if new_status in {QueueStatus.COMPLETED, QueueStatus.SKIPPED}:
            ticket.finished_at = timezone.now()
            update_fields.append('finished_at')
        else:
            if ticket.finished_at is not None:
                ticket.finished_at = None
                update_fields.append('finished_at')

        ticket.save(update_fields=update_fields)
        return ticket


def invite_next_ticket(queue_id: int) -> Ticket | None:
    with transaction.atomic():
        try:
            queue = Queue.objects.select_for_update().get(pk=queue_id)
        except Queue.DoesNotExist as exc:
            logger.exception('Queue not found while inviting next ticket. queue_id=%s', queue_id)
            raise NotFound('Очередь не найдена.') from exc

        current_in_service_ticket = (
            queue.tickets
            .filter(status=QueueStatus.IN_SERVICE)
            .order_by('-updated_at', '-id')
            .first()
        )

        if current_in_service_ticket is not None:
            current_in_service_ticket.status = QueueStatus.COMPLETED
            current_in_service_ticket.finished_at = timezone.now()
            current_in_service_ticket.save(update_fields=['status', 'finished_at'])

        # Если ранее вызванный талон не перевели в обслуживание, считаем его пропущенным.
        current_called_ticket = (
            queue.tickets
            .filter(status=QueueStatus.CALLED)
            .order_by('-updated_at', '-id')
            .first()
        )
        if current_called_ticket is not None:
            current_called_ticket.status = QueueStatus.SKIPPED
            current_called_ticket.finished_at = timezone.now()
            current_called_ticket.save(update_fields=['status', 'finished_at'])

        next_ticket = (
            queue.tickets
            .filter(status=QueueStatus.WAITING)
            .order_by('enqueued_at', 'id')
            .first()
        )

        if next_ticket is not None:
            next_ticket.status = QueueStatus.CALLED
            next_ticket.save(update_fields=['status'])

        return next_ticket


def append_to_queue(ticket_id: int) -> Ticket:
    with transaction.atomic():
        try:
            ticket = Ticket.objects.select_related('queue', 'client').select_for_update().get(pk=ticket_id)
        except Ticket.DoesNotExist as exc:
            logger.exception('Ticket not found while appending to queue. ticket_id=%s', ticket_id)
            raise NotFound('Талон не найден.') from exc

        current_status = QueueStatus(ticket.status)
        if current_status not in {QueueStatus.CALLED, QueueStatus.IN_SERVICE}:
            logger.error(
                'Append to queue is allowed only for active ticket. ticket_id=%s status=%s',
                ticket_id,
                current_status,
            )
            raise ValidationError(
                {
                    'status': [
                        'Вернуть в очередь можно только активный талон (CALLED или IN_SERVICE).'
                    ]
                }
            )

        ticket.status = QueueStatus.WAITING
        ticket.finished_at = None
        ticket.enqueued_at = timezone.now()
        ticket.save(update_fields=['status', 'finished_at', 'enqueued_at'])
        return ticket


def delete_tickets_from_queue(queue_id: int, ticket_ids: list[int]) -> dict:
    if not ticket_ids:
        logger.error('Bulk ticket deletion was called without ids. queue_id=%s', queue_id)
        raise ValidationError({'ticket_ids': ['Список ticket_ids не должен быть пустым.']})

    normalized_ids = sorted(set(ticket_ids))

    with transaction.atomic():
        try:
            queue = Queue.objects.select_for_update().get(pk=queue_id)
        except Queue.DoesNotExist as exc:
            logger.exception('Queue not found while bulk deleting tickets. queue_id=%s', queue_id)
            raise NotFound('Очередь не найдена.') from exc

        existing_ids = set(
            queue.tickets
            .filter(id__in=normalized_ids)
            .values_list('id', flat=True)
        )

        missing_ids = sorted(set(normalized_ids) - existing_ids)
        if missing_ids:
            logger.error(
                'Some tickets do not belong to queue or missing. queue_id=%s missing_ids=%s',
                queue_id,
                missing_ids,
            )
            raise ValidationError(
                {
                    'ticket_ids': [
                        'Часть талонов не найдена в очереди.',
                    ],
                    'missing_ticket_ids': missing_ids,
                }
            )

        deleted_count, _ = queue.tickets.filter(id__in=normalized_ids).delete()

        return {
            'queue_id': queue.id,
            'deleted_count': deleted_count,
            'deleted_ticket_ids': normalized_ids,
        }