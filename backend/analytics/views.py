from datetime import datetime, time

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.serializers import AdminMetricsSerializer
from analytics.services import MetricsFilters, company_admin_metrics, empty_business_metrics
from users.authentication import AuthTokenAuthentication
from users.permissions import IsAdminUser


def _parse_int_filter(params, name: str) -> int | None:
	value = params.get(name)
	if value in (None, ''):
		return None

	try:
		return int(value)
	except (TypeError, ValueError) as exc:
		raise ValidationError({name: ['Ожидалось целое число.']}) from exc


def _parse_datetime_filter(params, name: str, *, end_of_day: bool = False) -> datetime | None:
	value = params.get(name)
	if value in (None, ''):
		return None

	parsed = parse_datetime(value)
	parsed_date = parse_date(value)
	if parsed_date is not None and value.strip() == parsed_date.isoformat():
		parsed = datetime.combine(parsed_date, time.max if end_of_day else time.min)
	elif parsed is None:
		raise ValidationError({name: ['Ожидалась дата YYYY-MM-DD или ISO datetime.']})

	if timezone.is_naive(parsed):
		parsed = timezone.make_aware(parsed)

	return parsed


def _build_metrics_filters(params) -> MetricsFilters:
	date_from = _parse_datetime_filter(params, 'date_from')
	date_to = _parse_datetime_filter(params, 'date_to', end_of_day=True)

	if date_from and date_to and date_from > date_to:
		raise ValidationError({'date_to': ['date_to должен быть больше или равен date_from.']})

	return MetricsFilters(
		branch_id=_parse_int_filter(params, 'branch_id'),
		queue_id=_parse_int_filter(params, 'queue_id'),
		operator_id=_parse_int_filter(params, 'operator_id'),
		date_from=date_from,
		date_to=date_to,
	)


class AdminMetricsView(APIView):
	authentication_classes = [AuthTokenAuthentication]
	permission_classes = [IsAdminUser]

	@extend_schema(
		parameters=[
			OpenApiParameter('branch_id', int, required=False, description='Фильтр по филиалу'),
			OpenApiParameter('queue_id', int, required=False, description='Фильтр по очереди'),
			OpenApiParameter('operator_id', int, required=False, description='Фильтр по оператору'),
			OpenApiParameter('date_from', str, required=False, description='Начало периода: YYYY-MM-DD или ISO datetime'),
			OpenApiParameter('date_to', str, required=False, description='Конец периода: YYYY-MM-DD или ISO datetime'),
		],
		responses={status.HTTP_200_OK: AdminMetricsSerializer},
	)
	def get(self, request):
		admin_user = request.user
		filters = _build_metrics_filters(request.query_params)

		if not admin_user.company_id:
			return Response(
				{
					'company_id': 0,
					'business': empty_business_metrics(),
				},
				status=status.HTTP_200_OK,
			)

		payload = company_admin_metrics(company_id=admin_user.company_id, filters=filters)
		serializer = AdminMetricsSerializer(payload)
		return Response(serializer.data, status=status.HTTP_200_OK)
