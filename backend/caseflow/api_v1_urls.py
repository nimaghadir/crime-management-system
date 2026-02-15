from django.urls import include, path
from rest_framework.routers import DefaultRouter

from cases.views import CaseViewSet
from .api_v1_views import HealthCheckView, ProtectedPingView

router = DefaultRouter()
router.register("cases", CaseViewSet, basename="cases")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="api-v1-health"),
    path("protected/", ProtectedPingView.as_view(), name="api-v1-protected"),
    path("auth/", include("accounts.urls")),
]

urlpatterns += router.urls
