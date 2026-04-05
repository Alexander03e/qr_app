from django.db import models

# Create your models here.
class Company(models.Model):
    name = models.CharField(max_length=255, verbose_name='Название компании')
    timezone = models.CharField(max_length=50, verbose_name='Часовой пояс')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Компания'
        verbose_name_plural = 'Компании'

    def __str__(self):
        return str(self.name)

class Branch(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='branches', verbose_name='Филиал')
    name = models.CharField(max_length=255, verbose_name='Название филиала')
    address = models.CharField(max_length=255, verbose_name='Адрес филиала')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    work_schedule_json = models.JSONField(verbose_name='Рабочее расписание')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Филиал'
        verbose_name_plural = 'Филиалы'

    def __str__(self):
        return str(self.name)