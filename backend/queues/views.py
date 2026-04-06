from rest_framework import mixins, viewsets
from rest_framework import status as drf_status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, inline_serializer

from queues.services import (
    append_to_queue,
    delete_tickets_from_queue,
    get_queue_snapshot,
    invite_next_ticket,
    join_queue,
    update_ticket,
)
from .models import Queue, Ticket
from .serializers import (
    JoinQueueSerializer,
    QueueDeleteTicketsResultSerializer,
    QueueSnapshotSerializer,
    QueueTicketIdsSerializer,
    QueueSerializer,
    TicketSerializer,
    TicketStatusUpdateSerializer,
)


class QueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer

    @action(detail=True, methods=['get'], url_path='snapshot')
    def snapshot(self, request, pk=None):
        snapshot = get_queue_snapshot(queue_id=pk)
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
        input_serializer = QueueTicketIdsSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        result = delete_tickets_from_queue(
            queue_id=pk,
            ticket_ids=input_serializer.validated_data['ticket_ids'],
        )

        output_serializer = QueueDeleteTicketsResultSerializer(result)
        return Response(output_serializer.data, status=drf_status.HTTP_200_OK)

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

        ticket = update_ticket(
            ticket_id=pk,
            new_status=input_serializer.validated_data['status'],
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