from rest_framework.exceptions import NotFound
import secrets

from clients.models import Client


def generate_queue_token() -> str:
    return f'qt_{secrets.token_urlsafe(24)}'


def get_client_by_id(client_id: int) -> Client:
    try:
        return Client.objects.get(pk=client_id)
    except Client.DoesNotExist as exc:
        raise NotFound('Клиент не найден.') from exc


def get_or_create_client_by_identity(client_data: dict, branch_id: str | None = None) -> Client:
    queue_token = client_data.get('queue_token')
    device_id = client_data.get('device_id')
    phone = client_data.get('phone')
    defaults = {
        'name': client_data.get('name'),
        'vk_id': client_data.get('vk_id'),
        'phone': phone,
        'device_id': device_id,
        'preferred_lang': client_data.get('preferred_lang'),
        'send_notification': bool(client_data.get('send_notification', False)),
        'consent_ad': bool(client_data.get('consent_ad', False)),
        'queue_token': queue_token or generate_queue_token(),
    }
    if branch_id is not None:
        defaults['branch_id'] = str(branch_id)

    # Приоритет идентификации: queue_token -> device_id -> phone.
    client = None
    if queue_token:
        client = Client.objects.filter(queue_token=queue_token).first()
        if client is None:
            create_defaults = defaults.copy()
            # В режиме инкогнито/новой сессии queue_token должен создавать нового клиента,
            # даже если на том же устройстве уже есть другой активный клиент с тем же device_id.
            if device_id and Client.objects.filter(device_id=device_id).exists():
                create_defaults['device_id'] = None
            client = Client.objects.create(**create_defaults)
    else:
        if device_id:
            client = Client.objects.filter(device_id=device_id).first()

        if client is None and phone:
            client = Client.objects.filter(phone=phone).first()

        if client is None:
            client = Client.objects.create(**defaults)

    update_fields = []
    if not client.queue_token:
        client.queue_token = queue_token or generate_queue_token()
        update_fields.append('queue_token')

    if not client.device_id and device_id:
        has_other_device_owner = Client.objects.filter(device_id=device_id).exclude(id=client.id).exists()
        if not has_other_device_owner:
            client.device_id = device_id
            update_fields.append('device_id')

    if branch_id is not None and not client.branch_id:
        client.branch_id = str(branch_id)
        update_fields.append('branch_id')

    preferred_lang = client_data.get('preferred_lang')
    if preferred_lang and client.preferred_lang != preferred_lang:
        client.preferred_lang = preferred_lang
        update_fields.append('preferred_lang')

    name = client_data.get('name')
    if name and client.name != name:
        client.name = name
        update_fields.append('name')

    vk_id = client_data.get('vk_id')
    if vk_id and client.vk_id != vk_id:
        client.vk_id = vk_id
        update_fields.append('vk_id')

    if phone and client.phone != phone:
        client.phone = phone
        update_fields.append('phone')

    if update_fields:
        client.save(update_fields=update_fields)

    return client
