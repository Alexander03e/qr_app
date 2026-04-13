from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from companies.models import Branch, Company
from users.models import Role, User


class Command(BaseCommand):
    help = 'Create or update operator user for local/dev environments.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Operator email (unique).')
        parser.add_argument('--password', required=True, help='Operator password.')
        parser.add_argument('--fullname', default='Operator Seed', help='Operator full name.')
        parser.add_argument('--company-id', type=int, dest='company_id', help='Company id for operator.')
        parser.add_argument('--branch-id', type=int, dest='branch_id', help='Branch id for operator.')
        parser.add_argument('--inactive', action='store_true', help='Create operator as inactive.')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        fullname = options['fullname']
        company_id = options.get('company_id')
        branch_id = options.get('branch_id')
        is_active = not options['inactive']

        company = None
        if company_id is not None:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist as exc:
                raise CommandError(f'Company not found: {company_id}') from exc

        branch = None
        if branch_id is not None:
            try:
                branch = Branch.objects.select_related('company').get(id=branch_id)
            except Branch.DoesNotExist as exc:
                raise CommandError(f'Branch not found: {branch_id}') from exc

            if company is not None and branch.company_id != company.id:
                raise CommandError(
                    'Branch does not belong to provided company. '
                    f'branch.company_id={branch.company_id}, company_id={company.id}'
                )

            company = branch.company

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'fullname': fullname,
                'password': make_password(password),
                'role': Role.OPERATOR,
                'is_active': is_active,
                'company': company,
                'branch': branch,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Operator created: {email} (id={user.id})'))
            return

        user.fullname = fullname
        user.password = make_password(password)
        user.role = Role.OPERATOR
        user.is_active = is_active
        user.company = company
        user.branch = branch
        user.save(update_fields=['fullname', 'password', 'role', 'is_active', 'company', 'branch'])

        self.stdout.write(self.style.SUCCESS(f'Operator updated: {email} (id={user.id})'))
