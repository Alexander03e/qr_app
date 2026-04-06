from rest_framework.exceptions import NotFound, ValidationError

from clients.models import Client


def get_client_by_id(client_id: int) -> Client:
    try:
        return Client.objects.get(pk=client_id)
    except Client.DoesNotExist as exc:
        raise NotFound('Клиент не найден.') from exc


def get_or_create_client_by_identity(client_data: dict, branch_id: str | None = None) -> Client:
    phone = client_data.get('phone')
    vk_id = client_data.get('vk_id')

    lookup = {'phone': phone} if phone else {'vk_id': vk_id}
    defaults = {
        'name': client_data.get('name'),
        'vk_id': vk_id,
        'phone': phone,
        'preferred_lang': client_data.get('preferred_lang'),
        'send_notification': bool(client_data.get('send_notification', False)),
        'consent_ad': bool(client_data.get('consent_ad', False)),
    }
    if branch_id is not None:
        defaults['branch_id'] = str(branch_id)

    client, _ = Client.objects.get_or_create(**lookup, defaults=defaults)

    if branch_id is not None and not client.branch_id:
        client.branch_id = str(branch_id)
        client.save(update_fields=['branch_id'])

    return client
