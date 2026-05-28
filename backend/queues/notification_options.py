SUPPORTED_NOTIFICATION_CHANNELS = ('vk', 'webpush')
WEB_PUSH_NOTIFICATION_CHANNEL = 'webpush'
VK_NOTIFICATION_CHANNEL = 'vk'


def normalize_queue_notification_options(options) -> dict:
    if not isinstance(options, dict):
        return {'channels': []}

    channels = options.get('channels')
    if not isinstance(channels, list):
        return {'channels': []}

    normalized_channels = []
    for channel in channels:
        if (
            channel in SUPPORTED_NOTIFICATION_CHANNELS
            and channel not in normalized_channels
        ):
            normalized_channels.append(channel)

    return {'channels': normalized_channels}


def is_queue_notification_channel_enabled(queue, channel: str) -> bool:
    channels = normalize_queue_notification_options(queue.notification_options).get(
        'channels',
        [],
    )
    return channel in channels
