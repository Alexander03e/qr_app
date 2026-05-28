from rest_framework.permissions import BasePermission

from users.models import Role, User


def get_authenticated_user(request) -> User | None:
    user = getattr(request, 'user', None)
    if isinstance(user, User) and user.is_active:
        return user
    return None


class IsAdminUser(BasePermission):
    message = 'Требуется токен администратора.'

    def has_permission(self, request, view) -> bool:
        user = get_authenticated_user(request)
        return bool(user and user.role == Role.ADMIN and user.company_id is not None)


class IsOperatorUser(BasePermission):
    message = 'Требуется токен оператора.'

    def has_permission(self, request, view) -> bool:
        user = get_authenticated_user(request)
        return bool(user and user.role == Role.OPERATOR)


class IsStaffUser(BasePermission):
    message = 'Требуется токен сотрудника.'

    def has_permission(self, request, view) -> bool:
        user = get_authenticated_user(request)
        return bool(user and user.role in {Role.ADMIN, Role.OPERATOR})
