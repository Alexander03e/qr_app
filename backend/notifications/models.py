from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator


class NotificationEventType(models.TextChoices):
	TICKET_CALLED = 'ticket.called', 'Ticket called'
	TICKET_STATUS_CHANGED = 'ticket.status_changed', 'Ticket status changed'


class NotificationChannelType(models.TextChoices):
	WEB_PUSH = 'WEB_PUSH', 'Web push'
	VK = 'VK', 'VK'


class NotificationDeliveryStatus(models.TextChoices):
	PENDING = 'PENDING', 'Pending'
	SENT = 'SENT', 'Sent'
	FAILED = 'FAILED', 'Failed'
	SKIPPED = 'SKIPPED', 'Skipped'


class FeedbackType(models.TextChoices):
	FEEDBACK = 'FEEDBACK', 'Feedback'
	COMPLAINT = 'COMPLAINT', 'Complaint'


class FeedbackStatus(models.TextChoices):
	NEW = 'NEW', 'New'
	IN_PROGRESS = 'IN_PROGRESS', 'In progress'
	RESOLVED = 'RESOLVED', 'Resolved'


class FeedbackItem(models.Model):
	company = models.ForeignKey(
		'companies.Company',
		on_delete=models.CASCADE,
		related_name='feedback_items',
		verbose_name='Компания',
	)
	branch = models.ForeignKey(
		'companies.Branch',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='feedback_items',
		verbose_name='Филиал',
	)
	queue = models.ForeignKey(
		'queues.Queue',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='feedback_items',
		verbose_name='Очередь',
	)
	ticket = models.ForeignKey(
		'queues.Ticket',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='feedback_items',
		verbose_name='Талон',
	)
	type = models.CharField(max_length=20, choices=FeedbackType.choices, verbose_name='Тип')
	title = models.CharField(max_length=255, verbose_name='Тема')
	message = models.TextField(verbose_name='Сообщение')
	rating = models.PositiveSmallIntegerField(
		null=True,
		blank=True,
		validators=[MinValueValidator(1), MaxValueValidator(5)],
		verbose_name='Оценка обслуживания',
	)
	status = models.CharField(
		max_length=20,
		choices=FeedbackStatus.choices,
		default=FeedbackStatus.NEW,
		verbose_name='Статус',
	)
	resolved_by_user = models.ForeignKey(
		'users.User',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='resolved_feedback_items',
		verbose_name='Кем обработано',
	)
	resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='Время обработки')
	created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
	updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

	class Meta:
		verbose_name = 'Обратная связь'
		verbose_name_plural = 'Обратная связь'
		ordering = ('-created_at',)

	def __str__(self):
		return f'{self.type}:{self.title}'


class ClientNotificationSubscription(models.Model):
	client = models.ForeignKey(
		'clients.Client',
		on_delete=models.CASCADE,
		related_name='notification_subscriptions',
		verbose_name='Клиент',
	)
	queue = models.ForeignKey(
		'queues.Queue',
		on_delete=models.CASCADE,
		related_name='client_notification_subscriptions',
		verbose_name='Очередь',
	)
	channel = models.CharField(
		max_length=20,
		choices=NotificationChannelType.choices,
		verbose_name='Канал',
	)
	endpoint = models.URLField(max_length=1000, null=True, blank=True, verbose_name='Web push endpoint')
	p256dh_key = models.TextField(null=True, blank=True, verbose_name='Web push p256dh')
	auth_key = models.TextField(null=True, blank=True, verbose_name='Web push auth')
	vk_user_id = models.CharField(max_length=64, null=True, blank=True, verbose_name='VK ID')
	user_agent = models.CharField(max_length=500, null=True, blank=True, verbose_name='User agent')
	is_active = models.BooleanField(default=True, verbose_name='Активна')
	created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
	updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

	class Meta:
		verbose_name = 'Подписка на уведомления'
		verbose_name_plural = 'Подписки на уведомления'
		indexes = [
			models.Index(fields=['queue', 'client', 'channel']),
			models.Index(fields=['channel', 'is_active']),
		]

	def __str__(self):
		return f'{self.channel}:{self.client_id}:{self.queue_id}'


class WebhookSubscription(models.Model):
	company = models.ForeignKey(
		'companies.Company',
		on_delete=models.CASCADE,
		related_name='webhook_subscriptions',
		verbose_name='Компания',
	)
	queue = models.ForeignKey(
		'queues.Queue',
		on_delete=models.CASCADE,
		null=True,
		blank=True,
		related_name='webhook_subscriptions',
		verbose_name='Очередь',
	)
	created_by_user = models.ForeignKey(
		'users.User',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='created_webhook_subscriptions',
		verbose_name='Кем создана',
	)
	name = models.CharField(max_length=255, verbose_name='Название')
	target_url = models.URLField(max_length=1000, verbose_name='URL вебхука')
	secret = models.CharField(max_length=255, null=True, blank=True, verbose_name='Секрет подписи')
	event_types = models.JSONField(default=list, blank=True, verbose_name='Типы событий')
	is_active = models.BooleanField(default=True, verbose_name='Активна')
	created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
	updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

	class Meta:
		verbose_name = 'Webhook-подписка'
		verbose_name_plural = 'Webhook-подписки'
		ordering = ('-created_at',)
		indexes = [
			models.Index(fields=['company', 'is_active']),
			models.Index(fields=['queue', 'is_active']),
		]

	def __str__(self):
		return f'{self.name}:{self.target_url}'


class WebhookDelivery(models.Model):
	subscription = models.ForeignKey(
		WebhookSubscription,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='deliveries',
		verbose_name='Webhook-подписка',
	)
	queue = models.ForeignKey(
		'queues.Queue',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='webhook_deliveries',
		verbose_name='Очередь',
	)
	ticket = models.ForeignKey(
		'queues.Ticket',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='webhook_deliveries',
		verbose_name='Талон',
	)
	event_type = models.CharField(max_length=50, choices=NotificationEventType.choices, verbose_name='Тип события')
	status = models.CharField(
		max_length=20,
		choices=NotificationDeliveryStatus.choices,
		default=NotificationDeliveryStatus.PENDING,
		verbose_name='Статус',
	)
	http_status = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='HTTP-статус')
	payload = models.JSONField(default=dict, verbose_name='Payload')
	response_body = models.TextField(null=True, blank=True, verbose_name='Ответ')
	error_message = models.TextField(null=True, blank=True, verbose_name='Ошибка')
	created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
	updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

	class Meta:
		verbose_name = 'Доставка webhook'
		verbose_name_plural = 'Доставки webhook'
		ordering = ('-created_at',)
		indexes = [
			models.Index(fields=['event_type', 'status']),
			models.Index(fields=['queue', 'ticket']),
		]

	def __str__(self):
		return f'{self.event_type}:{self.status}'
