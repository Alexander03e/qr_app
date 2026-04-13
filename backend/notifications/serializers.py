from rest_framework import serializers

from notifications.models import FeedbackItem


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
