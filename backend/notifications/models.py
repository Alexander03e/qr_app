from django.db import models


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
	type = models.CharField(max_length=20, choices=FeedbackType.choices, verbose_name='Тип')
	title = models.CharField(max_length=255, verbose_name='Тема')
	message = models.TextField(verbose_name='Сообщение')
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
