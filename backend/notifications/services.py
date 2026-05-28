import hashlib
import hmac
import json
import logging
import random
from urllib import parse, request
from urllib.error import URLError
from pywebpush import WebPushException, webpush

from django.conf import settings
from django.core import signing
from django.db.models import Q
from django.urls import reverse
from rest_framework.exceptions import NotFound, ValidationError

from clients.models import Client
from core.metrics import NOTIFICATION_DELIVERIES_TOTAL
from notifications.models import (
    ClientNotificationSubscription,
    FeedbackItem,
    FeedbackStatus,
    FeedbackType,
    NotificationChannelType,
    NotificationDeliveryStatus,
    NotificationEventType,
    WebhookDelivery,
    WebhookSubscription,
)
from queues.models import Queue, QueueStatus, Ticket


logger = logging.getLogger(__name__)
WEBHOOK_TIMEOUT_SECONDS = 5
VK_TIMEOUT_SECONDS = 5
VK_OAUTH_STATE_SALT = 'notifications.vk.oauth'
VK_OAUTH_AUTHORIZE_URL = 'https://oauth.vk.com/authorize'
VK_OAUTH_ACCESS_TOKEN_URL = 'https://oauth.vk.com/access_token'


def get_queue_for_client_feedback(queue_id: int) -> Queue:
    try:
        return Queue.objects.select_related('branch', 'branch__company').get(pk=queue_id)
    except Queue.DoesNotExist as exc:
        raise NotFound('Очередь не найдена.') from exc


def resolve_feedback_title(feedback_type: str, title: str | None) -> str:
    if title:
        return title

    if feedback_type == FeedbackType.COMPLAINT:
        return 'Жалоба клиента'

    return 'Отзыв клиента'


def create_client_feedback(
    *,
    queue_id: int,
    ticket_id: int | None = None,
    feedback_type: str,
    title: str | None,
    message: str,
    rating: int | None = None,
) -> FeedbackItem:
    queue = get_queue_for_client_feedback(queue_id=queue_id)

    if queue.branch is None or queue.branch.company_id is None:
        raise ValidationError({'queue_id': ['Очередь не привязана к филиалу компании.']})

    ticket = None
    if ticket_id is not None:
        ticket = Ticket.objects.filter(id=ticket_id, queue_id=queue.id).first()
        if ticket is None:
            raise ValidationError({'ticket_id': ['Талон не найден в выбранной очереди.']})

    return FeedbackItem.objects.create(
        company_id=queue.branch.company_id,
        branch_id=queue.branch_id,
        queue_id=queue.id,
        ticket_id=ticket.id if ticket else None,
        type=feedback_type,
        title=resolve_feedback_title(feedback_type=feedback_type, title=title),
        message=message,
        rating=rating,
        status=FeedbackStatus.NEW,
    )


def get_queue_for_notification(queue_id: int) -> Queue:
    try:
        return Queue.objects.select_related('branch', 'branch__company').get(pk=queue_id)
    except Queue.DoesNotExist as exc:
        raise NotFound('Очередь не найдена.') from exc


def resolve_notification_client(
    *,
    queue_id: int,
    client_id: str | None = None,
    ticket_id: int | None = None,
) -> Client:
    if ticket_id is not None:
        ticket = Ticket.objects.select_related('client').filter(id=ticket_id, queue_id=queue_id).first()
        if ticket is None:
            raise ValidationError({'ticket_id': ['Талон не найден в выбранной очереди.']})
        return ticket.client

    if not client_id:
        raise ValidationError({'client_id': ['Передайте client_id или ticket_id.']})

    if str(client_id).isdigit():
        client = Client.objects.filter(pk=int(client_id)).first()
        if client is not None:
            return client

    client = Client.objects.filter(Q(device_id=client_id) | Q(queue_token=client_id)).first()
    if client is None:
        raise NotFound('Клиент не найден.')

    return client


