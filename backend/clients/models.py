from django.db import models

# Create your models here.
    
class Client(models.Model):
    name = models.CharField(max_length=255, verbose_name='Имя', null=True, blank=True)
    vk_id = models.CharField(max_length=255, verbose_name='VK ID', null=True, blank=True)
    preferred_lang = models.CharField(max_length=10, verbose_name='Предпочитаемый язык', null=True, blank=True)
    phone = models.CharField(max_length=20, verbose_name='Телефон', null=True, blank=True)
    branch_id = models.CharField(max_length=255, verbose_name='ID филиала', null=True, blank=True) #TODO: потом поменять на ForeignKey
    send_notification = models.BooleanField(default=False, verbose_name='Отправлять уведомления')
    consent_ad = models.BooleanField(default=False, verbose_name='Отправлять рекламу')
    device_id = models.CharField(max_length=255, verbose_name='ID устройства', null=True, blank=True, unique=True)
    queue_token = models.CharField(max_length=64, verbose_name='Queue token', null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    served_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата обслуживания')

    class Meta: 
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'

    def __str__(self):
        return str(self.name)
