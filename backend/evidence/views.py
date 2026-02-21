from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from investigations.models import InvestigationAction

from .models import Evidence, EvidenceAttachment
from .serializers import (
    EvidenceAttachmentSerializer,
    EvidenceBioMedicalFollowUpSerializer,
    EvidenceSerializer,
)


class EvidenceViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EvidenceSerializer
    queryset = (
        Evidence.objects.select_related("case", "uploaded_by")
        .prefetch_related("attachments")
        .order_by("-created_at", "-id")
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
        if (
            evidence.type == Evidence.EvidenceType.BIO_MEDICAL
            and not self._has_image_attachment(evidence)
        ):
            raise ValidationError(
                {
                    "attachments": (
                        "Bio-medical evidence requires at least one image attachment."
                    )
                }
            )

        previous_status = evidence.status
        evidence.status = Evidence.Status.VERIFIED
        evidence.save(update_fields=["status", "updated_at"])

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

    @action(detail=True, methods=["patch"], url_path="biomedical-follow-up")
    @transaction.atomic
    def biomedical_follow_up(self, request, pk=None):
        evidence = self.get_object()
        if evidence.type != Evidence.EvidenceType.BIO_MEDICAL:
            raise ValidationError(
                {
                    "type": (
                        "Follow-up results can only be updated for bio-medical evidence."
                    )
                }
            )

        serializer = EvidenceBioMedicalFollowUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updates = serializer.validated_data

        changed_fields = {}
        if "forensic_result" in updates and updates["forensic_result"] != evidence.forensic_result:
            changed_fields["forensic_result"] = {
                "from": evidence.forensic_result,
                "to": updates["forensic_result"],
            }
            evidence.forensic_result = updates["forensic_result"]
        if (
            "identity_bank_result" in updates
            and updates["identity_bank_result"] != evidence.identity_bank_result
        ):
            changed_fields["identity_bank_result"] = {
                "from": evidence.identity_bank_result,
                "to": updates["identity_bank_result"],
            }
            evidence.identity_bank_result = updates["identity_bank_result"]

        if changed_fields:
            evidence.save(
                update_fields=["forensic_result", "identity_bank_result", "updated_at"]
            )
            InvestigationAction.objects.create(
                case=evidence.case,
                action_type="bio_medical_follow_up_updated",
                payload={
                    "evidence_id": evidence.id,
                    "changes": changed_fields,
                },
                performed_by=request.user,
            )

        return Response(EvidenceSerializer(evidence).data, status=status.HTTP_200_OK)

    def _has_image_attachment(self, evidence: Evidence) -> bool:
        for attachment in evidence.attachments.all():
            mime_type = (attachment.mime_type or "").lower()
            if mime_type.startswith("image/"):
                return True
            file_path = (attachment.file_path or "").lower()
            file_url = (attachment.file_url or "").lower()
            if any(
                candidate.endswith(ext)
                for candidate in (file_path, file_url)
                for ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp")
            ):
                return True
        return False


class EvidenceAttachmentViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = EvidenceAttachment.objects.select_related("evidence", "uploaded_by")
    serializer_class = EvidenceAttachmentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