def subscribe_web_push(
    *,
    queue_id: int,
    client_id: str | None,
    ticket_id: int | None,
    subscription: dict,
    user_agent: str | None = None,
) -> ClientNotificationSubscription:
    queue = get_queue_for_notification(queue_id=queue_id)
    client = resolve_notification_client(
        queue_id=queue.id,
        client_id=client_id,
        ticket_id=ticket_id,
    )
    keys = subscription.get('keys') or {}
    endpoint = subscription.get('endpoint')
    p256dh_key = keys.get('p256dh')
    auth_key = keys.get('auth')

    if not endpoint or not p256dh_key or not auth_key:
        raise ValidationError({'subscription': ['Передана неполная web-push подписка.']})

    notification_subscription, _ = ClientNotificationSubscription.objects.update_or_create(
        queue=queue,
        client=client,
        channel=NotificationChannelType.WEB_PUSH,
        endpoint=endpoint,
        defaults={
            'p256dh_key': p256dh_key,
            'auth_key': auth_key,
            'user_agent': user_agent,
            'is_active': True,
        },
    )
    return notification_subscription


def subscribe_vk(
    *,
    queue_id: int,
    client_id: str | None,
    ticket_id: int | None,
    vk_id: str,
) -> ClientNotificationSubscription:
    queue = get_queue_for_notification(queue_id=queue_id)
    client = resolve_notification_client(
        queue_id=queue.id,
        client_id=client_id,
        ticket_id=ticket_id,
    )

    update_fields = []
    if client.vk_id != vk_id:
        client.vk_id = vk_id
        update_fields.append('vk_id')
    if not client.send_notification:
        client.send_notification = True
        update_fields.append('send_notification')
    if update_fields:
        client.save(update_fields=update_fields)

    notification_subscription, _ = ClientNotificationSubscription.objects.update_or_create(
        queue=queue,
        client=client,
        channel=NotificationChannelType.VK,
        vk_user_id=vk_id,
        defaults={'is_active': True},
    )
    return notification_subscription


def is_vk_oauth_configured() -> bool:
    return bool(getattr(settings, 'VK_OAUTH_CLIENT_ID', '') and getattr(settings, 'VK_OAUTH_CLIENT_SECRET', ''))


def get_vk_oauth_redirect_uri(django_request=None) -> str:
    configured_redirect_uri = getattr(settings, 'VK_OAUTH_REDIRECT_URI', '')
    if configured_redirect_uri:
        return configured_redirect_uri

    if django_request is None:
        raise ValidationError({'vk_oauth': ['VK_OAUTH_REDIRECT_URI не настроен.']})

    return django_request.build_absolute_uri(reverse('vk-oauth-callback'))


def make_vk_oauth_state(
    *,
    queue_id: int,
    client_id: str | None,
    ticket_id: int | None,
) -> str:
    return signing.dumps(
        {
            'queue_id': queue_id,
            'client_id': client_id,
            'ticket_id': ticket_id,
        },
        salt=VK_OAUTH_STATE_SALT,
    )


def read_vk_oauth_state(state: str) -> dict:
    max_age_seconds = getattr(settings, 'VK_OAUTH_STATE_MAX_AGE_SECONDS', 900)
    try:
        return signing.loads(state, salt=VK_OAUTH_STATE_SALT, max_age=max_age_seconds)
    except signing.SignatureExpired as exc:
        raise ValidationError({'state': ['Срок действия подключения VK истек.']}) from exc
    except signing.BadSignature as exc:
        raise ValidationError({'state': ['Некорректный state подключения VK.']}) from exc


def build_vk_oauth_authorize_url(
    *,
    queue_id: int,
    client_id: str | None,
    ticket_id: int | None,
    django_request=None,
) -> str:
    if not is_vk_oauth_configured():
        raise ValidationError({'vk_oauth': ['VK OAuth не настроен на сервере.']})

    redirect_uri = get_vk_oauth_redirect_uri(django_request=django_request)
    state = make_vk_oauth_state(queue_id=queue_id, client_id=client_id, ticket_id=ticket_id)
    params = {
        'client_id': getattr(settings, 'VK_OAUTH_CLIENT_ID', ''),
        'display': 'page',
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'state': state,
        'v': getattr(settings, 'VK_API_VERSION', '5.199'),
    }
    return f'{VK_OAUTH_AUTHORIZE_URL}?{parse.urlencode(params)}'


