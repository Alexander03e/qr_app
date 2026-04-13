from django.contrib.auth.hashers import make_password
from drf_spectacular.utils import OpenApiParameter
from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework import status
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from companies.models import Branch
from users.models import Role, User
from users.serializers import (
	AdminSettingsSerializer,
	AdminLoginResponseSerializer,
	AdminLoginSerializer,
	AdminOperatorSerializer,
	AdminProfileSerializer,
	AdminSessionSerializer,
	OperatorSettingsSerializer,
	OperatorLoginResponseSerializer,
	OperatorLoginSerializer,
	OperatorLogoutResponseSerializer,
	OperatorProfileSerializer,
	OperatorSessionSerializer,
)
from users.services import (
	authenticate_admin,
	authenticate_operator,
	get_admin_by_token,
	get_operator_by_token,
	parse_bearer_token,
	revoke_admin_token,
	revoke_operator_token,
)


class OperatorLoginView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(
		request=OperatorLoginSerializer,
		responses={status.HTTP_200_OK: OperatorLoginResponseSerializer},
	)
	def post(self, request):
		serializer = OperatorLoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token, user = authenticate_operator(
			email=serializer.validated_data['email'],
			password=serializer.validated_data['password'],
		)

		return Response(
			{
				'token': token.key,
				'expires_at': token.expires_at,
				'operator': OperatorProfileSerializer(user).data,
			},
			status=status.HTTP_200_OK,
		)


class OperatorSessionView(APIView):
	@extend_schema(responses={status.HTTP_200_OK: OperatorSessionSerializer})
	def get(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		user = get_operator_by_token(token)

		return Response(
			{
				'operator': OperatorProfileSerializer(user).data,
			},
			status=status.HTTP_200_OK,
		)


class OperatorLogoutView(APIView):
	@extend_schema(responses={status.HTTP_200_OK: OperatorLogoutResponseSerializer})
	def post(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		revoke_operator_token(token)

		return Response({'detail': 'ok'}, status=status.HTTP_200_OK)


class OperatorSettingsView(APIView):
	@extend_schema(
		request=OperatorSettingsSerializer,
		responses={status.HTTP_200_OK: OperatorSessionSerializer},
	)
	def patch(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		operator_user = get_operator_by_token(token)

		serializer = OperatorSettingsSerializer(
			operator_user,
			data=request.data,
			partial=True,
		)
		serializer.is_valid(raise_exception=True)

		for attr, value in serializer.validated_data.items():
			setattr(operator_user, attr, value)

		if serializer.validated_data:
			operator_user.save(update_fields=list(serializer.validated_data.keys()))

		return Response({'operator': OperatorProfileSerializer(operator_user).data}, status=status.HTTP_200_OK)


class AdminLoginView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(
		request=AdminLoginSerializer,
		responses={status.HTTP_200_OK: AdminLoginResponseSerializer},
	)
	def post(self, request):
		serializer = AdminLoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		token, user = authenticate_admin(
			email=serializer.validated_data['email'],
			password=serializer.validated_data['password'],
		)

		return Response(
			{
				'token': token.key,
				'expires_at': token.expires_at,
				'admin': AdminProfileSerializer(user).data,
			},
			status=status.HTTP_200_OK,
		)


class AdminSessionView(APIView):
	@extend_schema(responses={status.HTTP_200_OK: AdminSessionSerializer})
	def get(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		user = get_admin_by_token(token)

		return Response(
			{
				'admin': AdminProfileSerializer(user).data,
			},
			status=status.HTTP_200_OK,
		)


class AdminLogoutView(APIView):
	@extend_schema(responses={status.HTTP_200_OK: OperatorLogoutResponseSerializer})
	def post(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		revoke_admin_token(token)

		return Response({'detail': 'ok'}, status=status.HTTP_200_OK)


class AdminSettingsView(APIView):
	@extend_schema(
		request=AdminSettingsSerializer,
		responses={status.HTTP_200_OK: AdminSessionSerializer},
	)
	def patch(self, request):
		token = parse_bearer_token(request.headers.get('Authorization'))
		admin_user = get_admin_by_token(token)

		serializer = AdminSettingsSerializer(
			admin_user,
			data=request.data,
			partial=True,
		)
		serializer.is_valid(raise_exception=True)

		password = serializer.validated_data.pop('password', None)
		for attr, value in serializer.validated_data.items():
			setattr(admin_user, attr, value)

		update_fields = list(serializer.validated_data.keys())
		if password:
			admin_user.password = make_password(password)
			update_fields.append('password')

		if update_fields:
			admin_user.save(update_fields=update_fields)

		return Response({'admin': AdminProfileSerializer(admin_user).data}, status=status.HTTP_200_OK)


class AdminOperatorViewSet(viewsets.ModelViewSet):
	serializer_class = AdminOperatorSerializer
	queryset = User.objects.select_related('company', 'branch').prefetch_related('assigned_queues').filter(role=Role.OPERATOR)

	def _require_admin(self):
		token = parse_bearer_token(self.request.headers.get('Authorization'))
		return get_admin_by_token(token)

	def get_queryset(self):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			return User.objects.none()

		queryset = super().get_queryset()
		queryset = queryset.filter(company_id=admin_user.company_id)

		branch_id = self.request.query_params.get('branch')
		if branch_id:
			queryset = queryset.filter(branch_id=branch_id)

		return queryset

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context['admin_user'] = self._require_admin()
		return context

	@extend_schema(
		parameters=[
			OpenApiParameter(
				name='branch',
				type=int,
				required=False,
				description='ID филиала для фильтрации операторов',
			)
		],
	)
	def list(self, request, *args, **kwargs):
		return super().list(request, *args, **kwargs)

	def perform_create(self, serializer):
		admin_user = self._require_admin()

		if not admin_user.company_id:
			raise ValidationError('Для создания оператора администратор должен быть привязан к компании.')

		branch = serializer.validated_data.get('branch')
		if branch and branch.company_id != admin_user.company_id:
			raise ValidationError('Нельзя назначить оператору филиал другой компании.')

		password = serializer.validated_data.get('password')
		queue_ids = serializer.validated_data.pop('queue_ids', [])
		if not password:
			raise ValidationError('Поле password обязательно.')

		operator = serializer.save(company_id=admin_user.company_id, role=Role.OPERATOR, password=make_password(password))
		if queue_ids:
			operator.assigned_queues.set(queue_ids)

	def perform_update(self, serializer):
		admin_user = self._require_admin()
		instance = self.get_object()

		if not admin_user.company_id or instance.company_id != admin_user.company_id:
			raise ValidationError('Недостаточно прав для редактирования оператора.')

		branch = serializer.validated_data.get('branch')
		if branch and admin_user.company_id and branch.company_id != admin_user.company_id:
			raise ValidationError('Нельзя назначить оператору филиал другой компании.')

		queue_ids = serializer.validated_data.pop('queue_ids', None)
		password = serializer.validated_data.get('password')
		if password:
			operator = serializer.save(password=make_password(password))
			if queue_ids is not None:
				operator.assigned_queues.set(queue_ids)
			return

		operator = serializer.save()
		if queue_ids is not None:
			operator.assigned_queues.set(queue_ids)
