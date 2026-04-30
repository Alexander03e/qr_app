from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from companies.models import Branch, Company
from queues.models import Queue, QueueStatus, Ticket
from users.models import AdminToken, Role, User


class AdminMetricsApiTests(APITestCase):
	def setUp(self):
		self.company = Company.objects.create(name='Acme', timezone='Europe/Moscow')
		self.branch = Branch.objects.create(
			company=self.company,
			name='Main Branch',
			address='Moscow',
			is_active=True,
			work_schedule_json={},
		)
		self.admin = User.objects.create(
			fullname='Admin One',
			email='admin-metrics@example.com',
			password='secret123',
			role=Role.ADMIN,
			company=self.company,
		)
		self.admin_token = AdminToken.objects.create(
			user=self.admin,
			key='metrics-admin-token',
			expires_at=timezone.now() + timedelta(hours=1),
		)

	def admin_headers(self):
		return {'HTTP_AUTHORIZATION': f'Bearer {self.admin_token.key}'}

	def test_admin_metrics_returns_business_queue_metrics(self):
		queue = Queue.objects.create(branch=self.branch, name='Касса 1')
		client = Client.objects.create(name='Ivan', branch_id=str(self.branch.id))
		now = timezone.now()

		Ticket.objects.create(
			queue=queue,
			client=client,
			status=QueueStatus.COMPLETED,
			display_number='Q1-0001',
			enqueued_at=now - timedelta(minutes=10),
			called_at=now - timedelta(minutes=8),
			service_started_at=now - timedelta(minutes=5),
			finished_at=now,
		)
		Ticket.objects.create(
			queue=queue,
			client=client,
			status=QueueStatus.WAITING,
			display_number='Q1-0002',
		)

		response = self.client.get(
			'/api/v1/admin/metrics/',
			**self.admin_headers(),
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['business']['completed_tickets'], 1)
		self.assertEqual(response.data['business']['waiting_tickets'], 1)
		self.assertEqual(response.data['business']['avg_wait_seconds'], 120)
		self.assertEqual(response.data['business']['avg_service_seconds'], 300)
		self.assertEqual(response.data['business']['queues'][0]['queue_name'], 'Касса 1')