def exchange_vk_oauth_code(*, code: str, redirect_uri: str) -> dict:
    params = parse.urlencode(
        {
            'client_id': getattr(settings, 'VK_OAUTH_CLIENT_ID', ''),
            'client_secret': getattr(settings, 'VK_OAUTH_CLIENT_SECRET', ''),
            'redirect_uri': redirect_uri,
            'code': code,
        }
    )
    token_request = f'{VK_OAUTH_ACCESS_TOKEN_URL}?{params}'

    try:
        with request.urlopen(token_request, timeout=VK_TIMEOUT_SECONDS) as response:
            response_payload = json.loads(response.read().decode('utf-8'))
    except (URLError, TimeoutError, ValueError) as exc:
        raise ValidationError({'vk_oauth': ['Не удалось получить ответ VK OAuth.']}) from exc

    if response_payload.get('error'):
        error_description = response_payload.get('error_description') or response_payload.get('error')
        raise ValidationError({'vk_oauth': [str(error_description)]})

    if not response_payload.get('user_id'):
        raise ValidationError({'vk_oauth': ['VK не вернул идентификатор пользователя.']})

    return response_payload


def complete_vk_oauth_subscription(
    *,
    code: str,
    state: str,
    django_request=None,
) -> ClientNotificationSubscription:
    state_payload = read_vk_oauth_state(state)
    redirect_uri = get_vk_oauth_redirect_uri(django_request=django_request)
    token_payload = exchange_vk_oauth_code(code=code, redirect_uri=redirect_uri)
    return subscribe_vk(
        queue_id=int(state_payload['queue_id']),
        client_id=state_payload.get('client_id'),
        ticket_id=state_payload.get('ticket_id'),
        vk_id=str(token_payload['user_id']),
    )


def get_client_notification_status(
    *,
    queue_id: int,
    client_id: str | None,
    ticket_id: int | None = None,
) -> dict:
    queue = get_queue_for_notification(queue_id=queue_id)
    client = resolve_notification_client(
        queue_id=queue.id,
        client_id=client_id,
        ticket_id=ticket_id,
    )
    subscriptions = list(
        ClientNotificationSubscription.objects.filter(
            queue=queue,
            client=client,
            is_active=True,
        ).order_by('channel', '-updated_at')
    )

    return {
        'web_push_enabled': any(item.channel == NotificationChannelType.WEB_PUSH for item in subscriptions),
        'vk_enabled': any(item.channel == NotificationChannelType.VK for item in subscriptions),
        'subscriptions': subscriptions,
    }


def build_ticket_status_changed_payload(
    *,
    ticket: Ticket,
    previous_status: str,
    new_status: str,
) -> dict:
    queue = ticket.queue
    queue_url = queue.queue_url or ''
    return {
        'event': NotificationEventType.TICKET_STATUS_CHANGED,
        'ticket': {
            'id': ticket.id,
            'display_number': ticket.display_number,
            'status': ticket.status,
            'queue_id': queue.id,
            'queue_name': queue.name,
            'client_id': ticket.client_id,
            'called_at': ticket.called_at.isoformat() if ticket.called_at else None,
        },
        'queue': {
            'id': queue.id,
            'name': queue.name,
            'url': queue_url,
        },
        'client': {
            'id': ticket.client_id,
        },
        'status_change': {
            'previous_status': previous_status,
            'new_status': new_status,
        },
        'notification': {
            'title': 'Ваша очередь',
            'body': f'Статус талона {ticket.display_number} изменен: {previous_status} -> {new_status}.',
            'url': queue_url,
        },
    }


def build_ticket_called_payload(ticket: Ticket) -> dict:
    payload = build_ticket_status_changed_payload(
        ticket=ticket,
        previous_status=NotificationEventType.TICKET_CALLED.value,
        new_status=ticket.status,
    )
    payload['event'] = NotificationEventType.TICKET_CALLED
    payload['status_change'] = None
    payload['notification']['body'] = f'Талон {ticket.display_number} вызван.'
    return payload


def log_notification_delivery(
    *,
    subscription: ClientNotificationSubscription,
    ticket: Ticket,
    status: NotificationDeliveryStatus,
    error_message: str | None = None,
) -> None:
    NOTIFICATION_DELIVERIES_TOTAL.labels(
        channel=subscription.channel,
        event_type=NotificationEventType.TICKET_CALLED.value,
        status=status.value,
    ).inc()

    log_method = logger.info if status == NotificationDeliveryStatus.SENT else logger.warning
    log_method(
        'Client notification delivery result. status=%s channel=%s queue_id=%s ticket_id=%s subscription_id=%s error=%s',
        status,
        subscription.channel,
        ticket.queue_id,
        ticket.id,
        subscription.id,
        error_message,
    )


