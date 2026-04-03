from django.db import models
from django.utils.translation import gettext_lazy

class Role(models.TextChoices):
    ADMIN = 'AD', gettext_lazy('Admin')
    OPERATOR = 'OPR', gettext_lazy('Operator')


# Create your models here.
class User(models.Model):
    fullname = models.CharField(max_length=255, verbose_name='Полное имя')
    email = models.EmailField(unique=True, verbose_name='Email')
    password = models.CharField(max_length=128, verbose_name='Пароль')
    role = models.CharField(max_length=3, choices=Role.choices, verbose_name='Роль')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    branch_id = models.CharField(max_length=255, verbose_name='ID филиала', null=True, blank=True) #TODO: потом поменять на ForeignKey
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return str(self.fullname)
    
class Client(models.Model):
    name = models.CharField(max_length=255, verbose_name='Имя', null=True, blank=True)
    vk_id = models.CharField(max_length=255, verbose_name='VK ID', null=True, blank=True)
    preferred_lang = models.CharField(max_length=10, verbose_name='Предпочитаемый язык', null=True, blank=True)
    phone = models.CharField(max_length=20, verbose_name='Телефон', null=True, blank=True)
    branch_id = models.CharField(max_length=255, verbose_name='ID филиала', null=True, blank=True) #TODO: потом поменять на ForeignKey
    send_notification = models.BooleanField(default=False, verbose_name='Отправлять уведомления')
    consent_ad = models.BooleanField(default=False, verbose_name='Отправлять рекламу')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta: 
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'

    def __str__(self):
        return str(self.name)
