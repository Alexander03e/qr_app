from django.urls import include, path
from rest_framework import routers

from notifications.views import AdminFeedbackItemViewSet


router = routers.DefaultRouter()
router.register(r'admin/feedback', AdminFeedbackItemViewSet, basename='admin-feedback')

urlpatterns = [
    path('', include(router.urls)),
]
