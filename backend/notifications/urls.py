from django.urls import include, path
from rest_framework import routers

from notifications.views import (
    AdminFeedbackItemViewSet,
    AdminWebhookSubscriptionViewSet,
    PublicFeedbackCreateView,
    PublicNotificationStatusView,
    PublicVkOAuthCallbackView,
    PublicVkOAuthStartView,
    PublicVkSubscribeView,
    PublicWebPushSubscribeView,
    WebPushPublicKeyView,
)


router = routers.DefaultRouter()
router.register(r'admin/feedback', AdminFeedbackItemViewSet, basename='admin-feedback')
router.register(
    r'admin/webhook-subscriptions',
    AdminWebhookSubscriptionViewSet,
    basename='admin-webhook-subscriptions',
)

urlpatterns = [
    path('feedback/', PublicFeedbackCreateView.as_view(), name='public-feedback'),
    path('notifications/status/', PublicNotificationStatusView.as_view(), name='notification-status'),
    path('notifications/web-push/public-key/', WebPushPublicKeyView.as_view(), name='web-push-public-key'),
    path('notifications/web-push/subscribe/', PublicWebPushSubscribeView.as_view(), name='web-push-subscribe'),
    path('notifications/vk/oauth/start/', PublicVkOAuthStartView.as_view(), name='vk-oauth-start'),
    path('notifications/vk/oauth/callback/', PublicVkOAuthCallbackView.as_view(), name='vk-oauth-callback'),
    path('notifications/vk/subscribe/', PublicVkSubscribeView.as_view(), name='vk-subscribe'),
    path('', include(router.urls)),
]
