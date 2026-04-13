from django.urls import path

from analytics.views import AdminMetricsView


urlpatterns = [
    path('admin/metrics/', AdminMetricsView.as_view(), name='admin-metrics'),
]
