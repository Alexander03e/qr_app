from django.db import models


class QueueStatus(models.TextChoices):
    WAITING = 'WAITING'  # ожидает
    CALLED = 'CALLED'  # вызван
    SKIPPED = 'SKIPPED'  # пропущен
    COMPLETED = 'COMPLETED'  # завершен
    IN_SERVICE = 'IN_SERVICE'  # обслуживается


class Queue(models.Model):
    last_ticket_number = models.PositiveIntegerField(default=0)
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, related_name='queries', verbose_name='Филиал')
    name = models.CharField(max_length=255, verbose_name='Название очереди')
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
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата завершения')

    class Meta:
        verbose_name = 'Талон'
        verbose_name_plural = 'Талоны'

    def __str__(self):
        return f'{self.display_number}.{self.status}'

