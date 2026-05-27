from django.db.models import Q
from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound

from clients.models import Client
from clients.serializers import ClientLanguageSerializer, ClientSerializer
from users.authentication import AuthTokenAuthentication
from users.models import Role
from users.permissions import IsStaffUser


class ClientViewSet(viewsets.ModelViewSet):
    authentication_classes = [AuthTokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Client.objects.select_related('branch').all()
    serializer_class = ClientSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == Role.ADMIN:
            return queryset.filter(branch__company_id=user.company_id)

        if user.role == Role.OPERATOR:
            return queryset.filter(
                Q(branch_id=user.branch_id) |
                Q(ticket__queue_id__in=user.assigned_queues.values('id'))
            ).distinct()

        return Client.objects.none()


class ClientLanguageView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ClientLanguageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_id = serializer.validated_data['client_id']
        preferred_lang = serializer.validated_data['preferred_lang']

        client = None
        if client_id.isdigit():
            client = Client.objects.filter(id=int(client_id)).first()
        if client is None:
            client = Client.objects.filter(device_id=client_id).first()
        if client is None:
            client = Client.objects.filter(queue_token=client_id).first()
        if client is None:
            raise NotFound('Клиент не найден.')

        client.preferred_lang = preferred_lang
        client.save(update_fields=['preferred_lang', 'updated_at'])

        return Response({'detail': 'ok'}, status=status.HTTP_200_OK)
