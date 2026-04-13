import time

from core.metrics import HTTP_REQUEST_LATENCY_SECONDS, HTTP_REQUESTS_TOTAL
from users.models import AdminToken, OperatorToken
from users.services import parse_bearer_token


class PrometheusMetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.monotonic()
        response = self.get_response(request)

        raw_token = parse_bearer_token(request.headers.get('Authorization'))
        company_id = self._resolve_company_id(raw_token)

        endpoint = request.path
        method = request.method
        status_code = str(response.status_code)

        elapsed_seconds = max(time.monotonic() - started_at, 0.0)

        HTTP_REQUESTS_TOTAL.labels(
            company_id=company_id,
            method=method,
            endpoint=endpoint,
            status_code=status_code,
        ).inc()
        HTTP_REQUEST_LATENCY_SECONDS.labels(
            company_id=company_id,
            method=method,
            endpoint=endpoint,
        ).observe(elapsed_seconds)

        return response

    def _resolve_company_id(self, raw_token: str | None) -> str:
        if not raw_token:
            return 'unknown'

        admin_token = AdminToken.objects.select_related('user').filter(key=raw_token).first()
        if admin_token and admin_token.user.company_id:
            return str(admin_token.user.company_id)

        operator_token = OperatorToken.objects.select_related('user').filter(key=raw_token).first()
        if operator_token and operator_token.user.company_id:
            return str(operator_token.user.company_id)

        return 'unknown'
