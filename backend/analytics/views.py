from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.serializers import AdminMetricsSerializer
from core.metrics import HTTP_REQUEST_LATENCY_SECONDS, HTTP_REQUESTS_TOTAL
from users.services import get_admin_by_token, parse_bearer_token


def _company_metrics(company_id: int) -> dict:
	company_key = str(company_id)
	endpoint_rows: dict[tuple[str, str], dict] = {}
	total_requests = 0
	error_requests = 0

	for metric in HTTP_REQUESTS_TOTAL.collect():
		for sample in metric.samples:
			if sample.name != 'queueflow_http_requests_total':
				continue

			labels = sample.labels
			if labels.get('company_id') != company_key:
				continue

			method = labels.get('method', 'UNKNOWN')
			endpoint = labels.get('endpoint', 'UNKNOWN')
			status_code = labels.get('status_code', '0')
			value = int(sample.value)

			total_requests += value
			if status_code.startswith('4') or status_code.startswith('5'):
				error_requests += value

			key = (method, endpoint)
			if key not in endpoint_rows:
				endpoint_rows[key] = {
					'method': method,
					'endpoint': endpoint,
					'requests': 0,
				}
			endpoint_rows[key]['requests'] += value

	latency_sum = 0.0
	latency_count = 0
	for metric in HTTP_REQUEST_LATENCY_SECONDS.collect():
		for sample in metric.samples:
			labels = sample.labels
			if labels.get('company_id') != company_key:
				continue

			if sample.name.endswith('_sum'):
				latency_sum += float(sample.value)
			if sample.name.endswith('_count'):
				latency_count += int(sample.value)

	avg_latency_ms = (latency_sum / latency_count) * 1000 if latency_count else 0.0

	endpoints = sorted(endpoint_rows.values(), key=lambda item: item['requests'], reverse=True)

	return {
		'company_id': company_id,
		'total_requests': total_requests,
		'error_requests': error_requests,
		'avg_latency_ms': round(avg_latency_ms, 2),
		'endpoints': endpoints,
	}


class AdminMetricsView(APIView):
	@extend_schema(responses={status.HTTP_200_OK: AdminMetricsSerializer})
	def get(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		admin_user = get_admin_by_token(token)

		if not admin_user.company_id:
			return Response(
				{
					'company_id': 0,
					'total_requests': 0,
					'error_requests': 0,
					'avg_latency_ms': 0,
					'endpoints': [],
				},
				status=status.HTTP_200_OK,
			)

		payload = _company_metrics(company_id=admin_user.company_id)
		serializer = AdminMetricsSerializer(payload)
		return Response(serializer.data, status=status.HTTP_200_OK)
