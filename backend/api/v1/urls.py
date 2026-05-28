from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema')),
    path('', include('users.urls')),
    path('', include('clients.urls')),
    path('', include('companies.urls')),
    path('', include('queues.urls')),
    path('', include('notifications.urls')),
    path('', include('analytics.urls')),
]
