from rest_framework import mixins, viewsets
from rest_framework import status as drf_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer

from companies.models import Branch
from queues.services import (
    append_to_queue,
    delete_tickets_from_queue,
    get_queue_snapshot,
    invite_ticket_by_id,
    invite_next_ticket,
    join_queue,
    remove_ticket_from_queue,
    skip_one_ahead,
    update_ticket,
)
from users.services import get_admin_by_token, get_operator_by_token, parse_bearer_token
from .models import Queue, Ticket
from .serializers import (
    AdminQueueSerializer,
    JoinQueueSerializer,
    InviteTicketByIdSerializer,
    QueueDeleteTicketsResultSerializer,
    QueueSnapshotSerializer,
    QueueTicketIdsSerializer,
    QueueSerializer,
    TicketSerializer,
    TicketStatusUpdateSerializer,
)


def require_operator(request):
    token = parse_bearer_token(request.headers.get('Authorization'))
    return get_operator_by_token(token)


def require_operator_for_queue(request, queue_id: int):
    operator = require_operator(request)
    has_explicit_assignments = operator.assigned_queues.exists()
    if has_explicit_assignments:
        if not operator.assigned_queues.filter(id=queue_id).exists():
            raise ValidationError('Оператор не назначен на эту очередь.')
        return operator

    queue = Queue.objects.select_related('branch').filter(id=queue_id).first()
    if queue is None:
        raise ValidationError('Очередь не найдена.')

    if operator.branch_id and queue.branch_id != operator.branch_id:
        raise ValidationError('Оператор не назначен на эту очередь.')

    return operator


def require_operator_for_ticket(request, ticket_id: int):
    operator = require_operator(request)
    try:
        ticket = Ticket.objects.select_related('queue').get(pk=ticket_id)
    except Ticket.DoesNotExist as exc:
        raise ValidationError('Талон не найден.') from exc

    has_explicit_assignments = operator.assigned_queues.exists()
    if has_explicit_assignments:
        if not operator.assigned_queues.filter(id=ticket.queue_id).exists():
            raise ValidationError('Оператор не назначен на эту очередь.')
        return operator

    if operator.branch_id and ticket.queue.branch_id != operator.branch_id:
        raise ValidationError('Оператор не назначен на эту очередь.')

    return operator


class QueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer

    @action(detail=True, methods=['get'], url_path='snapshot')
    def snapshot(self, request, pk=None):
        client_id = request.query_params.get('client_id')
        snapshot = get_queue_snapshot(queue_id=pk, client_id=client_id)
        output_serializer = QueueSnapshotSerializer(snapshot)
        return Response(output_serializer.data, status=drf_status.HTTP_200_OK)

    @extend_schema(
        responses={
            drf_status.HTTP_200_OK: inline_serializer(
                name='InviteNextResponse',
                fields={
                    'ticket': TicketSerializer(allow_null=True),
                    'queue_snapshot': QueueSnapshotSerializer(),
                },
            )
        },
    )
    @action(detail=True, methods=['post'], url_path='invite-next')
    def invite_next(self, request, pk=None):
        require_operator_for_queue(request, int(pk))
        ticket = invite_next_ticket(queue_id=pk)
        snapshot = get_queue_snapshot(queue_id=pk)
        snapshot_serializer = QueueSnapshotSerializer(snapshot)

        if ticket is None:
            return Response(
                {
                    'ticket': None,
                    'queue_snapshot': snapshot_serializer.data,
                },
                status=drf_status.HTTP_200_OK,
            )

        return Response(
            {
                'ticket': TicketSerializer(ticket).data,
                'queue_snapshot': snapshot_serializer.data,
            },
            status=drf_status.HTTP_200_OK,
        )

    @extend_schema(
        request=QueueTicketIdsSerializer,
        responses={drf_status.HTTP_200_OK: QueueDeleteTicketsResultSerializer},
    )
    @action(detail=True, methods=['post'], url_path='tickets/delete')
    def delete_tickets(self, request, pk=None):
        require_operator_for_queue(request, int(pk))
        input_serializer = QueueTicketIdsSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        result = delete_tickets_from_queue(
            queue_id=pk,
            ticket_ids=input_serializer.validated_data['ticket_ids'],
        )

        output_serializer = QueueDeleteTicketsResultSerializer(result)
        return Response(output_serializer.data, status=drf_status.HTTP_200_OK)


class AdminQueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.select_related('branch').all().order_by('id')
    serializer_class = AdminQueueSerializer

    def _require_admin(self):
        token = parse_bearer_token(self.request.headers.get('Authorization'))
        return get_admin_by_token(token)

    def get_queryset(self):
        admin_user = self._require_admin()
        if not admin_user.company_id:
            return Queue.objects.none()

        queryset = super().get_queryset()
        queryset = queryset.filter(branch__company_id=admin_user.company_id)

        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='branch',
                type=int,
                required=False,
                description='ID филиала для фильтрации очередей',
            )
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        admin_user = self._require_admin()
        if not admin_user.company_id:
            raise ValidationError('Администратор должен быть привязан к компании.')

        branch = serializer.validated_data['branch']

        if admin_user.company_id and branch.company_id != admin_user.company_id:
            raise ValidationError('Нельзя создавать очередь в чужом филиале.')

        serializer.save()


class OperatorQueueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Queue.objects.select_related('branch').all().order_by('id')
    serializer_class = AdminQueueSerializer

    def _require_operator(self):
        token = parse_bearer_token(self.request.headers.get('Authorization'))
        return get_operator_by_token(token)

    def get_queryset(self):
        operator = self._require_operator()
        return super().get_queryset().filter(id__in=operator.assigned_queues.values('id'))

    def partial_update(self, request, *args, **kwargs):
        raise ValidationError('Используйте endpoint /operator/queues/<id>/settings/.')

    @action(detail=True, methods=['patch'], url_path='settings')
    def queue_settings(self, request, pk=None):
        require_operator_for_queue(request, int(pk))
        queue = self.get_object()
        serializer = self.get_serializer(queue, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=drf_status.HTTP_200_OK)

    def perform_update(self, serializer):
        admin_user = self._require_admin()
        instance = self.get_object()
        branch = serializer.validated_data.get('branch')

        if not admin_user.company_id:
            raise ValidationError('Администратор должен быть привязан к компании.')

        if instance.branch and instance.branch.company_id != admin_user.company_id:
            raise ValidationError('Недостаточно прав для редактирования очереди.')

        if branch and branch.company_id != admin_user.company_id:
            raise ValidationError('Нельзя переносить очередь в чужой филиал.')

        serializer.save()

class TicketViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Ticket.objects.select_related('queue', 'client').all()
    serializer_class = TicketSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        queue_id = self.request.query_params.get('queue')

        if queue_id:
            queryset = queryset.filter(queue_id=queue_id)

        return queryset

    @extend_schema(
        request=JoinQueueSerializer,
        responses={drf_status.HTTP_201_CREATED: TicketSerializer},
    )
    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        input_serializer = JoinQueueSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        ticket = join_queue(
            queue_id=input_serializer.validated_data['queue_id'],
            client_id=input_serializer.validated_data.get('client_id'),
            queue_token=input_serializer.validated_data.get('queue_token'),
            client_data=input_serializer.validated_data.get('client'),
        )

        return Response(self.get_serializer(ticket).data, status=drf_status.HTTP_201_CREATED)

    @extend_schema(
        request=TicketStatusUpdateSerializer,
        responses={
            drf_status.HTTP_200_OK: inline_serializer(
                name='TicketStatusUpdateResponse',
                fields={
                    'ticket': TicketSerializer(),
                    'queue_snapshot': QueueSnapshotSerializer(),
                },
            )
        },
    )
    @action(detail=True, methods=['patch'], url_path='status')
    def status(self, request, pk=None):
        input_serializer = TicketStatusUpdateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        new_status = input_serializer.validated_data['status']
        if new_status != 'LEFT':
            require_operator_for_ticket(request, int(pk))

        ticket = update_ticket(
            ticket_id=pk,
            new_status=new_status,
        )

        snapshot = get_queue_snapshot(queue_id=ticket.queue_id)
        snapshot_serializer = QueueSnapshotSerializer(snapshot)

        return Response(
            {
                'ticket': self.get_serializer(ticket).data,
                'queue_snapshot': snapshot_serializer.data,
            },
            status=drf_status.HTTP_200_OK,
        )

    @extend_schema(
        responses={
            drf_status.HTTP_200_OK: inline_serializer(
                name='AppendToQueueResponse',
                fields={
                    'ticket': TicketSerializer(),
                    'queue_snapshot': QueueSnapshotSerializer(),
                },
            )
        },
    )
    @action(detail=True, methods=['post'], url_path='append-to-queue')
    def append_to_queue(self, request, pk=None):
        require_operator_for_ticket(request, int(pk))
        ticket = append_to_queue(ticket_id=pk)
        snapshot = get_queue_snapshot(queue_id=ticket.queue_id)
        snapshot_serializer = QueueSnapshotSerializer(snapshot)

        return Response(
            {
                'ticket': self.get_serializer(ticket).data,
                'queue_snapshot': snapshot_serializer.data,
            },
            status=drf_status.HTTP_200_OK,
        )

    @extend_schema(
        responses={
            drf_status.HTTP_200_OK: inline_serializer(
                name='SkipOneAheadResponse',
                fields={
                    'ticket': TicketSerializer(),
                    'queue_snapshot': QueueSnapshotSerializer(),
                },
            )
        },
    )
    @action(detail=True, methods=['post'], url_path='skip-one-ahead')
    def skip_one(self, request, pk=None):
        ticket = skip_one_ahead(ticket_id=pk)
        snapshot = get_queue_snapshot(queue_id=ticket.queue_id, client_id=str(ticket.client_id))
        snapshot_serializer = QueueSnapshotSerializer(snapshot)

        return Response(
            {
                'ticket': self.get_serializer(ticket).data,
                'queue_snapshot': snapshot_serializer.data,
            },
            status=drf_status.HTTP_200_OK,
        )

    @extend_schema(
        request=InviteTicketByIdSerializer,
        responses={
            drf_status.HTTP_200_OK: inline_serializer(
                name='InviteByIdResponse',
                fields={
                    'ticket': TicketSerializer(),
                    'queue_snapshot': QueueSnapshotSerializer(),
                },
            )
        },
    )
    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        require_operator_for_ticket(request, int(pk))
        input_serializer = InviteTicketByIdSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        ticket = invite_ticket_by_id(
            ticket_id=pk,
            action=input_serializer.validated_data.get('action'),
        )
        snapshot = get_queue_snapshot(queue_id=ticket.queue_id)
        snapshot_serializer = QueueSnapshotSerializer(snapshot)

        return Response(
            {
                'ticket': self.get_serializer(ticket).data,
                'queue_snapshot': snapshot_serializer.data,
            },
            status=drf_status.HTTP_200_OK,
        )

    @extend_schema(
        responses={
            drf_status.HTTP_200_OK: inline_serializer(
                name='RemoveTicketResponse',
                fields={
                    'ticket': TicketSerializer(),
                    'queue_snapshot': QueueSnapshotSerializer(),
                },
            )
        },
    )
    @action(detail=True, methods=['post'], url_path='remove')
    def remove(self, request, pk=None):
        require_operator_for_ticket(request, int(pk))
        ticket = remove_ticket_from_queue(ticket_id=pk)
        snapshot = get_queue_snapshot(queue_id=ticket.queue_id)
        snapshot_serializer = QueueSnapshotSerializer(snapshot)

        return Response(
            {
                'ticket': self.get_serializer(ticket).data,
                'queue_snapshot': snapshot_serializer.data,
            },
            status=drf_status.HTTP_200_OK,
        )