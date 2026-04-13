from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta
from django.utils import timezone

from clients.models import Client
from companies.models import Branch, Company
from queues.models import Queue, QueueStatus, Ticket
from users.models import OperatorToken, Role, User


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
			device_id='dev-test-001',
			branch_id=str(self.branch.id),
		)
		self.operator = User.objects.create(
			fullname='Operator One',
			email='operator@example.com',
			password='secret123',
			role=Role.OPERATOR,
			company=self.company,
			branch=self.branch,
		)
		self.operator_token = OperatorToken.objects.create(
			user=self.operator,
			key='test-operator-token',
			expires_at=timezone.now() + timedelta(hours=1),
		)

	def operator_headers(self):
		return {'HTTP_AUTHORIZATION': f'Bearer {self.operator_token.key}'}

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
		self.assertEqual(response.data['initial_ticket_number'], 1)

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
		self.assertIn('message', second_response.data)
		self.assertIn('timestamp', second_response.data)

	def test_join_accepts_client_id_in_payload(self):
		queue = Queue.objects.create(branch=self.branch, name='Тестовая очередь')
		payload = {
			'queue_id': queue.id,
			'client_id': self.client_obj.device_id,
		}

		response = self.client.post('/api/v1/tickets/join/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['client'], self.client_obj.id)

	def test_join_accepts_queue_token_and_reuses_client(self):
		queue_a = Queue.objects.create(branch=self.branch, name='Тест A')
		queue_b = Queue.objects.create(branch=self.branch, name='Тест B')

		first_response = self.client.post(
			'/api/v1/tickets/join/',
			{
				'queue_id': queue_a.id,
				'queue_token': 'qt-fixed-001',
				'client': {'device_id': 'dev-shared-001'},
			},
			format='json',
		)
		second_response = self.client.post(
			'/api/v1/tickets/join/',
			{
				'queue_id': queue_b.id,
				'queue_token': 'qt-fixed-001',
			},
			format='json',
		)

		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(first_response.data['client'], second_response.data['client'])

	def test_join_with_new_queue_token_creates_new_client_for_same_device(self):
		queue = Queue.objects.create(branch=self.branch, name='Token migration queue')

		response = self.client.post(
			'/api/v1/tickets/join/',
			{
				'queue_id': queue.id,
				'queue_token': 'qt-migration-001',
				'client': {
					'device_id': self.client_obj.device_id,
				},
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertNotEqual(response.data['client'], self.client_obj.id)
		self.assertTrue(
			Client.objects.filter(id=response.data['client'], queue_token='qt-migration-001').exists()
		)

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
		self.assertIsNone(response.data['client_ticket'])
		self.assertFalse(response.data['client_is_served'])

	def test_queue_snapshot_contains_client_ticket_for_client_id(self):
		queue = Queue.objects.create(branch=self.branch, name='Личный статус')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0901',
		)

		response = self.client.get(
			f'/api/v1/queues/{queue.id}/snapshot/',
			{'client_id': self.client_obj.device_id},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['client_ticket']['id'], ticket.id)
		self.assertFalse(response.data['client_is_served'])

	def test_queue_snapshot_marks_client_as_served(self):
		queue = Queue.objects.create(branch=self.branch, name='История клиента')
		Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.COMPLETED,
			display_number='Q1-0902',
		)

		response = self.client.get(
			f'/api/v1/queues/{queue.id}/snapshot/',
			{'client_id': self.client_obj.device_id},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIsNone(response.data['client_ticket'])
		self.assertTrue(response.data['client_is_served'])

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
			**self.operator_headers(),
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('ticket', response.data)
		self.assertIn('queue_snapshot', response.data)
		self.assertEqual(response.data['ticket']['status'], QueueStatus.CALLED)
		self.assertEqual(response.data['queue_snapshot']['queue_id'], queue.id)

	def test_status_update_allows_client_leave_without_operator_token(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 1')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0004',
		)

		response = self.client.patch(
			f'/api/v1/tickets/{ticket.id}/status/',
			{'status': QueueStatus.LEFT},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		ticket.refresh_from_db()
		self.assertEqual(ticket.status, QueueStatus.LEFT)

	def test_status_update_non_left_requires_operator_token(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 1')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0005',
		)

		response = self.client.patch(
			f'/api/v1/tickets/{ticket.id}/status/',
			{'status': QueueStatus.CALLED},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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

		response = self.client.post(
			f'/api/v1/queues/{queue.id}/invite-next/',
			{},
			**self.operator_headers(),
			format='json',
		)

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

		response = self.client.post(
			f'/api/v1/tickets/{active_ticket.id}/append-to-queue/',
			{},
			**self.operator_headers(),
			format='json',
		)

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
			**self.operator_headers(),
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
			**self.operator_headers(),
			format='json',
		)
		self.assertEqual(bad_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('message', bad_response.data)

	def test_skip_one_ahead_moves_waiting_ticket_by_one_position(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 6')
		client_a = Client.objects.create(name='A2', phone='+70000000001', branch_id=str(self.branch.id))
		client_b = Client.objects.create(name='B2', phone='+70000000002', branch_id=str(self.branch.id))
		client_c = Client.objects.create(name='C2', phone='+70000000003', branch_id=str(self.branch.id))

		ticket_a = Ticket.objects.create(queue=queue, client=client_a, status=QueueStatus.WAITING, display_number='Q1-0100')
		ticket_b = Ticket.objects.create(queue=queue, client=client_b, status=QueueStatus.WAITING, display_number='Q1-0101')
		Ticket.objects.create(queue=queue, client=client_c, status=QueueStatus.WAITING, display_number='Q1-0102')

		Ticket.objects.filter(id=ticket_a.id).update(enqueued_at=timezone.now() - timedelta(minutes=3))
		Ticket.objects.filter(id=ticket_b.id).update(enqueued_at=timezone.now() - timedelta(minutes=2))

		response = self.client.post(f'/api/v1/tickets/{ticket_a.id}/skip-one-ahead/', {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		waiting_order = list(
			Ticket.objects.filter(queue=queue, status=QueueStatus.WAITING)
			.order_by('enqueued_at', 'id')
			.values_list('id', flat=True)
		)
		self.assertEqual(waiting_order[0], ticket_b.id)
		self.assertEqual(waiting_order[1], ticket_a.id)

	def test_skip_one_ahead_from_called_returns_ticket_to_waiting(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 8')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.CALLED,
			display_number='Q1-0300',
		)

		response = self.client.post(f'/api/v1/tickets/{ticket.id}/skip-one-ahead/', {}, format='json')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		ticket.refresh_from_db()
		self.assertEqual(ticket.status, QueueStatus.WAITING)

	def test_queue_snapshot_marks_not_arrived_after_called_timeout(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 9')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.CALLED,
			display_number='Q1-0400',
		)
		Ticket.objects.filter(id=ticket.id).update(updated_at=timezone.now() - timedelta(minutes=6))

		response = self.client.get(
			f'/api/v1/queues/{queue.id}/snapshot/',
			{'client_id': self.client_obj.device_id},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIsNone(response.data['client_ticket'])
		self.assertTrue(response.data['client_is_not_arrived'])

	def test_invite_next_resets_called_timer_for_old_ticket(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 10')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0500',
		)
		Ticket.objects.filter(id=ticket.id).update(updated_at=timezone.now() - timedelta(minutes=10))

		invite_response = self.client.post(
			f'/api/v1/queues/{queue.id}/invite-next/',
			{},
			**self.operator_headers(),
			format='json',
		)
		self.assertEqual(invite_response.status_code, status.HTTP_200_OK)

		snapshot_response = self.client.get(
			f'/api/v1/queues/{queue.id}/snapshot/',
			{'client_id': self.client_obj.device_id},
			format='json',
		)
		self.assertEqual(snapshot_response.status_code, status.HTTP_200_OK)
		self.assertIsNotNone(snapshot_response.data['client_ticket'])
		self.assertEqual(snapshot_response.data['client_ticket']['status'], QueueStatus.CALLED)
		self.assertFalse(snapshot_response.data['client_is_not_arrived'])
		self.assertGreater(snapshot_response.data['client_called_remaining_seconds'], 250)

	def test_reinvite_after_return_starts_called_timer_from_beginning(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 11')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.CALLED,
			display_number='Q1-0600',
		)
		Ticket.objects.filter(id=ticket.id).update(updated_at=timezone.now() - timedelta(minutes=4))

		append_response = self.client.post(
			f'/api/v1/tickets/{ticket.id}/append-to-queue/',
			{},
			**self.operator_headers(),
			format='json',
		)
		self.assertEqual(append_response.status_code, status.HTTP_200_OK)

		reinvite_response = self.client.post(
			f'/api/v1/tickets/{ticket.id}/invite/',
			{},
			**self.operator_headers(),
			format='json',
		)
		self.assertEqual(reinvite_response.status_code, status.HTTP_200_OK)

		snapshot_response = self.client.get(
			f'/api/v1/queues/{queue.id}/snapshot/',
			{'client_id': self.client_obj.device_id},
			format='json',
		)
		self.assertEqual(snapshot_response.status_code, status.HTTP_200_OK)
		self.assertIsNotNone(snapshot_response.data['client_ticket'])
		self.assertEqual(snapshot_response.data['client_ticket']['status'], QueueStatus.CALLED)
		self.assertGreater(snapshot_response.data['client_called_remaining_seconds'], 250)

	def test_remove_ticket_sets_removed_status_and_snapshot_flag(self):
		queue = Queue.objects.create(branch=self.branch, name='Окно 7')
		ticket = Ticket.objects.create(
			queue=queue,
			client=self.client_obj,
			status=QueueStatus.WAITING,
			display_number='Q1-0200',
		)

		remove_response = self.client.post(
			f'/api/v1/tickets/{ticket.id}/remove/',
			{},
			**self.operator_headers(),
			format='json',
		)
		self.assertEqual(remove_response.status_code, status.HTTP_200_OK)

		snapshot_response = self.client.get(
			f'/api/v1/queues/{queue.id}/snapshot/',
			{'client_id': self.client_obj.device_id},
			format='json',
		)
		self.assertEqual(snapshot_response.status_code, status.HTTP_200_OK)
		self.assertIsNone(snapshot_response.data['client_ticket'])
		self.assertTrue(snapshot_response.data['client_is_removed'])
