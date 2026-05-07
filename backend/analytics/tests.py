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
		self.operator = User.objects.create(
			fullname='Operator One',
			email='operator-metrics@example.com',
			password='secret123',
			role=Role.OPERATOR,
			company=self.company,
			branch=self.branch,
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
			operator=self.operator,
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
		self.assertEqual(response.data['business']['left_rate_percent'], 0)
		self.assertEqual(response.data['business']['completion_rate_percent'], 50)
		self.assertEqual(response.data['business']['queues'][0]['queue_name'], 'Касса 1')
		self.assertEqual(response.data['business']['operators'][0]['operator_id'], self.operator.id)

	def test_admin_metrics_supports_branch_operator_and_time_filters(self):
		queue = Queue.objects.create(branch=self.branch, name='Касса 2')
		client = Client.objects.create(name='Ivan', branch_id=str(self.branch.id))
		now = timezone.now()

		Ticket.objects.create(
			queue=queue,
			client=client,
			status=QueueStatus.COMPLETED,
			display_number='Q1-0003',
			enqueued_at=now - timedelta(hours=2),
			called_at=now - timedelta(hours=1, minutes=50),
			service_started_at=now - timedelta(hours=1, minutes=45),
			finished_at=now - timedelta(hours=1, minutes=35),
			operator=self.operator,
		)
		Ticket.objects.create(
			queue=queue,
			client=client,
			status=QueueStatus.LEFT,
			display_number='Q1-0004',
			enqueued_at=now - timedelta(days=3),
		)

		response = self.client.get(
			'/api/v1/admin/metrics/',
			{
				'branch_id': self.branch.id,
				'operator_id': self.operator.id,
				'date_from': (now - timedelta(days=1)).date().isoformat(),
				'date_to': now.date().isoformat(),
			},
			**self.admin_headers(),
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['business']['total_tickets'], 1)
		self.assertEqual(response.data['business']['completed_tickets'], 1)
		self.assertEqual(response.data['business']['left_tickets'], 0)
