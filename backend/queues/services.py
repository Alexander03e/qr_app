import logging
import math
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from clients.models import Client
from clients.services import get_client_by_id, get_or_create_client_by_identity
from queues.models import Queue, QueueStatus, Ticket


logger = logging.getLogger(__name__)
CALLED_TICKET_TIMEOUT_SECONDS = 5 * 60
SERVICE_HISTORY_LIMIT = 30


def get_called_ticket_timeout_seconds(queue: Queue) -> int:
    if queue.called_ticket_timeout_seconds is None:
        return CALLED_TICKET_TIMEOUT_SECONDS

    return max(int(queue.called_ticket_timeout_seconds), 0)


def duration_seconds(start, end) -> float | None:
    if start is None or end is None:
        return None

    return max((end - start).total_seconds(), 0.0)


def get_average_service_seconds(queue: Queue) -> int | None:
    completed_tickets = (
        queue.tickets
        .filter(status=QueueStatus.COMPLETED, finished_at__isnull=False)
        .order_by('-finished_at', '-id')[:SERVICE_HISTORY_LIMIT]
    )
    durations = []

    for ticket in completed_tickets:
        start_time = ticket.service_started_at or ticket.called_at
        service_seconds = duration_seconds(start_time, ticket.finished_at)
        if service_seconds is not None:
            durations.append(service_seconds)

    if not durations:
        return None

    return int(round(sum(durations) / len(durations)))


def get_active_operator_count(queue: Queue) -> int:
    active_count = queue.assigned_operators.filter(is_active=True).count()
    return max(active_count, 1)


def get_waiting_position(waiting_tickets: list[Ticket], ticket: Ticket) -> int | None:
    for index, waiting_ticket in enumerate(waiting_tickets):
        if waiting_ticket.id == ticket.id:
            return index + 1

    return None


def estimate_client_wait_seconds(
    queue: Queue,
    waiting_tickets: list[Ticket],
    client_ticket: Ticket | None,
) -> int | None:
    if client_ticket is None:
        return None

    if client_ticket.status in {QueueStatus.CALLED, QueueStatus.IN_SERVICE}:
        return 0

    if client_ticket.status != QueueStatus.WAITING:
        return None

    average_service_seconds = get_average_service_seconds(queue)
    if average_service_seconds is None:
        return None

    waiting_position = get_waiting_position(waiting_tickets, client_ticket)
    if waiting_position is None:
        return None

    return math.ceil(
        (waiting_position * average_service_seconds) / get_active_operator_count(queue)
    )


def expire_called_tickets(queue: Queue) -> None:
    timeout_seconds = get_called_ticket_timeout_seconds(queue)
    if timeout_seconds <= 0:
        return

    now = timezone.now()
    threshold = now - timedelta(seconds=timeout_seconds)
    expired_tickets = queue.tickets.filter(
        status=QueueStatus.CALLED,
    ).filter(
        Q(called_at__lte=threshold) |
        Q(called_at__isnull=True, updated_at__lte=threshold)
    )

    for ticket in expired_tickets:
        ticket.status = QueueStatus.NOT_ARRIVED
        ticket.finished_at = now
        ticket.save(update_fields=['status', 'finished_at', 'updated_at'])


def resolve_client_from_identifier(client_id: str | None):
    if not client_id:
        return None

    if client_id.isdigit():
        try:
            return get_client_by_id(client_id=int(client_id))
        except NotFound:
            return None

    try:
        return Client.objects.get(device_id=client_id)
    except Client.DoesNotExist:
        try:
            return Client.objects.get(queue_token=client_id)
        except Client.DoesNotExist:
            return None


