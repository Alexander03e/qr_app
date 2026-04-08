from collections.abc import Mapping, Sequence

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


DEFAULT_ERROR_MESSAGE = 'An error occurred.'
INTERNAL_ERROR_MESSAGE = 'Internal server error.'


def _extract_messages(detail):
    if detail is None:
        return []

    if isinstance(detail, str):
        return [detail]

    if isinstance(detail, Mapping):
        messages = []
        for value in detail.values():
            messages.extend(_extract_messages(value))
        return messages

    if isinstance(detail, Sequence) and not isinstance(detail, (bytes, bytearray)):
        messages = []
        for item in detail:
            messages.extend(_extract_messages(item))
        return messages

    return [str(detail)]


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    timestamp = timezone.now().isoformat()

    if response is None:
        return Response(
            {
                'message': INTERNAL_ERROR_MESSAGE,
                'timestamp': timestamp,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    messages = _extract_messages(response.data)
    if not messages:
        messages = [DEFAULT_ERROR_MESSAGE]

    response.data = {
        'message': messages[0] if len(messages) == 1 else messages,
        'timestamp': timestamp,
    }
    return response
