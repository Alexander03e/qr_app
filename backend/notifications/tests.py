from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Branch, Company
from notifications.models import FeedbackItem, FeedbackStatus, FeedbackType
from clients.models import Client
from queues.models import Queue, QueueStatus, Ticket
from users.models import AdminToken, Role, User


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
		self.queue = Queue.objects.create(branch=self.branch, name='Касса 1')
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
		self.admin_token = AdminToken.objects.create(
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

	def test_admin_can_create_and_resolve_feedback(self):
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

		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		update_response = self.client.patch(
			f"/api/v1/admin/feedback/{create_response.data['id']}/",
			{'status': FeedbackStatus.RESOLVED},
			**self.admin_headers(),
			format='json',
		)

		self.assertEqual(update_response.status_code, status.HTTP_200_OK)
		self.assertEqual(update_response.data['status'], FeedbackStatus.RESOLVED)
		self.assertEqual(update_response.data['resolved_by_user'], self.admin.id)
		self.assertIsNotNone(update_response.data['resolved_at'])
