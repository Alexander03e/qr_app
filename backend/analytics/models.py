from django.db import models


class ApiRequestLog(models.Model):
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_request_logs',
        verbose_name='Компания',
    )
    branch = models.ForeignKey(
        'companies.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_request_logs',
        verbose_name='Филиал',
    )
    queue = models.ForeignKey(
        'queues.Queue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_request_logs',
        verbose_name='Очередь',
    )
    operator = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='api_request_logs',
        verbose_name='Оператор',
    )
    method = models.CharField(max_length=10, verbose_name='HTTP метод')
    endpoint = models.CharField(max_length=255, verbose_name='Endpoint')
    status_code = models.PositiveSmallIntegerField(verbose_name='HTTP статус')
    latency_ms = models.FloatField(default=0.0, verbose_name='Задержка, мс')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата запроса')

    class Meta:
        verbose_name = 'Журнал API-запроса'
        verbose_name_plural = 'Журнал API-запросов'
        indexes = [
            models.Index(fields=['company', 'created_at'], name='api_log_company_created_idx'),
            models.Index(fields=['branch', 'created_at'], name='api_log_branch_created_idx'),
            models.Index(fields=['queue', 'created_at'], name='api_log_queue_created_idx'),
            models.Index(fields=['operator', 'created_at'], name='api_log_operator_created_idx'),
            models.Index(fields=['status_code', 'created_at'], name='api_log_status_created_idx'),
        ]

    def __str__(self):
        return f'{self.method} {self.endpoint} {self.status_code}'
