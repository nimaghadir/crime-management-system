from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Case, CaseHistory, Complaint, Tag
from .serializers import (
    CaseCreateSerializer,
    CaseDetailSerializer,
    CaseListSerializer,
    CasePartialUpdateSerializer,
    ComplaintToCaseConversionSerializer,
    TagSerializer,
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

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        level_filter = self.request.query_params.get("level")
        if level_filter:
            try:
                queryset = queryset.filter(level=int(level_filter))
            except ValueError as exc:
                raise ValidationError({"level": "Level must be an integer."}) from exc

        tag_filter = self.request.query_params.get("tag")
        if tag_filter:
            if tag_filter.isdigit():
                queryset = queryset.filter(tags__id=int(tag_filter))
            else:
                queryset = queryset.filter(tags__name__iexact=tag_filter.strip())
            queryset = queryset.distinct()

        return queryset

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


class ComplaintToCaseConversionView(APIView):
    @transaction.atomic
    def post(self, request, complaint_id):
        complaint = get_object_or_404(Complaint.objects.select_related("case"), pk=complaint_id)
        if complaint.case_id is not None:
            raise ValidationError({"complaint": "Complaint is already linked to a case."})

        serializer = ComplaintToCaseConversionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        case = Case.objects.create(
            title=complaint.title,
            description=complaint.description,
            created_by=request.user,
            assigned_to=serializer.validated_data.get("assigned_to"),
            level=serializer.validated_data.get("level", Case.Level.LEVEL_3),
            status=Case.Status.OPEN,
        )
        complaint.case = case
        complaint.status = Complaint.Status.APPROVED
        complaint.save(update_fields=["case", "status", "updated_at"])

        CaseHistory.objects.create(
            case=case,
            actor=request.user,
            action="complaint_conversion",
            delta={"complaint_id": complaint.id},
        )

        output = CaseDetailSerializer(case)
        return Response(output.data, status=status.HTTP_201_CREATED)


class TagViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Tag.objects.all().order_by("name", "id")
    serializer_class = TagSerializer
