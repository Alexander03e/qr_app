from rest_framework import serializers

from queues.models import Queue, QueueStatus, Ticket


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
    device_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    queue_token = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    send_notification = serializers.BooleanField(required=False, default=False)
    consent_ad = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        return attrs


class JoinQueueSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    client_id = serializers.CharField(required=False)
    queue_token = serializers.CharField(required=False)
    client = JoinQueueClientSerializer(required=False)

    def validate(self, attrs):
        return attrs


class TicketStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=QueueStatus.choices)


class QueueTicketIdsSerializer(serializers.Serializer):
    ticket_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )


class QueueDeleteTicketsResultSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    deleted_count = serializers.IntegerField()
    deleted_ticket_ids = serializers.ListField(child=serializers.IntegerField())


class QueueBoardTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ('id', 'display_number', 'status', 'created_at', 'updated_at')


class QueueSnapshotSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    queue_name = serializers.CharField()
    waiting_count = serializers.IntegerField()
    current_ticket = QueueBoardTicketSerializer(allow_null=True)
    waiting_tickets = QueueBoardTicketSerializer(many=True)
    client_ticket = TicketSerializer(allow_null=True)
    client_is_served = serializers.BooleanField()
    client_is_removed = serializers.BooleanField()
    client_is_not_arrived = serializers.BooleanField()
    client_called_remaining_seconds = serializers.IntegerField(allow_null=True)
    called_ticket_timeout_seconds = serializers.IntegerField()


class InviteTicketByIdSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['complete', 'return'], required=False)


class AdminQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = '__all__'


