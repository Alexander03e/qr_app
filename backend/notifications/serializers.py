from rest_framework import serializers

from notifications.models import (
    ClientNotificationSubscription,
    FeedbackItem,
    FeedbackType,
    NotificationEventType,
    WebhookSubscription,
)


class AdminFeedbackItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackItem
        fields = '__all__'
        read_only_fields = (
            'id',
            'company',
            'resolved_by_user',
            'resolved_at',
            'created_at',
            'updated_at',
        )


class PublicFeedbackCreateSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    ticket_id = serializers.IntegerField(required=False, allow_null=True)
    type = serializers.ChoiceField(choices=FeedbackType.choices, default=FeedbackType.FEEDBACK)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(allow_blank=False, trim_whitespace=True)
    rating = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)


class PublicFeedbackItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackItem
        fields = (
            'id',
            'branch',
            'queue',
            'ticket',
            'type',
            'title',
            'message',
            'rating',
            'status',
            'created_at',
        )


class WebPushPublicKeySerializer(serializers.Serializer):
    public_key = serializers.CharField(allow_blank=True, allow_null=True)
    configured = serializers.BooleanField()


class WebPushSubscriptionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField()
    auth = serializers.CharField()


class WebPushBrowserSubscriptionSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=1000)
    keys = WebPushSubscriptionKeysSerializer()


class PublicWebPushSubscribeSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    client_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ticket_id = serializers.IntegerField(required=False, allow_null=True)
    subscription = WebPushBrowserSubscriptionSerializer()


class PublicVkSubscribeSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    client_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    ticket_id = serializers.IntegerField(required=False, allow_null=True)
    vk_id = serializers.CharField(max_length=64, trim_whitespace=True)

    def validate_vk_id(self, value):
        normalized_value = value.strip()
        if not normalized_value:
            raise serializers.ValidationError('VK ID не должен быть пустым.')
        return normalized_value


class ClientNotificationSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientNotificationSubscription
        fields = (
            'id',
            'client',
            'queue',
            'channel',
            'vk_user_id',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class NotificationStatusSerializer(serializers.Serializer):
    web_push_enabled = serializers.BooleanField()
    vk_enabled = serializers.BooleanField()
    subscriptions = ClientNotificationSubscriptionSerializer(many=True)


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    def validate_target_url(self, value):
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('Webhook URL должен начинаться с http:// или https://.')
        return value

    def validate_event_types(self, value):
        if value in (None, ''):
            return []

        if not isinstance(value, list):
            raise serializers.ValidationError('event_types должен быть списком.')

        allowed_events = {choice.value for choice in NotificationEventType}
        invalid_events = [event_type for event_type in value if event_type not in allowed_events]
        if invalid_events:
            raise serializers.ValidationError(f'Недопустимые события: {invalid_events}.')

        return value

    class Meta:
        model = WebhookSubscription
        fields = (
            'id',
            'company',
            'queue',
            'created_by_user',
            'name',
            'target_url',
            'secret',
            'event_types',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'company',
            'created_by_user',
            'created_at',
            'updated_at',
        )
