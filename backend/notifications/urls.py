from django.urls import include, path
from rest_framework import routers

from notifications.views import AdminFeedbackItemViewSet, PublicFeedbackCreateView


router = routers.DefaultRouter()
router.register(r'admin/feedback', AdminFeedbackItemViewSet, basename='admin-feedback')

urlpatterns = [
    path('feedback/', PublicFeedbackCreateView.as_view(), name='public-feedback'),
    path('', include(router.urls)),
]
