from django.db import models
from django.utils import timezone


class QueueStatus(models.TextChoices):
    WAITING = 'WAITING'  # ожидает
    CALLED = 'CALLED'  # вызван
    SKIPPED = 'SKIPPED'  # пропущен
    COMPLETED = 'COMPLETED'  # завершен
    IN_SERVICE = 'IN_SERVICE'  # обслуживается
    LEFT = 'LEFT'  # ушел
    NOT_ARRIVED = 'NOT_ARRIVED'  # не пришел
    REMOVED = 'REMOVED'  # удален оператором


class Queue(models.Model):
    last_ticket_number = models.PositiveIntegerField(default=0)
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, null=True, related_name='queries', verbose_name='Филиал')
    name = models.CharField(max_length=255, verbose_name='Название очереди')
    notification_options = models.JSONField(default=dict, null=True, blank=True, verbose_name='Настройки уведомлений')
    clients_limit = models.PositiveIntegerField(null=True, blank=True, verbose_name='Лимит клиентов в очереди')

    queue_url = models.CharField(max_length=255, verbose_name='Ссылка на очередь', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Очередь'
        verbose_name_plural = 'Очереди'

    def __str__(self):
        return str(self.name)

class Ticket(models.Model):
    queue = models.ForeignKey(Queue, on_delete=models.CASCADE, related_name='tickets', verbose_name='Очередь')
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, verbose_name='Клиент')
    status = models.CharField(max_length=20, choices=QueueStatus.choices, default=QueueStatus.WAITING, verbose_name='Статус')
    display_number = models.CharField(max_length=20, verbose_name='Показанный номер')
    initial_ticket_number = models.PositiveIntegerField(null=True, blank=True, verbose_name='Изначальный номер в очереди')
    enqueued_at = models.DateTimeField(default=timezone.now, verbose_name='Время постановки в очередь')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата завершения')

    class Meta:
        verbose_name = 'Талон'
        verbose_name_plural = 'Талоны'

    def __str__(self):
        return f'{self.display_number}.{self.status}'

