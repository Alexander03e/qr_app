from django.http import HttpResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest


HTTP_REQUESTS_TOTAL = Counter(
    'queueflow_http_requests_total',
    'Total number of HTTP requests',
    ['company_id', 'method', 'endpoint', 'status_code'],
)

HTTP_REQUEST_LATENCY_SECONDS = Histogram(
    'queueflow_http_request_latency_seconds',
    'HTTP request latency in seconds',
    ['company_id', 'method', 'endpoint'],
)

NOTIFICATION_DELIVERIES_TOTAL = Counter(
    'queueflow_notification_deliveries_total',
    'Total number of client notification delivery attempts',
    ['channel', 'event_type', 'status'],
)


def prometheus_metrics_view(request):
    return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)
