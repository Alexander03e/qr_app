from rest_framework import routers
from django.urls import include, path
from clients.views import ClientLanguageView, ClientViewSet

router = routers.DefaultRouter()
router.register(r'clients', ClientViewSet)

urlpatterns = [
    path('clients/language/', ClientLanguageView.as_view(), name='client-language'),
    path('', include(router.urls)),
]