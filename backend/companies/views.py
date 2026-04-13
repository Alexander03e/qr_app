from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, viewsets
from rest_framework.exceptions import ValidationError

from companies.models import Branch, Company
from companies.serializers import AdminBranchSerializer, AdminCompanySerializer
from users.services import get_admin_by_token, parse_bearer_token


class BaseAdminViewSet(viewsets.ModelViewSet):
	def _require_admin(self):
		token = parse_bearer_token(self.request.headers.get('Authorization'))
		return get_admin_by_token(token)


class AdminCompanyViewSet(
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	mixins.UpdateModelMixin,
	viewsets.GenericViewSet,
):
	serializer_class = AdminCompanySerializer
	queryset = Company.objects.all().order_by('id')

	def _require_admin(self):
		token = parse_bearer_token(self.request.headers.get('Authorization'))
		return get_admin_by_token(token)

	def get_queryset(self):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			return Company.objects.none()
		return super().get_queryset().filter(id=admin_user.company_id)

	def perform_update(self, serializer):
		admin_user = self._require_admin()
		instance = self.get_object()

		if not admin_user.company_id or instance.id != admin_user.company_id:
			raise ValidationError('Недостаточно прав для редактирования компании.')

		serializer.save()


class AdminBranchViewSet(BaseAdminViewSet):
	serializer_class = AdminBranchSerializer
	queryset = Branch.objects.select_related('company').all().order_by('id')

	def get_queryset(self):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			return Branch.objects.none()

		queryset = super().get_queryset()
		queryset = queryset.filter(company_id=admin_user.company_id)

		company_id = self.request.query_params.get('company')
		if company_id:
			queryset = queryset.filter(company_id=company_id)

		return queryset

	@extend_schema(
		parameters=[
			OpenApiParameter(
				name='company',
				type=int,
				required=False,
				description='ID компании для фильтрации филиалов',
			)
		],
	)
	def list(self, request, *args, **kwargs):
		return super().list(request, *args, **kwargs)

	def perform_create(self, serializer):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			raise ValidationError('Администратор должен быть привязан к компании.')

		company = serializer.validated_data['company']
		if company.id != admin_user.company_id:
			raise ValidationError('Нельзя создавать филиал в другой компании.')
		serializer.save()

	def perform_update(self, serializer):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			raise ValidationError('Администратор должен быть привязан к компании.')

		company = serializer.validated_data.get('company')
		instance = self.get_object()

		if instance.company_id != admin_user.company_id:
			raise ValidationError('Недостаточно прав для редактирования филиала.')

		if company and company.id != admin_user.company_id:
			raise ValidationError('Нельзя переносить филиал в другую компанию.')

		serializer.save()
