from collections import Counter, defaultdict
from dataclasses import dataclass, replace
from datetime import datetime

from django.db.models import Avg, Count, Max, Min, QuerySet, Sum
from django.utils import timezone

from companies.models import Branch
from notifications.models import FeedbackItem, FeedbackType
from queues.models import Queue, QueueStatus, Ticket
from users.models import Role, User


ACTIVE_STATUSES = {
    QueueStatus.WAITING,
    QueueStatus.CALLED,
    QueueStatus.IN_SERVICE,
}
FINAL_STATUSES = {
    QueueStatus.COMPLETED,
    QueueStatus.SKIPPED,
    QueueStatus.LEFT,
    QueueStatus.NOT_ARRIVED,
    QueueStatus.REMOVED,
}
SLA_WAIT_SECONDS = 10 * 60


@dataclass(frozen=True)
class MetricsFilters:
    branch_id: int | None = None
    queue_id: int | None = None
    operator_id: int | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


def _average(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def _percent(value: int | float, total: int | float) -> float:
    if not total:
        return 0.0
    return round((value / total) * 100, 2)


def _duration_seconds(start: datetime | None, end: datetime | None) -> float | None:
    if start is None or end is None:
        return None
    return max((end - start).total_seconds(), 0.0)


def _filtered_tickets(
    company_id: int,
    filters: MetricsFilters,
    *,
    include_operator: bool = True,
) -> QuerySet[Ticket]:
    tickets = (
        Ticket.objects
        .select_related('queue', 'queue__branch', 'operator')
        .filter(queue__branch__company_id=company_id)
    )

    if filters.branch_id is not None:
        tickets = tickets.filter(queue__branch_id=filters.branch_id)
    if filters.queue_id is not None:
        tickets = tickets.filter(queue_id=filters.queue_id)
    if include_operator and filters.operator_id is not None:
        tickets = tickets.filter(operator_id=filters.operator_id)
    if filters.date_from is not None:
        tickets = tickets.filter(enqueued_at__gte=filters.date_from)
    if filters.date_to is not None:
        tickets = tickets.filter(enqueued_at__lte=filters.date_to)

    return tickets.order_by('id')


def _filtered_feedback(company_id: int, filters: MetricsFilters) -> QuerySet[FeedbackItem]:
    feedback = FeedbackItem.objects.filter(company_id=company_id)

    if filters.branch_id is not None:
        feedback = feedback.filter(branch_id=filters.branch_id)
    if filters.queue_id is not None:
        feedback = feedback.filter(queue_id=filters.queue_id)
    if filters.operator_id is not None:
        feedback = feedback.filter(ticket__operator_id=filters.operator_id)
    if filters.date_from is not None:
        feedback = feedback.filter(created_at__gte=filters.date_from)
    if filters.date_to is not None:
        feedback = feedback.filter(created_at__lte=filters.date_to)

    return feedback


def _queue_queryset(company_id: int, filters: MetricsFilters) -> QuerySet[Queue]:
    queues = Queue.objects.select_related('branch').filter(branch__company_id=company_id)

    if filters.branch_id is not None:
        queues = queues.filter(branch_id=filters.branch_id)
    if filters.queue_id is not None:
        queues = queues.filter(id=filters.queue_id)
    if filters.operator_id is not None:
        queues = queues.filter(assigned_operators__id=filters.operator_id)

    return queues.distinct().order_by('id')


def _ticket_counts(tickets: QuerySet[Ticket]) -> dict[str, int]:
    return {
        'total_tickets': tickets.count(),
        'waiting_tickets': tickets.filter(status=QueueStatus.WAITING).count(),
        'called_tickets': tickets.filter(status=QueueStatus.CALLED).count(),
        'in_service_tickets': tickets.filter(status=QueueStatus.IN_SERVICE).count(),
        'completed_tickets': tickets.filter(status=QueueStatus.COMPLETED).count(),
        'skipped_tickets': tickets.filter(status=QueueStatus.SKIPPED).count(),
        'not_arrived_tickets': tickets.filter(status=QueueStatus.NOT_ARRIVED).count(),
        'left_tickets': tickets.filter(status=QueueStatus.LEFT).count(),
        'removed_tickets': tickets.filter(status=QueueStatus.REMOVED).count(),
    }


def _ticket_duration_metrics(tickets: QuerySet[Ticket]) -> dict[str, float]:
    wait_values = []
    service_values = []
    initial_positions = []

    for ticket in tickets:
        wait_seconds = _duration_seconds(ticket.enqueued_at, ticket.called_at)
        if wait_seconds is not None:
            wait_values.append(wait_seconds)

        service_seconds = _duration_seconds(ticket.service_started_at, ticket.finished_at)
        if ticket.status == QueueStatus.COMPLETED and service_seconds is not None:
            service_values.append(service_seconds)

        if ticket.initial_ticket_number is not None:
            initial_positions.append(float(ticket.initial_ticket_number))

    wait_under_sla = len([value for value in wait_values if value <= SLA_WAIT_SECONDS])

    return {
        'avg_wait_seconds': _average(wait_values),
        'max_wait_seconds': round(max(wait_values), 2) if wait_values else 0.0,
        'avg_service_seconds': _average(service_values),
        'avg_initial_queue_position': _average(initial_positions),
        'sla_wait_under_10_min_percent': _percent(wait_under_sla, len(wait_values)),
    }


def _feedback_metrics(feedback: QuerySet[FeedbackItem]) -> dict[str, float | int]:
    rating_stats = feedback.aggregate(avg_rating=Avg('rating'), rating_count=Count('rating'))
    feedback_count = feedback.count()
    complaints_count = feedback.filter(type=FeedbackType.COMPLAINT).count()

    return {
        'feedback_count': feedback_count,
        'complaints_count': complaints_count,
        'complaint_rate_percent': _percent(complaints_count, feedback_count),
        'avg_rating': round(float(rating_stats['avg_rating'] or 0.0), 2),
        'rating_count': int(rating_stats['rating_count'] or 0),
    }


def _active_operator_count(company_id: int, filters: MetricsFilters) -> int:
    operators = User.objects.filter(company_id=company_id, role=Role.OPERATOR, is_active=True)

    if filters.branch_id is not None:
        operators = operators.filter(branch_id=filters.branch_id)
    if filters.queue_id is not None:
        operators = operators.filter(assigned_queues__id=filters.queue_id)
    if filters.operator_id is not None:
        operators = operators.filter(id=filters.operator_id)

    return operators.distinct().count()


def _queue_capacity(queues: QuerySet[Queue]) -> int:
    return int(queues.aggregate(total=Sum('clients_limit'))['total'] or 0)


def _period_hours(tickets: QuerySet[Ticket], filters: MetricsFilters) -> float:
    start = filters.date_from
    end = filters.date_to

    if start is None or end is None:
        stats = tickets.aggregate(
            min_enqueued=Min('enqueued_at'),
            max_enqueued=Max('enqueued_at'),
            max_finished=Max('finished_at'),
        )
        start = start or stats['min_enqueued']
        candidates = [value for value in [stats['max_finished'], stats['max_enqueued']] if value]
        end = end or (max(candidates) if candidates else None)

    if start is None or end is None:
        return 0.0

    return max((end - start).total_seconds(), 0.0) / 3600


def _compose_business_metrics(
    *,
    company_id: int,
    filters: MetricsFilters,
    tickets: QuerySet[Ticket],
    feedback: QuerySet[FeedbackItem],
    queues: QuerySet[Queue],
) -> dict:
    counts = _ticket_counts(tickets)
    active_tickets = (
        counts['waiting_tickets'] +
        counts['called_tickets'] +
        counts['in_service_tickets']
    )
    processed_tickets = sum(counts[f'{status.value.lower()}_tickets'] for status in FINAL_STATUSES)
    capacity = _queue_capacity(queues)
    active_operator_count = _active_operator_count(company_id, filters)
    period_hours = _period_hours(tickets, filters)

    return {
        **counts,
        'active_tickets': active_tickets,
        'processed_tickets': processed_tickets,
        **_ticket_duration_metrics(tickets),
        **_feedback_metrics(feedback),
        'completion_rate_percent': _percent(counts['completed_tickets'], counts['total_tickets']),
        'left_rate_percent': _percent(counts['left_tickets'], counts['total_tickets']),
        'not_arrived_rate_percent': _percent(counts['not_arrived_tickets'], counts['total_tickets']),
        'removed_rate_percent': _percent(counts['removed_tickets'], counts['total_tickets']),
        'load_percent': _percent(active_tickets, capacity),
        'load_per_operator': round(active_tickets / active_operator_count, 2) if active_operator_count else 0.0,
        'active_operator_count': active_operator_count,
        'throughput_per_hour': round(counts['completed_tickets'] / period_hours, 2) if period_hours else 0.0,
    }


def _queue_metrics(company_id: int, filters: MetricsFilters) -> list[dict]:
    rows = []
    queues = _queue_queryset(company_id, filters)

    for queue in queues:
        row_filters = replace(filters, queue_id=queue.id)
        tickets = _filtered_tickets(company_id, row_filters)
        feedback = _filtered_feedback(company_id, row_filters)
        row_queues = Queue.objects.filter(id=queue.id)
        metrics = _compose_business_metrics(
            company_id=company_id,
            filters=row_filters,
            tickets=tickets,
            feedback=feedback,
            queues=row_queues,
        )
        rows.append(
            {
                'queue_id': queue.id,
                'queue_name': queue.name,
                'branch_id': queue.branch_id,
                'branch_name': queue.branch.name if queue.branch else None,
                **metrics,
            }
        )

    return rows


def _branch_metrics(company_id: int, filters: MetricsFilters) -> list[dict]:
    branches = Branch.objects.filter(company_id=company_id).order_by('id')
    if filters.branch_id is not None:
        branches = branches.filter(id=filters.branch_id)

    rows = []
    for branch in branches:
        row_filters = replace(filters, branch_id=branch.id)
        tickets = _filtered_tickets(company_id, row_filters)
        feedback = _filtered_feedback(company_id, row_filters)
        queues = _queue_queryset(company_id, row_filters)
        metrics = _compose_business_metrics(
            company_id=company_id,
            filters=row_filters,
            tickets=tickets,
            feedback=feedback,
            queues=queues,
        )
        rows.append(
            {
                'branch_id': branch.id,
                'branch_name': branch.name,
                'queue_count': queues.count(),
                **metrics,
            }
        )

    return rows


def _operator_queue_ids(operator: User, company_id: int, filters: MetricsFilters) -> list[int]:
    queues = operator.assigned_queues.filter(branch__company_id=company_id)
    if filters.branch_id is not None:
        queues = queues.filter(branch_id=filters.branch_id)
    if filters.queue_id is not None:
        queues = queues.filter(id=filters.queue_id)

    queue_ids = list(queues.values_list('id', flat=True))
    if queue_ids or operator.branch_id is None or filters.queue_id is not None:
        return queue_ids

    branch_queues = Queue.objects.filter(branch_id=operator.branch_id, branch__company_id=company_id)
    return list(branch_queues.values_list('id', flat=True))


def _operator_metrics(company_id: int, filters: MetricsFilters) -> list[dict]:
    operators = User.objects.filter(company_id=company_id, role=Role.OPERATOR).order_by('id')
    if filters.branch_id is not None:
        operators = operators.filter(branch_id=filters.branch_id)
    if filters.queue_id is not None:
        operators = operators.filter(assigned_queues__id=filters.queue_id)
    if filters.operator_id is not None:
        operators = operators.filter(id=filters.operator_id)

    rows = []
    for operator in operators.distinct():
        queue_ids = _operator_queue_ids(operator, company_id, filters)
        row_filters = replace(filters, operator_id=operator.id)
        tickets = _filtered_tickets(company_id, row_filters)
        feedback = _filtered_feedback(company_id, row_filters)
        assigned_queues = Queue.objects.filter(id__in=queue_ids)
        metrics = _compose_business_metrics(
            company_id=company_id,
            filters=row_filters,
            tickets=tickets,
            feedback=feedback,
            queues=assigned_queues,
        )
        load_tickets = _filtered_tickets(
            company_id,
            replace(filters, operator_id=None),
            include_operator=False,
        ).filter(queue_id__in=queue_ids)
        load_counts = _ticket_counts(load_tickets)
        active_tickets = (
            load_counts['waiting_tickets'] +
            load_counts['called_tickets'] +
            load_counts['in_service_tickets']
        )
        capacity = _queue_capacity(assigned_queues)

        rows.append(
            {
                'operator_id': operator.id,
                'operator_name': operator.fullname,
                'branch_id': operator.branch_id,
                'branch_name': operator.branch.name if operator.branch else None,
                'is_active': operator.is_active,
                'queue_count': len(queue_ids),
                **metrics,
                'waiting_tickets': load_counts['waiting_tickets'],
                'active_tickets': active_tickets,
                'load_percent': _percent(active_tickets, capacity),
                'load_per_operator': float(active_tickets),
                'active_operator_count': 1 if operator.is_active else 0,
            }
        )

    return rows


def _peak_hours(tickets: QuerySet[Ticket]) -> list[dict]:
    hours = Counter(timezone.localtime(ticket.enqueued_at).hour for ticket in tickets)
    return [
        {
            'hour': hour,
            'tickets': hours.get(hour, 0),
        }
        for hour in range(24)
        if hours.get(hour, 0) > 0
    ]


def _daily_metrics(tickets: QuerySet[Ticket]) -> list[dict]:
    days: dict[str, dict] = defaultdict(
        lambda: {
            'total_tickets': 0,
            'completed_tickets': 0,
            'left_tickets': 0,
            'not_arrived_tickets': 0,
            'wait_values': [],
            'service_values': [],
        }
    )

    for ticket in tickets:
        day = timezone.localtime(ticket.enqueued_at).date().isoformat()
        row = days[day]
        row['total_tickets'] += 1
        if ticket.status == QueueStatus.COMPLETED:
            row['completed_tickets'] += 1
        if ticket.status == QueueStatus.LEFT:
            row['left_tickets'] += 1
        if ticket.status == QueueStatus.NOT_ARRIVED:
            row['not_arrived_tickets'] += 1

        wait_seconds = _duration_seconds(ticket.enqueued_at, ticket.called_at)
        if wait_seconds is not None:
            row['wait_values'].append(wait_seconds)

        service_seconds = _duration_seconds(ticket.service_started_at, ticket.finished_at)
        if ticket.status == QueueStatus.COMPLETED and service_seconds is not None:
            row['service_values'].append(service_seconds)

    return [
        {
            'date': day,
            'total_tickets': values['total_tickets'],
            'completed_tickets': values['completed_tickets'],
            'left_tickets': values['left_tickets'],
            'not_arrived_tickets': values['not_arrived_tickets'],
            'avg_wait_seconds': _average(values['wait_values']),
            'avg_service_seconds': _average(values['service_values']),
        }
        for day, values in sorted(days.items())
    ]


def empty_business_metrics() -> dict:
    return {
        'total_tickets': 0,
        'active_tickets': 0,
        'processed_tickets': 0,
        'waiting_tickets': 0,
        'called_tickets': 0,
        'in_service_tickets': 0,
        'completed_tickets': 0,
        'skipped_tickets': 0,
        'not_arrived_tickets': 0,
        'left_tickets': 0,
        'removed_tickets': 0,
        'avg_wait_seconds': 0.0,
        'max_wait_seconds': 0.0,
        'avg_service_seconds': 0.0,
        'avg_initial_queue_position': 0.0,
        'sla_wait_under_10_min_percent': 0.0,
        'completion_rate_percent': 0.0,
        'left_rate_percent': 0.0,
        'not_arrived_rate_percent': 0.0,
        'removed_rate_percent': 0.0,
        'load_percent': 0.0,
        'load_per_operator': 0.0,
        'active_operator_count': 0,
        'throughput_per_hour': 0.0,
        'feedback_count': 0,
        'complaints_count': 0,
        'complaint_rate_percent': 0.0,
        'avg_rating': 0.0,
        'rating_count': 0,
        'branches': [],
        'queues': [],
        'peak_hours': [],
        'daily': [],
        'operators': [],
    }


def company_business_metrics(company_id: int, filters: MetricsFilters | None = None) -> dict:
    filters = filters or MetricsFilters()
    tickets = _filtered_tickets(company_id, filters)
    feedback = _filtered_feedback(company_id, filters)
    queues = _queue_queryset(company_id, filters)
    summary = _compose_business_metrics(
        company_id=company_id,
        filters=filters,
        tickets=tickets,
        feedback=feedback,
        queues=queues,
    )

    return {
        **summary,
        'branches': _branch_metrics(company_id, filters),
        'queues': _queue_metrics(company_id, filters),
        'peak_hours': _peak_hours(tickets),
        'daily': _daily_metrics(tickets),
        'operators': _operator_metrics(company_id, filters),
    }


def company_admin_metrics(
    company_id: int,
    filters: MetricsFilters | None = None,
) -> dict:
    filters = filters or MetricsFilters()
    return {
        'company_id': company_id,
        'business': company_business_metrics(company_id, filters),
    }
