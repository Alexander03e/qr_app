import html
import json

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import FeedbackItem, FeedbackStatus, WebhookSubscription
from notifications.serializers import (
	AdminFeedbackItemSerializer,
	ClientNotificationSubscriptionSerializer,
	NotificationStatusSerializer,
	PublicFeedbackCreateSerializer,
	PublicFeedbackItemSerializer,
	PublicVkOAuthStartSerializer,
	PublicVkSubscribeSerializer,
	PublicWebPushSubscribeSerializer,
	VkOAuthStartResponseSerializer,
	WebPushPublicKeySerializer,
	WebhookSubscriptionSerializer,
)
from notifications.services import (
	build_vk_oauth_authorize_url,
	complete_vk_oauth_subscription,
	create_client_feedback,
	get_client_notification_status,
	is_vk_oauth_configured,
	subscribe_vk,
	subscribe_web_push,
)
from users.authentication import AuthTokenAuthentication
from users.permissions import IsAdminUser


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


class WebPushPublicKeyView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(responses={status.HTTP_200_OK: WebPushPublicKeySerializer})
	def get(self, request):
		public_key = getattr(settings, 'WEB_PUSH_VAPID_PUBLIC_KEY', '')
		serializer = WebPushPublicKeySerializer(
			{
				'public_key': public_key or None,
				'configured': bool(public_key),
			}
		)
		return Response(serializer.data, status=status.HTTP_200_OK)


class PublicWebPushSubscribeView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(
		request=PublicWebPushSubscribeSerializer,
		responses={status.HTTP_201_CREATED: ClientNotificationSubscriptionSerializer},
	)
	def post(self, request):
		serializer = PublicWebPushSubscribeSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		subscription = subscribe_web_push(
			queue_id=serializer.validated_data['queue_id'],
			client_id=serializer.validated_data.get('client_id'),
			ticket_id=serializer.validated_data.get('ticket_id'),
			subscription=serializer.validated_data['subscription'],
			user_agent=request.headers.get('User-Agent'),
		)
		output_serializer = ClientNotificationSubscriptionSerializer(subscription)
		return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class PublicVkSubscribeView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(
		request=PublicVkSubscribeSerializer,
		responses={status.HTTP_201_CREATED: ClientNotificationSubscriptionSerializer},
	)
	def post(self, request):
		serializer = PublicVkSubscribeSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		subscription = subscribe_vk(
			queue_id=serializer.validated_data['queue_id'],
			client_id=serializer.validated_data.get('client_id'),
			ticket_id=serializer.validated_data.get('ticket_id'),
			vk_id=serializer.validated_data['vk_id'],
		)
		output_serializer = ClientNotificationSubscriptionSerializer(subscription)
		return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class PublicVkOAuthStartView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(
		request=PublicVkOAuthStartSerializer,
		responses={status.HTTP_200_OK: VkOAuthStartResponseSerializer},
	)
	def post(self, request):
		serializer = PublicVkOAuthStartSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		if not is_vk_oauth_configured():
			output_serializer = VkOAuthStartResponseSerializer(
				{
					'configured': False,
					'auth_url': None,
					'bot_url': getattr(settings, 'VK_BOT_URL', '') or None,
				}
			)
			return Response(output_serializer.data, status=status.HTTP_200_OK)

		auth_url = build_vk_oauth_authorize_url(
			queue_id=serializer.validated_data['queue_id'],
			client_id=serializer.validated_data.get('client_id'),
			ticket_id=serializer.validated_data.get('ticket_id'),
			django_request=request,
		)
		output_serializer = VkOAuthStartResponseSerializer(
			{
				'configured': True,
				'auth_url': auth_url,
				'bot_url': getattr(settings, 'VK_BOT_URL', '') or None,
			}
		)
		return Response(output_serializer.data, status=status.HTTP_200_OK)