def build_queue_snapshot(queue: Queue, client_id: str | None = None) -> dict:
    expire_called_tickets(queue)
    timeout_seconds = get_called_ticket_timeout_seconds(queue)

    waiting_qs = queue.tickets.filter(status=QueueStatus.WAITING).order_by('enqueued_at', 'id')
    waiting_tickets = list(waiting_qs)
    waiting_count = len(waiting_tickets)
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

    client_ticket = None
    client_is_served = False
    client_is_removed = False
    client_is_not_arrived = False
    client_called_remaining_seconds = None
    estimated_wait_seconds = None
    if client_id is not None:
        client = resolve_client_from_identifier(client_id)
        if client is None:
            return {
                'queue_id': queue.id,
                'queue_name': queue.name,
                'queue_language': queue.language,
                'waiting_count': waiting_count,
                'current_ticket': current_ticket,
                'waiting_tickets': waiting_tickets,
                'client_ticket': None,
                'client_is_served': False,
                'client_is_removed': False,
                'client_is_not_arrived': False,
                'client_called_remaining_seconds': None,
                'called_ticket_timeout_seconds': timeout_seconds,
                'estimated_wait_seconds': None,
            }
        client_ticket = (
            queue.tickets
            .filter(
                client_id=client.id,
                status__in=[QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE],
            )
            .order_by('-created_at', '-id')
            .first()
        )
        if client_ticket is None:
            latest_finished_ticket = (
                queue.tickets
                .filter(
                    client_id=client.id,
                    status__in=[
                        QueueStatus.COMPLETED,
                        QueueStatus.LEFT,
                        QueueStatus.NOT_ARRIVED,
                        QueueStatus.REMOVED,
                        QueueStatus.SKIPPED,
                    ],
                )
                .order_by('-updated_at', '-id')
                .first()
            )
            if latest_finished_ticket is not None:
                client_is_served = latest_finished_ticket.status == QueueStatus.COMPLETED
                client_is_removed = latest_finished_ticket.status == QueueStatus.REMOVED
                client_is_not_arrived = latest_finished_ticket.status == QueueStatus.NOT_ARRIVED
        elif client_ticket.status == QueueStatus.CALLED:
            called_at = client_ticket.called_at or client_ticket.updated_at
            elapsed_seconds = int((timezone.now() - called_at).total_seconds())
            if timeout_seconds > 0:
                client_called_remaining_seconds = max(timeout_seconds - elapsed_seconds, 0)
        estimated_wait_seconds = estimate_client_wait_seconds(
            queue=queue,
            waiting_tickets=waiting_tickets,
            client_ticket=client_ticket,
        )

    return {
        'queue_id': queue.id,
        'queue_name': queue.name,
        'queue_language': queue.language,
        'waiting_count': waiting_count,
        'current_ticket': current_ticket,
        'waiting_tickets': waiting_tickets,
        'client_ticket': client_ticket,
        'client_is_served': client_is_served,
        'client_is_removed': client_is_removed,
        'client_is_not_arrived': client_is_not_arrived,
        'client_called_remaining_seconds': client_called_remaining_seconds,
        'called_ticket_timeout_seconds': timeout_seconds,
        'estimated_wait_seconds': estimated_wait_seconds,
    }


def get_queue_snapshot(queue_id: int, client_id: str | None = None) -> dict:
    try:
        queue = Queue.objects.get(pk=queue_id)
    except Queue.DoesNotExist as exc:
        logger.exception('Queue not found while building snapshot. queue_id=%s', queue_id)
        raise NotFound('Очередь не найдена.') from exc

    return build_queue_snapshot(queue=queue, client_id=client_id)

def add_new_ticket(queue: Queue, client_id: int, initial_ticket_number: int) -> Ticket:
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
            initial_ticket_number=initial_ticket_number,
            status=QueueStatus.WAITING
        )


def resolve_client(queue: Queue, client_data: dict | None):
    return get_or_create_client_by_identity(
        client_data=client_data or {},
        branch_id=str(queue.branch_id),
    )


def resolve_join_client(
    queue: Queue,
    client_id: str | None,
    queue_token: str | None,
    client_data: dict | None,
):
    if queue_token is not None:
        payload = client_data.copy() if client_data else {}
        payload['queue_token'] = queue_token
        return resolve_client(queue=queue, client_data=payload)

    if client_id is not None:
        client = resolve_client_from_identifier(client_id)
        if client is not None:
            return client

        payload = client_data.copy() if client_data else {}
        payload['device_id'] = client_id
        return resolve_client(queue=queue, client_data=payload)

    return resolve_client(queue=queue, client_data=client_data)


