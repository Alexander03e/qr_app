from django.urls import include
from django.urls import path
from rest_framework import routers

from users.views import (
    AdminLoginView,
    AdminLogoutView,
    AdminOperatorViewSet,
    AdminSettingsView,
    AdminSessionView,
    OperatorLoginView,
    OperatorLogoutView,
    OperatorSettingsView,
    OperatorSessionView,
)


router = routers.DefaultRouter()
router.register(r'admin/operators', AdminOperatorViewSet, basename='admin-operators')


urlpatterns = [
    path('auth/operator/login/', OperatorLoginView.as_view(), name='operator-login'),
    path('auth/operator/me/', OperatorSessionView.as_view(), name='operator-me'),
    path('auth/operator/logout/', OperatorLogoutView.as_view(), name='operator-logout'),
    path('auth/operator/settings/', OperatorSettingsView.as_view(), name='operator-settings'),
    path('auth/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/admin/me/', AdminSessionView.as_view(), name='admin-me'),
    path('auth/admin/logout/', AdminLogoutView.as_view(), name='admin-logout'),
    path('auth/admin/settings/', AdminSettingsView.as_view(), name='admin-settings'),
    path('', include(router.urls)),
]
