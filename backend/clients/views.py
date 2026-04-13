from django.shortcuts import render
from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound

from clients.models import Client
from clients.serializers import ClientLanguageSerializer, ClientSerializer

# Create your views here.
class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer


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