def send_web_push_notification(
    *,
    subscription: ClientNotificationSubscription,
    ticket: Ticket,
    payload: dict,
) -> None:
    vapid_private_key = getattr(settings, 'WEB_PUSH_VAPID_PRIVATE_KEY', '')
    vapid_subject = getattr(settings, 'WEB_PUSH_VAPID_SUBJECT', '')

    if not vapid_private_key or not vapid_subject:
        log_notification_delivery(
            subscription=subscription,
            ticket=ticket,
            status=NotificationDeliveryStatus.SKIPPED,
            error_message='WEB_PUSH_VAPID_PRIVATE_KEY или WEB_PUSH_VAPID_SUBJECT не настроены.',
        )
        return

    subscription_info = {
        'endpoint': subscription.endpoint,
        'keys': {
            'p256dh': subscription.p256dh_key,
            'auth': subscription.auth_key,
        },
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=vapid_private_key,
            vapid_claims={'sub': vapid_subject},
        )
    except WebPushException as exc:
        log_notification_delivery(
            subscription=subscription,
            ticket=ticket,
            status=NotificationDeliveryStatus.FAILED,
            error_message=str(exc),
        )
        return
    except Exception as exc:
        logger.exception('Unexpected web-push error. subscription_id=%s', subscription.id)
        log_notification_delivery(
            subscription=subscription,
            ticket=ticket,
            status=NotificationDeliveryStatus.FAILED,
            error_message=str(exc),
        )
        return

    log_notification_delivery(
        subscription=subscription,
        ticket=ticket,
        status=NotificationDeliveryStatus.SENT,
    )


def build_vk_message(payload: dict) -> str:
    ticket = payload['ticket']
    queue = payload['queue']
    return f'Ваша очередь: талон {ticket["display_number"]} вызван в очереди "{queue["name"]}".'


