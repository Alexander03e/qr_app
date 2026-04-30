from rest_framework import serializers

from notifications.models import FeedbackItem, FeedbackType


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
    type = serializers.ChoiceField(choices=FeedbackType.choices, default=FeedbackType.FEEDBACK)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(allow_blank=False, trim_whitespace=True)


class PublicFeedbackItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackItem
        fields = (
            'id',
            'branch',
            'queue',
            'type',
            'title',
            'message',
            'status',
            'created_at',
        )
