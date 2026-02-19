from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import RoleViewSet, UserManagementViewSet
from cases.views import CaseViewSet, ComplaintToCaseConversionView, TagViewSet
from evidence.views import EvidenceAttachmentViewSet, EvidenceViewSet
from investigations.views import InvestigationActionViewSet, NoteViewSet, SuspectViewSet
from reports.views import DetectiveBoardSummaryView
from .api_v1_views import HealthCheckView, ProtectedPingView

router = DefaultRouter()
router.register("roles", RoleViewSet, basename="roles")
router.register("users", UserManagementViewSet, basename="users")
router.register("cases", CaseViewSet, basename="cases")
router.register("tags", TagViewSet, basename="tags")
router.register("evidence", EvidenceViewSet, basename="evidence")
router.register("evidence-attachments", EvidenceAttachmentViewSet, basename="evidence-attachments")
router.register("suspects", SuspectViewSet, basename="suspects")
router.register("notes", NoteViewSet, basename="notes")
router.register("investigation-actions", InvestigationActionViewSet, basename="investigation-actions")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="api-v1-health"),
    path("protected/", ProtectedPingView.as_view(), name="api-v1-protected"),
    path("auth/", include("accounts.urls")),
    path(
        "cases/complaints/<int:complaint_id>/convert/",
        ComplaintToCaseConversionView.as_view(),
        name="cases-complaint-convert",
    ),
    path(
        "reports/detective-board-summary/",
        DetectiveBoardSummaryView.as_view(),
        name="reports-detective-board-summary",
    ),
]

urlpatterns += router.urls
