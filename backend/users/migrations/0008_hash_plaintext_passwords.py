from django.contrib.auth.hashers import identify_hasher, make_password
from django.db import migrations


def hash_plaintext_passwords(apps, schema_editor):
    User = apps.get_model('users', 'User')

    for user in User.objects.all().only('id', 'password'):
        try:
            identify_hasher(user.password)
        except ValueError:
            user.password = make_password(user.password)
            user.save(update_fields=['password'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_authtoken'),
    ]

    operations = [
        migrations.RunPython(hash_plaintext_passwords, migrations.RunPython.noop),
    ]
