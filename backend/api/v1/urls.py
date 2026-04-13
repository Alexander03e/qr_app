from importlib import import_module
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]

# Список приложений, которые должны предоставить файл urls.py
APPS = [
    'users',
    'clients',
    'companies',
    'queues',
]

for app in APPS:
    try:
        import_module(f'{app}.urls')
    except ModuleNotFoundError:
        # приложение не предоставляет urls.py — пропускаем
        continue
    urlpatterns.append(path('', include(f'{app}.urls')))
