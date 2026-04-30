from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.serializers import AdminMetricsSerializer
from analytics.services import company_admin_metrics, empty_business_metrics
from users.services import get_admin_by_token, parse_bearer_token


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
					'business': empty_business_metrics(),
				},
				status=status.HTTP_200_OK,
			)

		payload = company_admin_metrics(company_id=admin_user.company_id)
		serializer = AdminMetricsSerializer(payload)
		return Response(serializer.data, status=status.HTTP_200_OK)
