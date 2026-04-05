from rest_framework import routers
from django.urls import include, path
from clients.views import ClientViewSet

router = routers.DefaultRouter()
router.register(r'clients', ClientViewSet)

urlpatterns = [
    path('', include(router.urls)),
]