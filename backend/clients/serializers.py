from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'


class ClientLanguageSerializer(serializers.Serializer):
    client_id = serializers.CharField()
    preferred_lang = serializers.ChoiceField(choices=['ru', 'en'])