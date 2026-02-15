from rest_framework import mixins, viewsets

from .models import Case
from .serializers import CaseCreateSerializer, CaseDetailSerializer, CaseListSerializer


class CaseViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Case.objects.select_related(
        "assigned_to",
        "assigned_to__role",
        "created_by",
    ).prefetch_related(
        "tags",
        "suspects",
    ).order_by("-created_at", "-id")

    def get_serializer_class(self):
        if self.action == "list":
            return CaseListSerializer
        if self.action == "create":
            return CaseCreateSerializer
        return CaseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, status=Case.Status.OPEN)
