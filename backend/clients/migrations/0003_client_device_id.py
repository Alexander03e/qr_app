from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0002_client_served_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='device_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True, verbose_name='ID устройства'),
        ),
    ]
