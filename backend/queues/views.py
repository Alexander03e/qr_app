from rest_framework import mixins, viewsets
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from queues.services import join_queue
from .models import Queue, Ticket
from .serializers import JoinQueueSerializer, QueueSerializer, TicketSerializer


class QueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer


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

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        input_serializer = JoinQueueSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        ticket = join_queue(
            queue_id=input_serializer.validated_data['queue_id'],
            client_id=input_serializer.validated_data.get('client_id'),
            client_data=input_serializer.validated_data.get('client'),
        )

        return Response(self.get_serializer(ticket).data, status=status.HTTP_201_CREATED)