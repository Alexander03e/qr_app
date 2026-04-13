from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Branch, Company
from users.models import OperatorToken, Role, User


class OperatorAuthTests(APITestCase):
	def setUp(self):
		self.company = Company.objects.create(name='Acme', timezone='Europe/Moscow')
		self.branch = Branch.objects.create(
			company=self.company,
			name='Main Branch',
			address='Moscow',
			is_active=True,
			work_schedule_json={'mon': '09:00-18:00'},
		)
		self.operator = User.objects.create(
			fullname='Operator One',
			email='operator-login@example.com',
			password='password123',
			role=Role.OPERATOR,
			is_active=True,
			company=self.company,
			branch=self.branch,
		)

	def test_operator_can_login_with_email_password(self):
		response = self.client.post(
			'/api/v1/auth/operator/login/',
			{'email': 'operator-login@example.com', 'password': 'password123'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('token', response.data)
		self.assertIn('operator', response.data)
		self.assertEqual(response.data['operator']['email'], 'operator-login@example.com')

	def test_operator_me_requires_valid_token(self):
		token = OperatorToken.objects.create(
			user=self.operator,
			key='operator-me-token',
			expires_at=timezone.now() + timedelta(hours=1),
		)

		response = self.client.get(
			'/api/v1/auth/operator/me/',
			HTTP_AUTHORIZATION=f'Bearer {token.key}',
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['operator']['email'], 'operator-login@example.com')

	def test_operator_logout_revokes_token(self):
		token = OperatorToken.objects.create(
			user=self.operator,
			key='operator-logout-token',
			expires_at=timezone.now() + timedelta(hours=1),
		)

		logout_response = self.client.post(
			'/api/v1/auth/operator/logout/',
			HTTP_AUTHORIZATION=f'Bearer {token.key}',
			format='json',
		)
		self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

		me_response = self.client.get(
			'/api/v1/auth/operator/me/',
			HTTP_AUTHORIZATION=f'Bearer {token.key}',
			format='json',
		)
		self.assertEqual(me_response.status_code, status.HTTP_403_FORBIDDEN)
