from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('queues', '0006_alter_ticket_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='initial_ticket_number',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Изначальный номер в очереди'),
        ),
    ]
