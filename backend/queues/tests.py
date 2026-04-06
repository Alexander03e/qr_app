from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta
from django.utils import timezone

from clients.models import Client
from companies.models import Branch, Company
from queues.models import Queue, QueueStatus, Ticket


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
			'queue_id': queue.id,
			'client': {
				'phone': '+79990009911',
				'name': 'Guest User',
			},
		}

		response = self.client.post('/api/v1/tickets/join/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(response.data['display_number'].startswith(f'Q{queue.id}-'))

	def test_cannot_create_second_active_ticket_for_same_client(self):
		queue = Queue.objects.create(branch=self.branch, name='Тестовая очередь')
		payload = {
			'queue_id': queue.id,
			'client': {
				'phone': '+79990001122',
				'name': 'Ivan',
			},
		}

		first_response = self.client.post('/api/v1/tickets/join/', payload, format='json')
		second_response = self.client.post('/api/v1/tickets/join/', payload, format='json')

		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('client', second_response.data)

	def test_join_rejects_client_id_in_payload(self):
		queue = Queue.objects.create(branch=self.branch, name='Тестовая очередь')
		payload = {
			'queue_id': queue.id,
			'client_id': self.client_obj.id,
		}

		response = self.client.post('/api/v1/tickets/join/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('client_id', response.data)

	def test_join_endpoint_creates_client_and_ticket(self):
		queue = Queue.objects.create(branch=self.branch, name='QR очередь')
		payload = {
			'queue_id': queue.id,
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

	def test_join_without_client_payload_creates_anonymous_clients(self):
		queue = Queue.objects.create(branch=self.branch, name='Анонимная очередь')

		first_response = self.client.post(
			'/api/v1/tickets/join/',
			{'queue_id': queue.id},
			format='json',
		)
		second_response = self.client.post(
			'/api/v1/tickets/join/',
			{'queue_id': queue.id},
			format='json',
		)

		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
		self.assertNotEqual(first_response.data['client'], second_response.data['client'])

	def test_queue_snapshot_endpoint_returns_waiting_and_current(self):
		queue = Queue.objects.create(branch=self.branch, name='Табло')
		t1 = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0001',
		)
		other_client = Client.objects.create(
			name='Petr',
			phone='+79990003344',
			branch_id=str(self.branch.id),
		)
		t2 = Ticket.objects.create(
			queue=queue,
			client=other_client,
			status=QueueStatus.IN_SERVICE,
			display_number='Q1-0002',
		)

		response = self.client.get(f'/api/v1/queues/{queue.id}/snapshot/', format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['queue_id'], queue.id)
		self.assertEqual(response.data['queue_name'], 'Табло')
		self.assertEqual(response.data['waiting_count'], 1)
		self.assertEqual(response.data['current_ticket']['id'], t2.id)
		self.assertEqual(response.data['waiting_tickets'][0]['id'], t1.id)

	def test_status_update_returns_ticket_and_snapshot(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 1')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0003',
		)

		response = self.client.patch(
			f'/api/v1/tickets/{ticket.id}/status/',
			{'status': QueueStatus.CALLED},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('ticket', response.data)
		self.assertIn('queue_snapshot', response.data)
		self.assertEqual(response.data['ticket']['status'], QueueStatus.CALLED)
		self.assertEqual(response.data['queue_snapshot']['queue_id'], queue.id)

	def test_invite_next_marks_previous_and_calls_waiting(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 2')
		served_client = Client.objects.create(
			name='Served',
			phone='+79990004455',
			branch_id=str(self.branch.id),
		)
		called_client = Client.objects.create(
			name='Called',
			phone='+79990005566',
			branch_id=str(self.branch.id),
		)
		waiting_client = Client.objects.create(
			name='Waiting',
			phone='+79990006677',
			branch_id=str(self.branch.id),
		)

		in_service_ticket = Ticket.objects.create(
			queue=queue,
			client=served_client,
			status=QueueStatus.IN_SERVICE,
			display_number='Q1-0010',
		)
		called_ticket = Ticket.objects.create(
			queue=queue,
			client=called_client,
			status=QueueStatus.CALLED,
			display_number='Q1-0011',
		)
		waiting_ticket = Ticket.objects.create(
			queue=queue,
			client=waiting_client,
			status=QueueStatus.WAITING,
			display_number='Q1-0012',
		)

		response = self.client.post(f'/api/v1/queues/{queue.id}/invite-next/', {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		in_service_ticket.refresh_from_db()
		called_ticket.refresh_from_db()
		waiting_ticket.refresh_from_db()

		self.assertEqual(in_service_ticket.status, QueueStatus.COMPLETED)
		self.assertEqual(called_ticket.status, QueueStatus.SKIPPED)
		self.assertEqual(waiting_ticket.status, QueueStatus.CALLED)

	def test_append_to_queue_moves_active_ticket_to_end(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 3')
		client_a = Client.objects.create(
			name='A',
			phone='+79990007788',
			branch_id=str(self.branch.id),
		)
		client_b = Client.objects.create(
			name='B',
			phone='+79990008899',
			branch_id=str(self.branch.id),
		)

		waiting_ticket = Ticket.objects.create(
			queue=queue,
			client=client_a,
			status=QueueStatus.WAITING,
			display_number='Q1-0020',
		)
		active_ticket = Ticket.objects.create(
			queue=queue,
			client=client_b,
			status=QueueStatus.CALLED,
			display_number='Q1-0021',
		)

		past_ts = timezone.now() - timedelta(minutes=10)
		Ticket.objects.filter(id=waiting_ticket.id).update(enqueued_at=past_ts)

		response = self.client.post(f'/api/v1/tickets/{active_ticket.id}/append-to-queue/', {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		waiting_order = list(
			Ticket.objects.filter(queue=queue, status=QueueStatus.WAITING)
			.order_by('enqueued_at', 'id')
			.values_list('id', flat=True)
		)
		self.assertEqual(waiting_order, [waiting_ticket.id, active_ticket.id])

	def test_queue_bulk_delete_tickets(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 4')
		other_queue = Queue.objects.create(branch=self.branch, name='Окно 5')

		t1 = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0030',
		)
		t2 = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0031',
		)
		foreign_ticket = Ticket.objects.create(
			queue=other_queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0032',
		)

		ok_response = self.client.post(
			f'/api/v1/queues/{queue.id}/tickets/delete/',
			{'ticket_ids': [t1.id, t2.id]},
			format='json',
		)

		self.assertEqual(ok_response.status_code, status.HTTP_200_OK)
		self.assertEqual(ok_response.data['deleted_count'], 2)
		self.assertEqual(sorted(ok_response.data['deleted_ticket_ids']), sorted([t1.id, t2.id]))
		self.assertFalse(Ticket.objects.filter(id=t1.id).exists())
		self.assertFalse(Ticket.objects.filter(id=t2.id).exists())

		bad_response = self.client.post(
			f'/api/v1/queues/{queue.id}/tickets/delete/',
			{'ticket_ids': [foreign_ticket.id]},
			format='json',
		)
		self.assertEqual(bad_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('missing_ticket_ids', bad_response.data)
