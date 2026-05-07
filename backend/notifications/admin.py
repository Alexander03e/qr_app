from django.contrib import admin

from notifications.models import FeedbackItem


@admin.register(FeedbackItem)
class FeedbackItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'status', 'rating', 'company', 'branch', 'queue', 'ticket', 'created_at')
    list_filter = ('type', 'status', 'rating', 'company', 'branch', 'queue')
    search_fields = ('title', 'message')
