from django.contrib import admin

from queues.models import Queue, Ticket


@admin.register(Queue)
class QueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'branch', 'clients_limit', 'created_at', 'updated_at')
    list_filter = ('branch', 'language')
    search_fields = ('name',)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'display_number', 'queue', 'client', 'operator', 'status', 'enqueued_at', 'finished_at')
    list_filter = ('status', 'queue', 'operator')
    search_fields = ('display_number',)
