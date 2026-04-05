from django.shortcuts import render
from rest_framework import viewsets

from clients.models import Client
from clients.serializers import ClientSerializer

# Create your views here.
class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer