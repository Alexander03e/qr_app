from django.db import migrations, models
import django.db.models.deletion


def copy_branch_ids_to_fk(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    Branch = apps.get_model('companies', 'Branch')

    clients = Client.objects.exclude(branch_id__isnull=True).exclude(branch_id='')
    for client in clients:
        try:
            branch_pk = int(client.branch_id)
        except (TypeError, ValueError):
            continue

        if Branch.objects.filter(pk=branch_pk).exists():
            client.branch_ref_id = branch_pk
            client.save(update_fields=['branch_ref'])


def copy_branch_fk_to_ids(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')

    for client in Client.objects.exclude(branch_ref_id__isnull=True):
        client.branch_id = str(client.branch_ref_id)
        client.save(update_fields=['branch_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
        ('clients', '0004_client_queue_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='branch_ref',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                to='companies.branch',
                verbose_name='Филиал',
            ),
        ),
        migrations.RunPython(copy_branch_ids_to_fk, copy_branch_fk_to_ids),
        migrations.RemoveField(
            model_name='client',
            name='branch_id',
        ),
        migrations.RenameField(
            model_name='client',
            old_name='branch_ref',
            new_name='branch',
        ),
        migrations.AlterField(
            model_name='client',
            name='branch',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='clients',
                to='companies.branch',
                verbose_name='Филиал',
            ),
        ),
    ]
