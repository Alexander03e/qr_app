import re
import time

from core.metrics import HTTP_REQUEST_LATENCY_SECONDS, HTTP_REQUESTS_TOTAL
from users.models import AuthToken
from users.services import parse_bearer_token


class PrometheusMetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started_at = time.monotonic()
        response = self.get_response(request)

        raw_token = parse_bearer_token(request.headers.get('Authorization'))
        company_id = self._resolve_company_id(raw_token)

        endpoint = self._resolve_endpoint(request)
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

        auth_token = AuthToken.objects.select_related('user').filter(key=raw_token).first()
        if auth_token and auth_token.user.company_id:
            return str(auth_token.user.company_id)

        return 'unknown'

    def _resolve_endpoint(self, request) -> str:
        resolver_match = getattr(request, 'resolver_match', None)
        route = getattr(resolver_match, 'route', None)
        if route:
            normalized_route = route.replace('^', '').replace('$', '').strip()
            return f'/{normalized_route.lstrip("/")}'

        view_name = getattr(resolver_match, 'view_name', None)
        if view_name:
            return view_name

        return re.sub(r'/\d+(?=/|$)', '/:id', request.path)
