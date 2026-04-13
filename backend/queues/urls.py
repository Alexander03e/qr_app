from django.urls import include, path
from rest_framework import routers

from queues.views import AdminQueueViewSet, QueueViewSet, TicketViewSet


router = routers.DefaultRouter()

router.register(r'queues', QueueViewSet, basename='queue')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'admin/queues', AdminQueueViewSet, basename='admin-queue')

urlpatterns = [
    path('', include(router.urls)),
]