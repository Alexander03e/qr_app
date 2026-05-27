import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed

from users.models import AuthToken, Role, User


TOKEN_TTL_HOURS = 12


def _issue_token(user: User) -> AuthToken:
    now = timezone.now()
    AuthToken.objects.filter(user=user).delete()

    return AuthToken.objects.create(
        user=user,
        key=secrets.token_hex(32),
        expires_at=now + timedelta(hours=TOKEN_TTL_HOURS),
    )


def authenticate_operator(email: str, password: str) -> tuple[AuthToken, User]:
    try:
        user = User.objects.select_related('branch', 'company').get(email=email)
    except User.DoesNotExist as exc:
        raise AuthenticationFailed('Неверный email или пароль.') from exc

    if user.role != Role.OPERATOR:
        raise AuthenticationFailed('Доступ разрешен только оператору.')

    if not user.is_active:
        raise AuthenticationFailed('Пользователь неактивен.')

    if not check_password(password, user.password):
        raise AuthenticationFailed('Неверный email или пароль.')

    token = _issue_token(user)
    return token, user


def authenticate_admin(email: str, password: str) -> tuple[AuthToken, User]:
    try:
        user = User.objects.select_related('branch', 'company').get(email=email)
    except User.DoesNotExist as exc:
        raise AuthenticationFailed('Неверный email или пароль.') from exc

    if user.role != Role.ADMIN:
        raise AuthenticationFailed('Доступ разрешен только администратору.')

    if not user.is_active:
        raise AuthenticationFailed('Пользователь неактивен.')

    if user.company_id is None:
        raise AuthenticationFailed('Администратор должен быть привязан к компании.')

    if not check_password(password, user.password):
        raise AuthenticationFailed('Неверный email или пароль.')

    token = _issue_token(user)
    return token, user


def get_auth_token(raw_token: str | None) -> AuthToken:
    if not raw_token:
        raise AuthenticationFailed('Требуется токен авторизации.')

    try:
        token = AuthToken.objects.select_related('user').get(key=raw_token)
    except AuthToken.DoesNotExist as exc:
        raise AuthenticationFailed('Токен авторизации недействителен.') from exc

    if token.expires_at <= timezone.now():
        token.delete()
        raise AuthenticationFailed('Срок действия токена авторизации истек.')

    if not token.user.is_active:
        raise AuthenticationFailed('Пользователь неактивен.')

    return token


def parse_bearer_token(authorization_header: str | None) -> str | None:
    if not authorization_header:
        return None

    prefix = 'Bearer '
    if not authorization_header.startswith(prefix):
        return None

    return authorization_header[len(prefix):].strip() or None
