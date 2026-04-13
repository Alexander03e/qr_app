from prometheus_client import Counter, Histogram


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
