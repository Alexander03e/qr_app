from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from companies.models import Company
from users.models import Role, User


class Command(BaseCommand):
    help = 'Create or update admin user for local/dev environments.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Admin email (unique).')
        parser.add_argument('--password', required=True, help='Admin password.')
        parser.add_argument('--fullname', default='Admin Seed', help='Admin full name.')
        parser.add_argument(
            '--company-id',
            type=int,
            dest='company_id',
            required=True,
            help='Company id for admin (required in SaaS mode).',
        )
        parser.add_argument('--inactive', action='store_true', help='Create admin as inactive.')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        fullname = options['fullname']
        company_id = options['company_id']
        is_active = not options['inactive']

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist as exc:
            raise CommandError(f'Company not found: {company_id}') from exc

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'fullname': fullname,
                'password': make_password(password),
                'role': Role.ADMIN,
                'is_active': is_active,
                'company': company,
                'branch': None,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Admin created: {email} (id={user.id})'))
            return

        user.fullname = fullname
        user.password = make_password(password)
        user.role = Role.ADMIN
        user.is_active = is_active
        user.company = company
        user.branch = None
        user.save(update_fields=['fullname', 'password', 'role', 'is_active', 'company', 'branch'])

        self.stdout.write(self.style.SUCCESS(f'Admin updated: {email} (id={user.id})'))
