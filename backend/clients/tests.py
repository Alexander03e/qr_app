from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from companies.models import Branch, Company
from queues.models import Queue, QueueStatus, Ticket
from users.models import AuthToken, Role, User


class ClientApiTests(APITestCase):
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
            email='admin-clients@example.com',
            password='secret123',
            role=Role.ADMIN,
            company=self.company,
        )
        self.admin_token = AuthToken.objects.create(
            user=self.admin,
            key='clients-admin-token',
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.operator = User.objects.create(
            fullname='Operator One',
            email='operator-clients@example.com',
            password='secret123',
            role=Role.OPERATOR,
            company=self.company,
            branch=self.branch,
        )
        self.operator_token = AuthToken.objects.create(
            user=self.operator,
            key='clients-operator-token',
            expires_at=timezone.now() + timedelta(hours=1),
        )

    def admin_headers(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.admin_token.key}'}

    def operator_headers(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.operator_token.key}'}

    def test_client_has_branch_foreign_key(self):
        client = Client.objects.create(name='Ivan', branch=self.branch)

        self.assertEqual(client.branch_id, self.branch.id)
        self.assertEqual(client.branch.company_id, self.company.id)

    def test_clients_crud_requires_staff_token(self):
        response = self.client.get('/api/v1/clients/', format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_sees_company_clients(self):
        client = Client.objects.create(name='Ivan', branch=self.branch)

        response = self.client.get(
            '/api/v1/clients/',
            **self.admin_headers(),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['id'], client.id)
        self.assertEqual(response.data[0]['branch'], self.branch.id)

    def test_operator_sees_assigned_queue_clients(self):
        queue = Queue.objects.create(branch=self.branch, name='Касса 1')
        self.operator.assigned_queues.add(queue)
        client = Client.objects.create(name='Ivan', branch=self.branch)
        Ticket.objects.create(
            queue=queue,
            client=client,
            status=QueueStatus.WAITING,
            display_number='Q1-0001',
        )

        response = self.client.get(
            '/api/v1/clients/',
            **self.operator_headers(),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['id'], client.id)
