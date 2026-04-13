import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed

from users.models import AdminToken, OperatorToken, Role, User


TOKEN_TTL_HOURS = 12


def _issue_operator_token(user: User) -> OperatorToken:
    now = timezone.now()
    OperatorToken.objects.filter(user=user).delete()

    return OperatorToken.objects.create(
        user=user,
        key=secrets.token_hex(32),
        expires_at=now + timedelta(hours=TOKEN_TTL_HOURS),
    )


def _issue_admin_token(user: User) -> AdminToken:
    now = timezone.now()
    AdminToken.objects.filter(user=user).delete()

    return AdminToken.objects.create(
        user=user,
        key=secrets.token_hex(32),
        expires_at=now + timedelta(hours=TOKEN_TTL_HOURS),
    )


def authenticate_operator(email: str, password: str) -> tuple[OperatorToken, User]:
    try:
        user = User.objects.select_related('branch', 'company').get(email=email)
    except User.DoesNotExist as exc:
        raise AuthenticationFailed('Неверный email или пароль.') from exc

    if user.role != Role.OPERATOR:
        raise AuthenticationFailed('Доступ разрешен только оператору.')

    if not user.is_active:
        raise AuthenticationFailed('Пользователь неактивен.')

    is_hashed = user.password.startswith('pbkdf2_')
    is_valid_password = check_password(password, user.password) if is_hashed else user.password == password
    if not is_valid_password:
        raise AuthenticationFailed('Неверный email или пароль.')

    # Мягкая миграция старых пользователей с plaintext-паролем.
    if not is_hashed:
        user.password = make_password(password)
        user.save(update_fields=['password'])

    token = _issue_operator_token(user)
    return token, user


def authenticate_admin(email: str, password: str) -> tuple[AdminToken, User]:
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

    is_hashed = user.password.startswith('pbkdf2_')
    is_valid_password = check_password(password, user.password) if is_hashed else user.password == password
    if not is_valid_password:
        raise AuthenticationFailed('Неверный email или пароль.')

    if not is_hashed:
        user.password = make_password(password)
        user.save(update_fields=['password'])

    token = _issue_admin_token(user)
    return token, user


def get_operator_by_token(raw_token: str | None) -> User:
    if not raw_token:
        raise AuthenticationFailed('Требуется токен оператора.')

    try:
        token = OperatorToken.objects.select_related('user').get(key=raw_token)
    except OperatorToken.DoesNotExist as exc:
        raise AuthenticationFailed('Токен оператора недействителен.') from exc

    if token.expires_at <= timezone.now():
        token.delete()
        raise AuthenticationFailed('Срок действия токена оператора истек.')

    user = token.user
    if not user.is_active or user.role != Role.OPERATOR:
        raise AuthenticationFailed('Недостаточно прав для действия оператора.')

    return user


def get_admin_by_token(raw_token: str | None) -> User:
    if not raw_token:
        raise AuthenticationFailed('Требуется токен администратора.')

    try:
        token = AdminToken.objects.select_related('user').get(key=raw_token)
    except AdminToken.DoesNotExist as exc:
        raise AuthenticationFailed('Токен администратора недействителен.') from exc

    if token.expires_at <= timezone.now():
        token.delete()
        raise AuthenticationFailed('Срок действия токена администратора истек.')

    user = token.user
    if not user.is_active or user.role != Role.ADMIN:
        raise AuthenticationFailed('Недостаточно прав для действия администратора.')

    if user.company_id is None:
        raise AuthenticationFailed('Администратор должен быть привязан к компании.')

    return user


def parse_bearer_token(authorization_header: str | None) -> str | None:
    if not authorization_header:
        return None

    prefix = 'Bearer '
    if not authorization_header.startswith(prefix):
        return None

    return authorization_header[len(prefix):].strip() or None


def revoke_operator_token(raw_token: str | None) -> None:
    if not raw_token:
        return

    OperatorToken.objects.filter(key=raw_token).delete()


def revoke_admin_token(raw_token: str | None) -> None:
    if not raw_token:
        return

    AdminToken.objects.filter(key=raw_token).delete()
