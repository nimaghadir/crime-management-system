from django.urls import include, path
from rest_framework.routers import DefaultRouter

from cases.views import CaseViewSet, ComplaintToCaseConversionView, TagViewSet
from evidence.views import EvidenceAttachmentViewSet, EvidenceViewSet
from .api_v1_views import HealthCheckView, ProtectedPingView

router = DefaultRouter()
router.register("cases", CaseViewSet, basename="cases")
router.register("tags", TagViewSet, basename="tags")
router.register("evidence", EvidenceViewSet, basename="evidence")
router.register("evidence-attachments", EvidenceAttachmentViewSet, basename="evidence-attachments")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="api-v1-health"),
    path("protected/", ProtectedPingView.as_view(), name="api-v1-protected"),
    path("auth/", include("accounts.urls")),
    path(
        "cases/complaints/<int:complaint_id>/convert/",
        ComplaintToCaseConversionView.as_view(),
        name="cases-complaint-convert",
    ),
]

urlpatterns += router.urls
