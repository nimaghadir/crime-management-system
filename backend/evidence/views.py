from django.utils import timezone
from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.response import Response
from notifications.models import Notification

from accounts import constants
from cases.models import Case, CaseWitness
from .models import (
    TestimonyEvidence,
    BiologicalEvidence,
    VehicleEvidence,
    IdentificationDocument,
    OtherEvidence,
    EvidenceAttachment,
)
from .serializers import (TestimonyEvidenceSerializer,
                            BiologicalEvidenceSerializer, 
                            BiologicalEvidenceReviewSerializer,
                            VehicleEvidenceSerializer, 
                            OtherEvidenceSerializer, 
                            IdentificationDocumentSerializer,
                            EvidenceAttachmentSerializer,
                        )
from .permissions import IsCop, IsCopOrJudgeOrAdmin, IsCoroner


def _role_names(user):
    if not user or not user.is_authenticated:
        return set()
    return set(user.groups.values_list("name", flat=True))


def _is_cop_judge_admin(user):
    roles = _role_names(user)
    allowed = set(constants.COP_ROLES) | {constants.JUDGE, constants.SYSTEM_ADMINISTRATOR}
    return bool(roles.intersection(allowed))


def _is_witness(user):
    return constants.WITNESS in _role_names(user)


EVIDENCE_MODEL_MAP = {
    EvidenceAttachment.EvidenceType.TESTIMONY: TestimonyEvidence,
    EvidenceAttachment.EvidenceType.BIO_MEDICAL: BiologicalEvidence,
    EvidenceAttachment.EvidenceType.VEHICLE: VehicleEvidence,
    EvidenceAttachment.EvidenceType.IDENTITY: IdentificationDocument,
    EvidenceAttachment.EvidenceType.OTHER: OtherEvidence,
}


def _get_evidence_instance(evidence_type, evidence_id):
    model = EVIDENCE_MODEL_MAP.get(str(evidence_type or "").strip())
    if not model:
        return None
    try:
        pk = int(evidence_id)
    except (TypeError, ValueError):
        return None
    if pk <= 0:
        return None
    return model.objects.filter(pk=pk).first()


def _can_access_evidence(user, evidence_type, evidence_obj):
    if not user or not user.is_authenticated or evidence_obj is None:
        return False

    if _is_cop_judge_admin(user):
        return True

    if _is_witness(user):
        if evidence_type != EvidenceAttachment.EvidenceType.TESTIMONY:
            return False
        if getattr(evidence_obj, "witness_id", None) == user.id or getattr(evidence_obj, "submitter_id", None) == user.id:
            return True
        return CaseWitness.objects.filter(case_id=evidence_obj.case_id, user=user).exists()

    return False


def _case_is_locked_for_new_evidence(case_obj):
    status_value = str(getattr(case_obj, "status", "") or "").strip().lower()
    return status_value in {
        str(Case.Status.AWAITING_TRIAL).strip().lower(),
        str(Case.Status.CLOSED).strip().lower(),
    }


def _ensure_case_allows_evidence_mutation(case_obj):
    if case_obj is None:
        raise PermissionDenied("Case is required for evidence registration.")
    if _case_is_locked_for_new_evidence(case_obj):
        raise PermissionDenied("Evidence cannot be added after a case reaches trial stage or is closed.")


class TestimonyEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = TestimonyEvidenceSerializer

    def get_queryset(self):
        qs = TestimonyEvidence.objects.select_related('case', 'submitter', 'witness')
        raw_case_id = self.request.query_params.get("case")
        try:
            case_id = int(raw_case_id) if raw_case_id not in (None, "", "null") else None
        except (TypeError, ValueError):
            case_id = None
        if case_id:
            qs = qs.filter(case_id=case_id)

        user = getattr(self.request, "user", None)
        if _is_cop_judge_admin(user):
            return qs
        if _is_witness(user):
            return qs.filter(
                Q(witness=user) | Q(submitter=user) | Q(case__witnesses__user=user)
            ).distinct()
        return qs.none()

    def get_permissions(self):
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required.")

        roles = _role_names(user)
        is_cop = bool(roles.intersection(set(constants.COP_ROLES)))
        is_witness_role = constants.WITNESS in roles and constants.COMPLAINANT not in roles

        if not is_cop and not is_witness_role:
            raise PermissionDenied("Only police roles or witness users can submit testimony evidence.")

        if is_witness_role:
            case_obj = serializer.validated_data.get("case")
            _ensure_case_allows_evidence_mutation(case_obj)
            if case_obj is None:
                raise PermissionDenied("Case is required.")
            CaseWitness.objects.get_or_create(
                case=case_obj,
                user=user,
                defaults={
                    "phone_number": getattr(user, "phone_number", "") or "",
                    "national_id": getattr(user, "national_id", "") or "",
                },
            )
            serializer.save(submitter=user, witness=user)
            return

        _ensure_case_allows_evidence_mutation(serializer.validated_data.get("case"))
        serializer.save(submitter=user)


class TestimonyEvidenceDetailView(generics.RetrieveAPIView):
    serializer_class = TestimonyEvidenceSerializer
    queryset = TestimonyEvidence.objects.select_related('case', 'submitter', 'witness')
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if _is_cop_judge_admin(user):
            return obj
        if _is_witness(user):
            if obj.witness_id == user.id or obj.submitter_id == user.id:
                return obj
            if CaseWitness.objects.filter(case_id=obj.case_id, user=user).exists():
                return obj
        raise PermissionDenied("You do not have permission to view this testimony.")


############# Biological evidence

class BiologicalEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = BiologicalEvidenceSerializer

    def get_queryset(self):
        qs = BiologicalEvidence.objects.prefetch_related('images').select_related('case', 'submitter')
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return qs.none()
        if constants.CORONER in _role_names(user):
            return qs.filter(Q(case__assigned_coroner=user) | Q(case__assigned_coroner__isnull=True))
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        _ensure_case_allows_evidence_mutation(serializer.validated_data.get("case"))
        serializer.save(submitter=self.request.user)


class BiologicalEvidenceDetailView(generics.RetrieveUpdateAPIView):
    queryset = BiologicalEvidence.objects.prefetch_related('images').select_related('case', 'submitter')
    http_method_names = ['get', 'patch']

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return BiologicalEvidenceReviewSerializer
        return BiologicalEvidenceSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsCoroner()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def get_object(self):
        obj = super().get_object()
        if self.request.method == "PATCH":
            assigned_coroner_id = getattr(getattr(obj, "case", None), "assigned_coroner_id", None)
            if assigned_coroner_id and assigned_coroner_id != self.request.user.id:
                raise PermissionDenied("This biological evidence is assigned to another coroner.")
        return obj

    def perform_update(self, serializer):
        instance = serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())
        case_obj = getattr(instance, "case", None)
        detective = getattr(case_obj, "assigned_detective", None) if case_obj else None
        if detective and detective.id != self.request.user.id:
            status_label = "approved" if str(instance.review_status).lower() == "confirmed" else "rejected"
            Notification.objects.create(
                recipient=detective,
                notif_type=Notification.NotifType.CASE_UPDATED,
                title=f"Biological evidence {status_label} by coroner",
                body=f"Biological evidence #{instance.id} for Case #{getattr(case_obj, 'id', '-') } was {status_label} by coroner.",
                link=f"/cases/{case_obj.id}/" if case_obj else "",
            )


class VehicleEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleEvidenceSerializer

    def get_queryset(self):
        return VehicleEvidence.objects.select_related('case', 'submitter')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        _ensure_case_allows_evidence_mutation(serializer.validated_data.get("case"))
        serializer.save(submitter=self.request.user)


class VehicleEvidenceDetailView(generics.RetrieveAPIView):
    serializer_class = VehicleEvidenceSerializer
    queryset = VehicleEvidence.objects.select_related('case', 'submitter')
    permission_classes = [IsAuthenticated, IsCopOrJudgeOrAdmin]



class IdentificationDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = IdentificationDocumentSerializer

    def get_queryset(self):
        return IdentificationDocument.objects.select_related('case', 'submitter')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        _ensure_case_allows_evidence_mutation(serializer.validated_data.get("case"))
        serializer.save(submitter=self.request.user)


class IdentificationDocumentDetailView(generics.RetrieveAPIView):
    serializer_class = IdentificationDocumentSerializer
    queryset = IdentificationDocument.objects.select_related('case', 'submitter')
    permission_classes = [IsAuthenticated, IsCopOrJudgeOrAdmin]


class OtherEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = OtherEvidenceSerializer

    def get_queryset(self):
        return OtherEvidence.objects.select_related('case', 'submitter')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        _ensure_case_allows_evidence_mutation(serializer.validated_data.get("case"))
        serializer.save(submitter=self.request.user)


class OtherEvidenceDetailView(generics.RetrieveAPIView):
    serializer_class = OtherEvidenceSerializer
    queryset = OtherEvidence.objects.select_related('case', 'submitter')
    permission_classes = [IsAuthenticated, IsCopOrJudgeOrAdmin]


class EvidenceAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = EvidenceAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = EvidenceAttachment.objects.all().order_by("id")
        evidence_type = str(self.request.query_params.get("evidence_type") or "").strip()
        evidence_id = self.request.query_params.get("evidence_id")

        if evidence_type:
            qs = qs.filter(evidence_type=evidence_type)
        if evidence_id not in (None, "", "null"):
            qs = qs.filter(evidence_id=evidence_id)

        if _is_cop_judge_admin(user):
            return qs

        if _is_witness(user):
            testimony_ids = list(
                TestimonyEvidence.objects.filter(
                    Q(witness=user) | Q(submitter=user) | Q(case__witnesses__user=user)
                )
                .values_list("id", flat=True)
                .distinct()
            )
            return qs.filter(
                evidence_type=EvidenceAttachment.EvidenceType.TESTIMONY,
                evidence_id__in=testimony_ids,
            )

        return qs.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        evidence_type = serializer.validated_data.get("evidence_type")
        evidence_id = serializer.validated_data.get("evidence_id")
        evidence_obj = _get_evidence_instance(evidence_type, evidence_id)
        if evidence_obj is None:
            return Response({"detail": "Target evidence not found."}, status=status.HTTP_404_NOT_FOUND)
        _ensure_case_allows_evidence_mutation(getattr(evidence_obj, "case", None))
        if not _can_access_evidence(request.user, evidence_type, evidence_obj):
            raise PermissionDenied("You do not have permission to attach files to this evidence.")

        file_obj = serializer.validated_data.get("file")
        file_url = str(serializer.validated_data.get("file_url") or "").strip()
        file_path = str(serializer.validated_data.get("file_path") or "").strip()
        if not file_obj and not file_url and not file_path:
            return Response(
                {"detail": "Provide a file upload, file_url, or file_path."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance = serializer.save(uploaded_by=request.user)
        out = self.get_serializer(instance)
        headers = self.get_success_headers(out.data)
        return Response(out.data, status=status.HTTP_201_CREATED, headers=headers)