def join_queue(
    queue_id: int,
    client_id: str | None = None,
    queue_token: str | None = None,
    client_data: dict | None = None,
) -> Ticket:
    with transaction.atomic():
        try:
            queue = Queue.objects.select_for_update().get(pk=queue_id)
        except Queue.DoesNotExist as exc:
            logger.exception('Queue not found while joining queue. queue_id=%s', queue_id)
            raise NotFound('Очередь не найдена.') from exc

        client = resolve_join_client(
            queue=queue,
            client_id=client_id,
            queue_token=queue_token,
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

        if queue.clients_limit is not None:
            active_tickets_count = queue.tickets.filter(
                status__in=[QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE],
            ).count()
            if active_tickets_count >= queue.clients_limit:
                raise ValidationError({'queue': ['Лимит клиентов в очереди достигнут.']})

        initial_ticket_number = queue.tickets.filter(status=QueueStatus.WAITING).count() + 1

        return add_new_ticket(
            queue=queue,
            client_id=client.id,
            initial_ticket_number=initial_ticket_number,
        )

def update_ticket(ticket_id: int, new_status: QueueStatus) -> Ticket:
    new_status = QueueStatus(new_status)

    allowed_transitions: dict[QueueStatus, set[QueueStatus]] = {
        QueueStatus.WAITING: {QueueStatus.CALLED, QueueStatus.SKIPPED, QueueStatus.LEFT, QueueStatus.NOT_ARRIVED, QueueStatus.REMOVED},
        QueueStatus.CALLED: {QueueStatus.WAITING, QueueStatus.IN_SERVICE, QueueStatus.SKIPPED, QueueStatus.LEFT, QueueStatus.NOT_ARRIVED, QueueStatus.REMOVED},
        QueueStatus.IN_SERVICE: {QueueStatus.WAITING, QueueStatus.COMPLETED, QueueStatus.SKIPPED, QueueStatus.REMOVED},
        QueueStatus.SKIPPED: set(),
        QueueStatus.COMPLETED: set(),
        QueueStatus.LEFT: set(),
        QueueStatus.NOT_ARRIVED: set(),
        QueueStatus.REMOVED: set(),
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

        now = timezone.now()
        update_fields = ['status', 'updated_at']
        ticket.status = new_status

        if new_status == QueueStatus.CALLED:
            ticket.called_at = now
            ticket.service_started_at = None
            ticket.finished_at = None
            update_fields.extend(['called_at', 'service_started_at', 'finished_at'])
        elif new_status == QueueStatus.IN_SERVICE:
            if ticket.called_at is None:
                ticket.called_at = now
                update_fields.append('called_at')
            ticket.service_started_at = now
            ticket.finished_at = None
            update_fields.extend(['service_started_at', 'finished_at'])
        elif new_status == QueueStatus.WAITING:
            ticket.called_at = None
            ticket.service_started_at = None
            ticket.finished_at = None
            ticket.enqueued_at = now
            update_fields.extend(['called_at', 'service_started_at', 'finished_at', 'enqueued_at'])
        # Для завершения обслуживания или выхода/удаления фиксируем момент окончания.
        if new_status in {
            QueueStatus.COMPLETED,
            QueueStatus.SKIPPED,
            QueueStatus.LEFT,
            QueueStatus.NOT_ARRIVED,
            QueueStatus.REMOVED,
        }:
            ticket.finished_at = now
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

        now = timezone.now()
        current_in_service_ticket = (
            queue.tickets
            .filter(status=QueueStatus.IN_SERVICE)
            .order_by('-updated_at', '-id')
            .first()
        )

        if current_in_service_ticket is not None:
            current_in_service_ticket.status = QueueStatus.COMPLETED
            current_in_service_ticket.finished_at = now
            current_in_service_ticket.save(update_fields=['status', 'finished_at', 'updated_at'])

        # Если ранее вызванный талон не перевели в обслуживание, считаем его пропущенным.
        current_called_ticket = (
            queue.tickets
            .filter(status=QueueStatus.CALLED)
            .order_by('-updated_at', '-id')
            .first()
        )
        if current_called_ticket is not None:
            current_called_ticket.status = QueueStatus.SKIPPED
            current_called_ticket.finished_at = now
            current_called_ticket.save(update_fields=['status', 'finished_at', 'updated_at'])

        next_ticket = (
            queue.tickets
            .filter(status=QueueStatus.WAITING)
            .order_by('enqueued_at', 'id')
            .first()
        )

        if next_ticket is not None:
            next_ticket.status = QueueStatus.CALLED
            next_ticket.called_at = now
            next_ticket.service_started_at = None
            next_ticket.finished_at = None
            next_ticket.save(update_fields=['status', 'called_at', 'service_started_at', 'finished_at', 'updated_at'])

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
        ticket.called_at = None
        ticket.service_started_at = None
        ticket.enqueued_at = timezone.now()
        ticket.save(update_fields=['status', 'finished_at', 'called_at', 'service_started_at', 'enqueued_at', 'updated_at'])
        return ticket


def skip_one_ahead(ticket_id: int) -> Ticket:
    with transaction.atomic():
        try:
            ticket = Ticket.objects.select_related('queue', 'client').select_for_update().get(pk=ticket_id)
        except Ticket.DoesNotExist as exc:
            logger.exception('Ticket not found while skipping one ahead. ticket_id=%s', ticket_id)
            raise NotFound('Талон не найден.') from exc

        if ticket.status == QueueStatus.CALLED:
            ticket.status = QueueStatus.WAITING
            ticket.finished_at = None
            ticket.called_at = None
            ticket.service_started_at = None
            ticket.enqueued_at = timezone.now()
            ticket.save(update_fields=['status', 'finished_at', 'called_at', 'service_started_at', 'enqueued_at', 'updated_at'])
            return ticket

        if ticket.status != QueueStatus.WAITING:
            raise ValidationError({'status': ['Пропустить одного вперед можно только в статусах WAITING или CALLED.']})

        waiting_ids = list(
            ticket.queue.tickets
            .filter(status=QueueStatus.WAITING)
            .order_by('enqueued_at', 'id')
            .values_list('id', flat=True)
        )

        try:
            index = waiting_ids.index(ticket.id)
        except ValueError as exc:
            raise ValidationError({'ticket': ['Талон не найден в очереди ожидания.']}) from exc

        if index >= len(waiting_ids) - 1:
            return ticket

        next_ticket = Ticket.objects.select_for_update().get(pk=waiting_ids[index + 1])

        if ticket.enqueued_at == next_ticket.enqueued_at:
            ticket.enqueued_at = next_ticket.enqueued_at + timedelta(microseconds=1)
            ticket.save(update_fields=['enqueued_at', 'updated_at'])
            return ticket

        current_enqueued_at = ticket.enqueued_at
        ticket.enqueued_at = next_ticket.enqueued_at
        next_ticket.enqueued_at = current_enqueued_at
        ticket.save(update_fields=['enqueued_at', 'updated_at'])
        next_ticket.save(update_fields=['enqueued_at', 'updated_at'])

        return ticket


def invite_ticket_by_id(ticket_id: int, action: str | None = None) -> Ticket:
    with transaction.atomic():
        try:
            ticket = Ticket.objects.select_related('queue', 'client').select_for_update().get(pk=ticket_id)
        except Ticket.DoesNotExist as exc:
            logger.exception('Ticket not found while inviting by id. ticket_id=%s', ticket_id)
            raise NotFound('Талон не найден.') from exc

        if ticket.status != QueueStatus.WAITING:
            raise ValidationError({'status': ['Приглашать по id можно только талон в статусе WAITING.']})

        now = timezone.now()
        queue = Queue.objects.select_for_update().get(pk=ticket.queue_id)
        current_ticket = (
            queue.tickets
            .filter(status__in=[QueueStatus.IN_SERVICE, QueueStatus.CALLED])
            .exclude(id=ticket.id)
            .order_by('-updated_at', '-id')
            .first()
        )

        if current_ticket is not None:
            if action not in {'complete', 'return'}:
                raise ValidationError({'action': ['Есть текущий талон. Укажите action=complete или action=return.']})

            if action == 'complete':
                current_ticket.status = QueueStatus.COMPLETED
                current_ticket.finished_at = now
                current_ticket.save(update_fields=['status', 'finished_at', 'updated_at'])
            else:
                current_ticket.status = QueueStatus.WAITING
                current_ticket.finished_at = None
                current_ticket.called_at = None
                current_ticket.service_started_at = None
                current_ticket.enqueued_at = now
                current_ticket.save(update_fields=['status', 'finished_at', 'called_at', 'service_started_at', 'enqueued_at', 'updated_at'])

        ticket.status = QueueStatus.CALLED
        ticket.called_at = now
        ticket.service_started_at = None
        ticket.finished_at = None
        ticket.save(update_fields=['status', 'called_at', 'service_started_at', 'finished_at', 'updated_at'])
        return ticket


def remove_ticket_from_queue(ticket_id: int) -> Ticket:
    return update_ticket(ticket_id=ticket_id, new_status=QueueStatus.REMOVED)


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