class PublicVkOAuthCallbackView(APIView):
	authentication_classes = []
	permission_classes = []

	def _html_response(
		self,
		*,
		result_status: str,
		message: str,
		bot_url: str | None = None,
	):
		payload = json.dumps(
			{
				'source': 'queueflow-vk-oauth',
				'status': result_status,
				'message': message,
				'bot_url': bot_url,
			},
			ensure_ascii=False,
		).replace('</', '<\\/')
		script_action = (
			f"window.location.replace({json.dumps(bot_url)});"
			if result_status == 'success' and bot_url
			else 'window.setTimeout(function() { window.close(); }, 500);'
		)
		safe_message = html.escape(message)
		html_content = f"""<!doctype html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>VK</title>
</head>
<body>
	<script>
		(function() {{
			var payload = {payload};
			if (window.opener) {{
				window.opener.postMessage(payload, "*");
			}}
			{script_action}
		}}());
	</script>
	<p>{safe_message}</p>
</body>
</html>"""
		return HttpResponse(html_content, content_type='text/html; charset=utf-8')

	@extend_schema(exclude=True)
	def get(self, request):
		error = request.query_params.get('error')
		if error:
			return self._html_response(
				result_status='error',
				message=request.query_params.get('error_description') or 'VK авторизация отменена.',
			)

		code = request.query_params.get('code')
		state = request.query_params.get('state')
		if not code or not state:
			return self._html_response(
				result_status='error',
				message='VK не вернул необходимые параметры авторизации.',
			)

		try:
			complete_vk_oauth_subscription(code=code, state=state, django_request=request)
		except Exception as exc:
			return self._html_response(
				result_status='error',
				message=str(exc),
			)

		return self._html_response(
			result_status='success',
			message='VK подключен.',
			bot_url=getattr(settings, 'VK_BOT_URL', '') or None,
		)


class PublicNotificationStatusView(APIView):
	authentication_classes = []
	permission_classes = []

	@extend_schema(responses={status.HTTP_200_OK: NotificationStatusSerializer})
	def get(self, request):
		queue_id = request.query_params.get('queue_id')
		client_id = request.query_params.get('client_id')
		ticket_id = request.query_params.get('ticket_id')

		if not queue_id:
			raise ValidationError({'queue_id': ['Обязательное поле.']})

		result = get_client_notification_status(
			queue_id=int(queue_id),
			client_id=client_id,
			ticket_id=int(ticket_id) if ticket_id else None,
		)
		serializer = NotificationStatusSerializer(result)
		return Response(serializer.data, status=status.HTTP_200_OK)


class AdminFeedbackItemViewSet(viewsets.ModelViewSet):
	authentication_classes = [AuthTokenAuthentication]
	permission_classes = [IsAdminUser]
	queryset = FeedbackItem.objects.select_related('company', 'branch', 'queue').all()
	serializer_class = AdminFeedbackItemSerializer

	def _require_admin(self):
		return self.request.user

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


class AdminWebhookSubscriptionViewSet(viewsets.ModelViewSet):
	authentication_classes = [AuthTokenAuthentication]
	permission_classes = [IsAdminUser]
	queryset = WebhookSubscription.objects.select_related('company', 'queue').all()
	serializer_class = WebhookSubscriptionSerializer

	def _require_admin(self):
		return self.request.user

	def get_queryset(self):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			return WebhookSubscription.objects.none()

		return super().get_queryset().filter(company_id=admin_user.company_id)

	def _validate_queue_scope(self, admin_company_id: int, queue):
		if queue is None:
			return

		if not queue.branch or queue.branch.company_id != admin_company_id:
			raise ValidationError('Нельзя подписаться на очередь другой компании.')

	def perform_create(self, serializer):
		admin_user = self._require_admin()
		if not admin_user.company_id:
			raise ValidationError('Администратор должен быть привязан к компании.')

		queue = serializer.validated_data.get('queue')
		self._validate_queue_scope(admin_user.company_id, queue)
		serializer.save(company_id=admin_user.company_id, created_by_user=admin_user)

	def perform_update(self, serializer):
		admin_user = self._require_admin()
		instance = self.get_object()
		if not admin_user.company_id or instance.company_id != admin_user.company_id:
			raise ValidationError('Недостаточно прав для редактирования webhook-подписки.')

		queue = serializer.validated_data.get('queue', instance.queue)
		self._validate_queue_scope(admin_user.company_id, queue)
		serializer.save()