def send_vk_notification(
    *,
    subscription: ClientNotificationSubscription,
    ticket: Ticket,
    payload: dict,
) -> None:
    vk_token = getattr(settings, 'VK_BOT_ACCESS_TOKEN', '')
    vk_api_version = getattr(settings, 'VK_API_VERSION', '5.199')

    if not vk_token:
        log_notification_delivery(
            subscription=subscription,
            ticket=ticket,
            status=NotificationDeliveryStatus.SKIPPED,
            error_message='VK_BOT_ACCESS_TOKEN не настроен.',
        )
        return

    body = parse.urlencode(
        {
            'access_token': vk_token,
            'v': vk_api_version,
            'user_id': subscription.vk_user_id,
            'random_id': random.randint(1, 2147483647),
            'message': build_vk_message(payload),
        }
    ).encode('utf-8')
    vk_request = request.Request(
        'https://api.vk.com/method/messages.send',
        data=body,
        headers={'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
        method='POST',
    )

    try:
        with request.urlopen(vk_request, timeout=VK_TIMEOUT_SECONDS) as response:
            response_payload = json.loads(response.read().decode('utf-8'))
    except (URLError, TimeoutError, ValueError) as exc:
        log_notification_delivery(
            subscription=subscription,
            ticket=ticket,
            status=NotificationDeliveryStatus.FAILED,
            error_message=str(exc),
        )
        return

    if response_payload.get('error'):
        log_notification_delivery(
            subscription=subscription,
            ticket=ticket,
            status=NotificationDeliveryStatus.FAILED,
            error_message=json.dumps(response_payload['error'], ensure_ascii=False),
        )
        return

    log_notification_delivery(
        subscription=subscription,
        ticket=ticket,
        status=NotificationDeliveryStatus.SENT,
    )


def make_webhook_signature(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()
    return f'sha256={digest}'


def send_webhook_event(
    *,
    webhook_subscription: WebhookSubscription,
    ticket: Ticket,
    payload: dict,
    event_type: NotificationEventType = NotificationEventType.TICKET_CALLED,
) -> WebhookDelivery:
    delivery = WebhookDelivery.objects.create(
        subscription=webhook_subscription,
        queue_id=ticket.queue_id,
        ticket_id=ticket.id,
        event_type=event_type,
        payload=payload,
    )
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    if webhook_subscription.secret:
        headers['X-QueueFlow-Signature'] = make_webhook_signature(webhook_subscription.secret, body)

    webhook_request = request.Request(
        webhook_subscription.target_url,
        data=body,
        headers=headers,
        method='POST',
    )

    try:
        with request.urlopen(webhook_request, timeout=WEBHOOK_TIMEOUT_SECONDS) as response:
            response_body = response.read().decode('utf-8')[:2000]
            delivery.http_status = response.status
            delivery.response_body = response_body
            delivery.status = (
                NotificationDeliveryStatus.SENT
                if 200 <= response.status < 300
                else NotificationDeliveryStatus.FAILED
            )
    except (URLError, TimeoutError) as exc:
        delivery.status = NotificationDeliveryStatus.FAILED
        delivery.error_message = str(exc)

    delivery.save(update_fields=['http_status', 'response_body', 'status', 'error_message', 'updated_at'])
    return delivery


def get_webhook_subscriptions_for_ticket(ticket: Ticket):
    queue = ticket.queue
    if queue.branch_id is None or queue.branch.company_id is None:
        return WebhookSubscription.objects.none()

    return WebhookSubscription.objects.filter(
        company_id=queue.branch.company_id,
        is_active=True,
    ).filter(
        Q(queue_id__isnull=True) | Q(queue_id=queue.id)
    )


def get_ticket_for_notification(ticket_id: int) -> Ticket | None:
    ticket = (
        Ticket.objects
        .select_related('queue', 'queue__branch', 'client')
        .filter(pk=ticket_id)
        .first()
    )
    return ticket


def notify_client_ticket_called(ticket: Ticket, payload: dict) -> None:
    subscriptions = ClientNotificationSubscription.objects.filter(
        queue_id=ticket.queue_id,
        client_id=ticket.client_id,
        is_active=True,
    )

    for subscription in subscriptions:
        if subscription.channel == NotificationChannelType.WEB_PUSH:
            send_web_push_notification(subscription=subscription, ticket=ticket, payload=payload)
        elif subscription.channel == NotificationChannelType.VK:
            send_vk_notification(subscription=subscription, ticket=ticket, payload=payload)


def notify_webhook_subscriptions(
    *,
    ticket: Ticket,
    event_type: NotificationEventType,
    payload: dict,
) -> None:
    for webhook_subscription in get_webhook_subscriptions_for_ticket(ticket):
        event_types = webhook_subscription.event_types or []
        if event_types and event_type not in event_types:
            continue
        send_webhook_event(
            webhook_subscription=webhook_subscription,
            ticket=ticket,
            payload=payload,
            event_type=event_type,
        )


def notify_legacy_ticket_called_webhook_subscriptions(ticket: Ticket) -> None:
    payload = build_ticket_called_payload(ticket)
    for webhook_subscription in get_webhook_subscriptions_for_ticket(ticket):
        event_types = webhook_subscription.event_types or []
        if (
            NotificationEventType.TICKET_CALLED not in event_types
            or NotificationEventType.TICKET_STATUS_CHANGED in event_types
        ):
            continue
        send_webhook_event(
            webhook_subscription=webhook_subscription,
            ticket=ticket,
            payload=payload,
            event_type=NotificationEventType.TICKET_CALLED,
        )


def notify_ticket_status_changed(
    *,
    ticket_id: int,
    previous_status: str,
    new_status: str,
) -> None:
    if previous_status == new_status:
        return

    ticket = get_ticket_for_notification(ticket_id)
    if ticket is None:
        return

    webhook_payload = build_ticket_status_changed_payload(
        ticket=ticket,
        previous_status=previous_status,
        new_status=new_status,
    )
    notify_webhook_subscriptions(
        ticket=ticket,
        event_type=NotificationEventType.TICKET_STATUS_CHANGED,
        payload=webhook_payload,
    )

    if new_status == QueueStatus.CALLED:
        notify_client_ticket_called(ticket=ticket, payload=build_ticket_called_payload(ticket))
        notify_legacy_ticket_called_webhook_subscriptions(ticket)


def notify_ticket_called(ticket_id: int) -> None:
    ticket = get_ticket_for_notification(ticket_id)
    if ticket is None:
        return

    payload = build_ticket_called_payload(ticket)
    notify_client_ticket_called(ticket=ticket, payload=payload)
    notify_webhook_subscriptions(
        ticket=ticket,
        event_type=NotificationEventType.TICKET_CALLED,
        payload=payload,
    )
