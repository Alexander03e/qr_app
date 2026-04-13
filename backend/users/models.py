from django.db import models
from django.utils.translation import gettext_lazy
from django.utils import timezone

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
    preferred_language = models.CharField(max_length=10, default='ru', verbose_name='Предпочитаемый язык')
    company = models.ForeignKey('companies.Company', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Компания')
    branch = models.ForeignKey('companies.Branch', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Филиал')
    assigned_queues = models.ManyToManyField('queues.Queue', blank=True, related_name='assigned_operators', verbose_name='Назначенные очереди')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return str(self.fullname)


class OperatorToken(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='auth_tokens')
    key = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Токен оператора'
        verbose_name_plural = 'Токены операторов'

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()


class AdminToken(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='admin_auth_tokens')
    key = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Токен администратора'
        verbose_name_plural = 'Токены администраторов'

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()