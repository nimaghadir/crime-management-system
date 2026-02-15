from django.db import transaction
from rest_framework import mixins, viewsets

from .models import Case, CaseHistory
from .serializers import (
    CaseCreateSerializer,
    CaseDetailSerializer,
    CaseListSerializer,
    CasePartialUpdateSerializer,
)


class CaseViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
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
        if self.action == "partial_update":
            return CasePartialUpdateSerializer
        return CaseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, status=Case.Status.OPEN)

    @transaction.atomic
    def perform_update(self, serializer):
        if self.action != "partial_update":
            serializer.save()
            return

        instance = serializer.instance
        before = {"status": instance.status, "level": instance.level}
        after = {
            "status": serializer.validated_data.get("status", instance.status),
            "level": serializer.validated_data.get("level", instance.level),
        }
        delta = {
            field: {"from": before[field], "to": after[field]}
            for field in ("status", "level")
            if before[field] != after[field]
        }

        if not delta:
            serializer.save()
            return

        updated_case = serializer.save(version=instance.version + 1)
        CaseHistory.objects.create(
            case=updated_case,
            actor=self.request.user,
            action="partial_update",
            delta=delta,
        )
