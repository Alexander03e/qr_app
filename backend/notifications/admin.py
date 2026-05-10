from django.contrib import admin

from notifications.models import (
    ClientNotificationSubscription,
    FeedbackItem,
    WebhookDelivery,
    WebhookSubscription,
)


@admin.register(FeedbackItem)
class FeedbackItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'status', 'rating', 'company', 'branch', 'queue', 'ticket', 'created_at')
    list_filter = ('type', 'status', 'rating', 'company', 'branch', 'queue')
    search_fields = ('title', 'message')


@admin.register(ClientNotificationSubscription)
class ClientNotificationSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'channel', 'client', 'queue', 'vk_user_id', 'is_active', 'created_at')
    list_filter = ('channel', 'is_active', 'queue')
    search_fields = ('vk_user_id', 'endpoint', 'client__name')


@admin.register(WebhookSubscription)
class WebhookSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company', 'queue', 'target_url', 'is_active', 'created_at')
    list_filter = ('company', 'queue', 'is_active')
    search_fields = ('name', 'target_url')


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ('id', 'event_type', 'status', 'http_status', 'queue', 'ticket', 'created_at')
    list_filter = ('event_type', 'status', 'http_status')
    search_fields = ('ticket__display_number', 'error_message', 'response_body')
