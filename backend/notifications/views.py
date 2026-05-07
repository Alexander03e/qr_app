from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import FeedbackItem, FeedbackStatus
from notifications.serializers import (
	AdminFeedbackItemSerializer,
	PublicFeedbackCreateSerializer,
	PublicFeedbackItemSerializer,
)
from notifications.services import create_client_feedback
from users.services import get_admin_by_token, parse_bearer_token


class PublicFeedbackCreateView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(
		request=PublicFeedbackCreateSerializer,
		responses={status.HTTP_201_CREATED: PublicFeedbackItemSerializer},
	)
	def post(self, request):
		serializer = PublicFeedbackCreateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		feedback_item = create_client_feedback(
			queue_id=serializer.validated_data['queue_id'],
			ticket_id=serializer.validated_data.get('ticket_id'),
			feedback_type=serializer.validated_data['type'],
			title=serializer.validated_data.get('title'),
			message=serializer.validated_data['message'],
			rating=serializer.validated_data.get('rating'),
		)
		output_serializer = PublicFeedbackItemSerializer(feedback_item)
		return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class AdminFeedbackItemViewSet(viewsets.ModelViewSet):
	queryset = FeedbackItem.objects.select_related('company', 'branch', 'queue').all()
	serializer_class = AdminFeedbackItemSerializer

	def _require_admin(self):
		token = parse_bearer_token(self.request.headers.get('Authorization'))
		return get_admin_by_token(token)

	def get_queryset(self):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			return FeedbackItem.objects.none()

		return super().get_queryset().filter(company_id=admin_user.company_id)

	def _validate_scope(
		self,
		admin_company_id: int,
		branch_id: int | None,
		queue_id: int | None,
		ticket_id: int | None = None,
	):
		if branch_id is not None:
			from companies.models import Branch

			branch = Branch.objects.filter(id=branch_id).first()
			if branch is None:
				raise ValidationError('Филиал не найден.')
			if branch.company_id != admin_company_id:
				raise ValidationError('Нельзя использовать филиал другой компании.')

		if queue_id is not None:
			from queues.models import Queue

			queue = Queue.objects.select_related('branch').filter(id=queue_id).first()
			if queue is None:
				raise ValidationError('Очередь не найдена.')
			if not queue.branch or queue.branch.company_id != admin_company_id:
				raise ValidationError('Нельзя использовать очередь другой компании.')

		if ticket_id is not None:
			from queues.models import Ticket

			ticket = Ticket.objects.select_related('queue', 'queue__branch').filter(id=ticket_id).first()
			if ticket is None:
				raise ValidationError('Талон не найден.')
			if not ticket.queue.branch or ticket.queue.branch.company_id != admin_company_id:
				raise ValidationError('Нельзя использовать талон другой компании.')
			if queue_id is not None and ticket.queue_id != queue_id:
				raise ValidationError('Талон не относится к выбранной очереди.')
			if branch_id is not None and ticket.queue.branch_id != branch_id:
				raise ValidationError('Талон не относится к выбранному филиалу.')

	def perform_create(self, serializer):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			raise ValidationError('Администратор должен быть привязан к компании.')

		branch = serializer.validated_data.get('branch')
		queue = serializer.validated_data.get('queue')
		ticket = serializer.validated_data.get('ticket')
		self._validate_scope(
			admin_user.company_id,
			branch.id if branch else None,
			queue.id if queue else None,
			ticket.id if ticket else None,
		)

		serializer.save(company_id=admin_user.company_id)

	def perform_update(self, serializer):
		admin_user = self._require_admin()
		instance = self.get_object()

		if not admin_user.company_id or instance.company_id != admin_user.company_id:
			raise ValidationError('Недостаточно прав для редактирования записи.')

		branch = serializer.validated_data.get('branch', instance.branch)
		queue = serializer.validated_data.get('queue', instance.queue)
		ticket = serializer.validated_data.get('ticket', instance.ticket)
		self._validate_scope(
			admin_user.company_id,
			branch.id if branch else None,
			queue.id if queue else None,
			ticket.id if ticket else None,
		)

		status = serializer.validated_data.get('status', instance.status)
		payload = {'resolved_by_user': None, 'resolved_at': None}
		if status == FeedbackStatus.RESOLVED:
			payload = {'resolved_by_user_id': admin_user.id, 'resolved_at': timezone.now()}

		serializer.save(**payload)
