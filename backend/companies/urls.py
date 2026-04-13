from django.urls import include, path
from rest_framework import routers

from companies.views import AdminBranchViewSet, AdminCompanyViewSet


router = routers.DefaultRouter()
router.register(r'admin/companies', AdminCompanyViewSet, basename='admin-companies')
router.register(r'admin/branches', AdminBranchViewSet, basename='admin-branches')

urlpatterns = [
    path('', include(router.urls)),
]
