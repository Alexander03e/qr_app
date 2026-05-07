from django.contrib import admin

from analytics.models import ApiRequestLog


@admin.register(ApiRequestLog)
class ApiRequestLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'company', 'branch', 'queue', 'operator', 'method', 'endpoint', 'status_code', 'latency_ms')
    list_filter = ('company', 'branch', 'queue', 'operator', 'method', 'status_code')
    search_fields = ('endpoint',)
    readonly_fields = ('created_at',)
