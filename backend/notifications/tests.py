from datetime import timedelta
import json
from unittest.mock import patch
from urllib import parse

from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Branch, Company
from notifications.models import (
	ClientNotificationSubscription,
	FeedbackItem,
	FeedbackStatus,
	FeedbackType,
	NotificationChannelType,
	NotificationDeliveryStatus,
	NotificationEventType,
	WebhookDelivery,
	WebhookSubscription,
)
from notifications.services import notify_ticket_status_changed
from clients.models import Client
from queues.models import Queue, QueueStatus, Ticket
from users.models import AuthToken, Role, User


class AdminFeedbackApiTests(APITestCase):
	def setUp(self):
		self.company = Company.objects.create(name='Acme', timezone='Europe/Moscow')
		self.branch = Branch.objects.create(
			company=self.company,
			name='Main Branch',
			address='Moscow',
			is_active=True,
			work_schedule_json={},
		)
		self.queue = Queue.objects.create(
			branch=self.branch,
			name='Касса 1',
			notification_options={'channels': ['vk', 'webpush']},
		)
		self.client_obj = Client.objects.create(name='Client', branch_id=str(self.branch.id))
		self.ticket = Ticket.objects.create(
			queue=self.queue,
			client=self.client_obj,
			status=QueueStatus.COMPLETED,
			display_number='Q1-0001',
		)
		self.admin = User.objects.create(
			fullname='Admin One',
			email='admin-feedback@example.com',
			password='secret123',
			role=Role.ADMIN,
			company=self.company,
		)
		self.admin_token = AuthToken.objects.create(
			user=self.admin,
			key='feedback-admin-token',
			expires_at=timezone.now() + timedelta(hours=1),
		)

	def admin_headers(self):
		return {'HTTP_AUTHORIZATION': f'Bearer {self.admin_token.key}'}

	def test_client_can_create_public_feedback_for_queue(self):
		response = self.client.post(
			'/api/v1/feedback/',
			{
				'queue_id': self.queue.id,
				'type': FeedbackType.COMPLAINT,
				'ticket_id': self.ticket.id,
				'title': 'Долгое ожидание',
				'message': 'Хочу сообщить о задержке.',
				'rating': 2,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		feedback_item = FeedbackItem.objects.get(id=response.data['id'])
		self.assertEqual(feedback_item.company_id, self.company.id)
		self.assertEqual(feedback_item.branch_id, self.branch.id)
		self.assertEqual(feedback_item.queue_id, self.queue.id)
		self.assertEqual(feedback_item.ticket_id, self.ticket.id)
		self.assertEqual(feedback_item.rating, 2)
		self.assertEqual(feedback_item.status, FeedbackStatus.NEW)

	def test_admin_can_view_company_feedback(self):
		feedback_item = FeedbackItem.objects.create(
			company=self.company,
			branch=self.branch,
			queue=self.queue,
			type=FeedbackType.FEEDBACK,
			title='Спасибо',
			message='Все быстро',
			status=FeedbackStatus.NEW,
		)

		response = self.client.get(
			'/api/v1/admin/feedback/',
			**self.admin_headers(),
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data[0]['id'], feedback_item.id)
		self.assertEqual(response.data[0]['message'], 'Все быстро')

	def test_admin_cannot_create_or_update_feedback(self):
		feedback_item = FeedbackItem.objects.create(
			company=self.company,
			branch=self.branch,
			queue=self.queue,
			type=FeedbackType.FEEDBACK,
			title='Спасибо',
			message='Все быстро',
			status=FeedbackStatus.NEW,
		)

		create_response = self.client.post(
			'/api/v1/admin/feedback/',
			{
				'branch': self.branch.id,
				'queue': self.queue.id,
				'type': FeedbackType.FEEDBACK,
				'title': 'Спасибо',
				'message': 'Все быстро',
				'status': FeedbackStatus.NEW,
			},
			**self.admin_headers(),
			format='json',
		)

		self.assertEqual(create_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

		update_response = self.client.patch(
			f'/api/v1/admin/feedback/{feedback_item.id}/',
			{'status': FeedbackStatus.RESOLVED},
			**self.admin_headers(),
			format='json',
		)

		self.assertEqual(update_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
		feedback_item.refresh_from_db()
		self.assertEqual(feedback_item.status, FeedbackStatus.NEW)

	def test_client_can_subscribe_to_web_push(self):
		response = self.client.post(
			'/api/v1/notifications/web-push/subscribe/',
			{
				'queue_id': self.queue.id,
				'ticket_id': self.ticket.id,
				'subscription': {
					'endpoint': 'https://push.example.test/subscription/1',
					'keys': {
						'p256dh': 'p256dh-test-key',
						'auth': 'auth-test-key',
					},
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		subscription = ClientNotificationSubscription.objects.get(id=response.data['id'])
		self.assertEqual(subscription.channel, NotificationChannelType.WEB_PUSH)
		self.assertEqual(subscription.client_id, self.client_obj.id)
		self.assertEqual(subscription.queue_id, self.queue.id)
		self.assertTrue(subscription.is_active)

	def test_client_cannot_subscribe_to_disabled_web_push(self):
		self.queue.notification_options = {'channels': ['vk']}
		self.queue.save(update_fields=['notification_options'])

		response = self.client.post(
			'/api/v1/notifications/web-push/subscribe/',
			{
				'queue_id': self.queue.id,
				'ticket_id': self.ticket.id,
				'subscription': {
					'endpoint': 'https://push.example.test/subscription/disabled',
					'keys': {
						'p256dh': 'p256dh-test-key',
						'auth': 'auth-test-key',
					},
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_client_can_subscribe_to_vk_notifications(self):
		response = self.client.post(
			'/api/v1/notifications/vk/subscribe/',
			{
				'queue_id': self.queue.id,
				'ticket_id': self.ticket.id,
				'vk_id': '123456789',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.client_obj.refresh_from_db()
		self.assertEqual(self.client_obj.vk_id, '123456789')
		self.assertTrue(self.client_obj.send_notification)
		self.assertTrue(
			ClientNotificationSubscription.objects.filter(
				client=self.client_obj,
				queue=self.queue,
				channel=NotificationChannelType.VK,
				vk_user_id='123456789',
				is_active=True,
			).exists()
		)

	def test_client_can_unsubscribe_from_web_push(self):
		subscription = ClientNotificationSubscription.objects.create(
			queue=self.queue,
			client=self.client_obj,
			channel=NotificationChannelType.WEB_PUSH,
			endpoint='https://push.example.test/subscription/2',
			p256dh_key='p256dh-test-key',
			auth_key='auth-test-key',
			is_active=True,
		)

		response = self.client.post(
			'/api/v1/notifications/web-push/unsubscribe/',
			{
				'queue_id': self.queue.id,
				'ticket_id': self.ticket.id,
				'endpoint': subscription.endpoint,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['disabled_count'], 1)
		subscription.refresh_from_db()
		self.assertFalse(subscription.is_active)

	def test_vk_oauth_start_reports_missing_config(self):
		response = self.client.post(
			'/api/v1/notifications/vk/oauth/start/',
			{
				'queue_id': self.queue.id,
				'ticket_id': self.ticket.id,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertFalse(response.data['configured'])
		self.assertIsNone(response.data['auth_url'])

	@override_settings(
		VK_OAUTH_CLIENT_ID='123456',
		VK_OAUTH_CLIENT_SECRET='secret',
		VK_BOT_URL='https://vk.me/queueflow_test',
	)
	def test_vk_oauth_callback_subscribes_client(self):
		start_response = self.client.post(
			'/api/v1/notifications/vk/oauth/start/',
			{
				'queue_id': self.queue.id,
				'ticket_id': self.ticket.id,
			},
			format='json',
		)
		self.assertEqual(start_response.status_code, status.HTTP_200_OK)
		self.assertTrue(start_response.data['configured'])

		auth_url = start_response.data['auth_url']
		state = parse.parse_qs(parse.urlparse(auth_url).query)['state'][0]

		class FakeVkResponse:
			status = 200

			def __enter__(self):
				return self

			def __exit__(self, exc_type, exc, traceback):
				return False

			def read(self):
				return json.dumps({'access_token': 'token', 'user_id': 987654321}).encode('utf-8')

		with patch('notifications.services.request.urlopen', return_value=FakeVkResponse()):
			callback_response = self.client.get(
				'/api/v1/notifications/vk/oauth/callback/',
				{
					'code': 'vk-code',
					'state': state,
				},
			)

		self.assertEqual(callback_response.status_code, status.HTTP_200_OK)
		self.client_obj.refresh_from_db()
		self.assertEqual(self.client_obj.vk_id, '987654321')
		self.assertTrue(self.client_obj.send_notification)
		self.assertTrue(
			ClientNotificationSubscription.objects.filter(
				client=self.client_obj,
				queue=self.queue,
				channel=NotificationChannelType.VK,
				vk_user_id='987654321',
				is_active=True,
			).exists()
		)

	def test_admin_can_create_webhook_subscription_for_company_queue(self):
		response = self.client.post(
			'/api/v1/admin/webhook-subscriptions/',
			{
				'name': 'CRM интеграция',
				'queue': self.queue.id,
				'target_url': 'https://crm.example.test/webhooks/queueflow',
				'event_types': ['ticket.called'],
				'secret': 'secret-key',
				'is_active': True,
			},
			**self.admin_headers(),
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		webhook_subscription = WebhookSubscription.objects.get(id=response.data['id'])
		self.assertEqual(webhook_subscription.company_id, self.company.id)
		self.assertEqual(webhook_subscription.queue_id, self.queue.id)
		self.assertEqual(webhook_subscription.created_by_user_id, self.admin.id)

	def test_ticket_status_change_sends_webhook_delivery(self):
		WebhookSubscription.objects.create(
			company=self.company,
			queue=self.queue,
			name='CRM интеграция',
			target_url='https://crm.example.test/webhooks/queueflow',
			event_types=[NotificationEventType.TICKET_STATUS_CHANGED.value],
			is_active=True,
		)
		self.ticket.status = QueueStatus.IN_SERVICE
		self.ticket.save(update_fields=['status', 'updated_at'])

		class FakeWebhookResponse:
			status = 200

			def __enter__(self):
				return self

			def __exit__(self, exc_type, exc, traceback):
				return False

			def read(self):
				return b'{"ok": true}'

		with patch('notifications.services.request.urlopen', return_value=FakeWebhookResponse()):
			notify_ticket_status_changed(
				ticket_id=self.ticket.id,
				previous_status=QueueStatus.CALLED,
				new_status=QueueStatus.IN_SERVICE,
			)

		delivery = WebhookDelivery.objects.get()
		self.assertEqual(delivery.event_type, NotificationEventType.TICKET_STATUS_CHANGED)
		self.assertEqual(delivery.status, NotificationDeliveryStatus.SENT)
		self.assertEqual(delivery.payload['event'], NotificationEventType.TICKET_STATUS_CHANGED)
		self.assertEqual(delivery.payload['status_change']['previous_status'], QueueStatus.CALLED)
		self.assertEqual(delivery.payload['status_change']['new_status'], QueueStatus.IN_SERVICE)

	def test_called_status_change_keeps_legacy_ticket_called_webhook_filter(self):
		WebhookSubscription.objects.create(
			company=self.company,
			queue=self.queue,
			name='CRM legacy',
			target_url='https://crm.example.test/webhooks/queueflow',
			event_types=[NotificationEventType.TICKET_CALLED.value],
			is_active=True,
		)
		self.ticket.status = QueueStatus.CALLED
		self.ticket.save(update_fields=['status', 'updated_at'])

		class FakeWebhookResponse:
			status = 200

			def __enter__(self):
				return self

			def __exit__(self, exc_type, exc, traceback):
				return False

			def read(self):
				return b'{"ok": true}'

		with patch('notifications.services.request.urlopen', return_value=FakeWebhookResponse()):
			notify_ticket_status_changed(
				ticket_id=self.ticket.id,
				previous_status=QueueStatus.WAITING,
				new_status=QueueStatus.CALLED,
			)

		delivery = WebhookDelivery.objects.get()
		self.assertEqual(delivery.event_type, NotificationEventType.TICKET_CALLED)
		self.assertEqual(delivery.status, NotificationDeliveryStatus.SENT)
