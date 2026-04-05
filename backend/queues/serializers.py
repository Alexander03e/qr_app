from rest_framework import serializers

from queues.models import Queue, Ticket


class QueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = '__all__'


class TicketSerializer(serializers.ModelSerializer):
    queue_name = serializers.CharField(source='queue.name', read_only=True)

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ('display_number',)

class JoinQueueClientSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    vk_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    preferred_lang = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    send_notification = serializers.BooleanField(required=False, default=False)
    consent_ad = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs.get('phone') and not attrs.get('vk_id'):
            raise serializers.ValidationError('Укажите phone или vk_id для создания клиента.')
        return attrs


class JoinQueueSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    client_id = serializers.IntegerField(required=False)
    client = JoinQueueClientSerializer(required=False)

    def validate(self, attrs):
        if not attrs.get('client_id') and not attrs.get('client'):
            raise serializers.ValidationError(
                {'client': ['Передайте client_id или объект client.']}
            )
        return attrs
        

