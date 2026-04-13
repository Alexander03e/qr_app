from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0003_client_device_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='queue_token',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True, verbose_name='Queue token'),
        ),
    ]
