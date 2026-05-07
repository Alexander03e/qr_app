import time
import json
import logging

from analytics.models import ApiRequestLog
from core.metrics import HTTP_REQUEST_LATENCY_SECONDS, HTTP_REQUESTS_TOTAL
from queues.models import Queue, Ticket
from users.models import AdminToken, OperatorToken
from users.services import parse_bearer_token


logger = logging.getLogger(__name__)


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
        self._write_request_log(
            request=request,
            raw_token=raw_token,
            method=method,
            endpoint=endpoint,
            status_code=response.status_code,
            elapsed_seconds=elapsed_seconds,
        )

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

    def _resolve_token_scope(self, raw_token: str | None) -> dict:
        scope = {
            'company_id': None,
            'branch_id': None,
            'operator_id': None,
        }

        if not raw_token:
            return scope

        admin_token = AdminToken.objects.select_related('user').filter(key=raw_token).first()
        if admin_token:
            scope['company_id'] = admin_token.user.company_id
            scope['branch_id'] = admin_token.user.branch_id
            return scope

        operator_token = OperatorToken.objects.select_related('user').filter(key=raw_token).first()
        if operator_token:
            scope['company_id'] = operator_token.user.company_id
            scope['branch_id'] = operator_token.user.branch_id
            scope['operator_id'] = operator_token.user_id

        return scope

    def _resolve_queue_scope(self, request) -> dict:
        scope = {
            'company_id': None,
            'branch_id': None,
            'queue_id': None,
        }
        resolver_match = getattr(request, 'resolver_match', None)
        kwargs = getattr(resolver_match, 'kwargs', {}) or {}
        endpoint_name = getattr(resolver_match, 'url_name', '') or ''
        path = request.path

        queue_id = None
        ticket_id = None
        if 'queues/' in path and kwargs.get('pk'):
            queue_id = kwargs.get('pk')
        elif 'tickets/' in path and kwargs.get('pk'):
            ticket_id = kwargs.get('pk')
        elif endpoint_name == 'public-feedback' or path.endswith('/tickets/join/'):
            queue_id = self._read_json_body(request).get('queue_id')

        if ticket_id:
            ticket = (
                Ticket.objects
                .select_related('queue', 'queue__branch')
                .filter(pk=ticket_id)
                .first()
            )
            if ticket and ticket.queue:
                queue_id = ticket.queue_id
                scope['branch_id'] = ticket.queue.branch_id
                scope['company_id'] = ticket.queue.branch.company_id if ticket.queue.branch else None

        if queue_id and scope['queue_id'] is None:
            queue = Queue.objects.select_related('branch').filter(pk=queue_id).first()
            if queue:
                scope['queue_id'] = queue.id
                scope['branch_id'] = queue.branch_id
                scope['company_id'] = queue.branch.company_id if queue.branch else None

        return scope

    def _read_json_body(self, request) -> dict:
        try:
            if not request.body:
                return {}
            return json.loads(request.body.decode('utf-8'))
        except Exception:
            return {}

    def _write_request_log(
        self,
        *,
        request,
        raw_token: str | None,
        method: str,
        endpoint: str,
        status_code: int,
        elapsed_seconds: float,
    ) -> None:
        token_scope = self._resolve_token_scope(raw_token)
        queue_scope = self._resolve_queue_scope(request)
        company_id = queue_scope.get('company_id') or token_scope.get('company_id')
        branch_id = queue_scope.get('branch_id') or token_scope.get('branch_id')

        try:
            ApiRequestLog.objects.create(
                company_id=company_id,
                branch_id=branch_id,
                queue_id=queue_scope.get('queue_id'),
                operator_id=token_scope.get('operator_id'),
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                latency_ms=round(elapsed_seconds * 1000, 2),
            )
        except Exception:
            logger.exception('Failed to write API request log.')
