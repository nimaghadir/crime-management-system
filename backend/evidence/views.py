from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from investigations.models import InvestigationAction

from .models import Evidence, EvidenceAttachment
from .serializers import EvidenceAttachmentSerializer, EvidenceSerializer


class EvidenceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EvidenceSerializer
    queryset = Evidence.objects.select_related("case", "uploaded_by").order_by(
        "-created_at", "-id"
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        case_id = self.request.query_params.get("case")
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user, status=Evidence.Status.PENDING)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def verify(self, request, pk=None):
        evidence = self.get_object()
        if evidence.status == Evidence.Status.VERIFIED:
            raise ValidationError({"status": "Evidence is already verified."})

        previous_status = evidence.status
        evidence.status = Evidence.Status.VERIFIED
        evidence.save(update_fields=["status"])

        InvestigationAction.objects.create(
            case=evidence.case,
            action_type="evidence_verified",
            payload={
                "evidence_id": evidence.id,
                "from_status": previous_status,
                "to_status": Evidence.Status.VERIFIED,
            },
            performed_by=request.user,
        )
        return Response(EvidenceSerializer(evidence).data, status=status.HTTP_200_OK)


class EvidenceAttachmentViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = EvidenceAttachment.objects.select_related("evidence", "uploaded_by")
    serializer_class = EvidenceAttachmentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
