from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from clients.services import get_client_by_id, get_or_create_client_by_identity
from queues.models import Queue, QueueStatus, Ticket

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

    if client.branch_id and str(client.branch_id) != str(queue.branch_id):
        raise ValidationError({'client': ['Клиент не принадлежит филиалу этой очереди.']})

    active_statuses = [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE]
    if Ticket.objects.filter(queue=queue, client=client, status__in=active_statuses).exists():
        raise ValidationError({'client': ['У клиента уже есть активный талон в этой очереди.']})

    return client


def join_queue(queue_id: int, client_id: int | None = None, client_data: dict | None = None) -> Ticket:
    with transaction.atomic():
        try:
            queue = Queue.objects.select_for_update().get(pk=queue_id)
        except Queue.DoesNotExist as exc:
            raise NotFound('Очередь не найдена.') from exc

        client = resolve_client(
            queue=queue,
            client_id=client_id,
            client_data=client_data,
        )

        return add_new_ticket(queue=queue, client_id=client.id)

