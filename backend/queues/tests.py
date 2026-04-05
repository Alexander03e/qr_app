from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from companies.models import Branch, Company
from queues.models import Queue


class QueueTicketApiTests(APITestCase):
	def setUp(self):
		self.company = Company.objects.create(name='Acme', timezone='Europe/Moscow')
		self.branch = Branch.objects.create(
			company=self.company,
			name='Main Branch',
			address='Moscow',
			is_active=True,
			work_schedule_json={'mon': '09:00-18:00'},
		)
		self.client_obj = Client.objects.create(
			name='Ivan',
			phone='+79990001122',
			branch_id=str(self.branch.id),
		)

	def test_create_queue(self):
		payload = {
			'branch': self.branch.id,
			'name': 'Касса 1',
		}

		response = self.client.post('/api/v1/queues/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['name'], 'Касса 1')

	def test_create_ticket_generates_display_number(self):
		queue = Queue.objects.create(branch=self.branch, name='Тестовая очередь')
		payload = {
			'queue': queue.id,
			'client': self.client_obj.id,
		}

		response = self.client.post('/api/v1/tickets/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(response.data['display_number'].startswith(f'Q{queue.id}-'))

	def test_cannot_create_second_active_ticket_for_same_client(self):
		queue = Queue.objects.create(branch=self.branch, name='Тестовая очередь')
		payload = {
			'queue': queue.id,
			'client': self.client_obj.id,
		}

		first_response = self.client.post('/api/v1/tickets/', payload, format='json')
		second_response = self.client.post('/api/v1/tickets/', payload, format='json')

		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('client', second_response.data)

	def test_join_endpoint_creates_client_and_ticket(self):
		queue = Queue.objects.create(branch=self.branch, name='QR очередь')
		payload = {
			'queue': queue.id,
			'client': {
				'name': 'Petr',
				'phone': '+79990002233',
				'send_notification': True,
			},
		}

		response = self.client.post('/api/v1/tickets/join/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['queue'], queue.id)
		created_client = Client.objects.get(phone='+79990002233')
		self.assertEqual(str(created_client.branch_id), str(self.branch.id))
		self.assertEqual(response.data['client'], created_client.id)
