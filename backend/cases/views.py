from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.constants import (
    ROLE_CODE_BASIC_USER,
    ROLE_CODE_CAPTAIN,
    ROLE_CODE_COMPLAINANT,
    ROLE_CODE_INTERN,
    ROLE_CODE_PATROL_OFFICER,
    ROLE_CODE_POLICE_CHIEF,
    ROLE_CODE_POLICE_OFFICER,
    ROLE_CODE_SERGEANT,
    ROLE_FLAG_CODE_KEY,
)

from .models import Case, CaseComplainant, CaseHistory, Complaint, CrimeSceneReport, Tag
from .serializers import (
    CaseComplainantReviewSerializer,
    CaseComplainantSerializer,
    CaseCreateSerializer,
    CaseDetailSerializer,
    CaseListSerializer,
    CasePartialUpdateSerializer,
    ComplaintFeedbackSerializer,
    ComplaintForwardSerializer,
    ComplaintOfficerApproveSerializer,
    ComplaintSerializer,
    ComplaintToCaseConversionSerializer,
    CrimeSceneReportApproveSerializer,
    CrimeSceneReportSerializer,
    TagSerializer,
)

COMPLAINANT_CODES = {ROLE_CODE_BASIC_USER, ROLE_CODE_COMPLAINANT}
INTERN_CODES = {ROLE_CODE_INTERN}
OFFICER_REVIEW_CODES = {
    ROLE_CODE_POLICE_OFFICER,
    ROLE_CODE_SERGEANT,
    ROLE_CODE_CAPTAIN,
    ROLE_CODE_POLICE_CHIEF,
}
POLICE_SCENE_REPORTER_CODES = {
    ROLE_CODE_POLICE_OFFICER,
    ROLE_CODE_PATROL_OFFICER,
    ROLE_CODE_SERGEANT,
    ROLE_CODE_CAPTAIN,
    ROLE_CODE_POLICE_CHIEF,
}


def _get_role_code(user) -> str | None:
    role = getattr(user, "role", None)
    if role is None:
        return None
    flags = role.default_flags if isinstance(role.default_flags, dict) else {}
    return flags.get(ROLE_FLAG_CODE_KEY)


def _has_role(user, allowed_codes: set[str]) -> bool:
    if getattr(user, "is_superuser", False):
        return True
    return _get_role_code(user) in allowed_codes


def _require_role(user, allowed_codes: set[str], message: str):
    if not _has_role(user, allowed_codes):
        raise PermissionDenied(message)


def _create_case_from_complaint(
    complaint: Complaint,
    actor,
    assigned_to=None,
    level=Case.Level.LEVEL_3,
    history_action="complaint_approved_by_officer",
) -> Case:
    case = Case.objects.create(
        title=complaint.title,
        description=complaint.description,
        created_by=actor,
        assigned_to=assigned_to,
        level=level,
        status=Case.Status.OPEN,
    )
    CaseHistory.objects.create(
        case=case,
        actor=actor,
        action=history_action,
        delta={"complaint_id": complaint.id},
    )
    complainant = complaint.complainant
    if complainant and complainant.national_id and complainant.phone:
        CaseComplainant.objects.get_or_create(
            case=case,
            national_id=complainant.national_id,
            defaults={
                "full_name": f"{complainant.first_name} {complainant.last_name}".strip()
                or complainant.username,
                "phone": complainant.phone,
                "submitted_by": complainant,
                "review_status": CaseComplainant.ReviewStatus.APPROVED,
                "reviewed_by": actor,
            },
        )
    return case


def _approve_crime_scene_report(report: CrimeSceneReport, approver, note: str = "") -> CrimeSceneReport:
    case = Case.objects.create(
        title=report.title,
        description=report.description,
        created_by=approver,
        assigned_to=report.reported_by,
        level=Case.Level.LEVEL_2,
        status=Case.Status.OPEN,
    )
    CaseHistory.objects.create(
        case=case,
        actor=approver,
        action="crime_scene_report_approved",
        delta={
            "report_id": report.id,
            "location": report.location,
            "observed_at": report.observed_at.isoformat(),
        },
    )
    report.status = CrimeSceneReport.Status.APPROVED
    report.reviewer_note = note
    report.approved_by = approver
    report.approved_at = timezone.now()
    report.case = case
    report.save(
        update_fields=[
            "status",
            "reviewer_note",
            "approved_by",
            "approved_at",
            "case",
            "updated_at",
        ]
    )
    return report


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


class ComplaintViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ComplaintSerializer
    queryset = Complaint.objects.select_related(
        "complainant",
        "complainant__role",
        "forwarded_to",
        "forwarded_to__role",
        "case",
    ).order_by("-created_at", "-id")

    def get_queryset(self):
        queryset = super().get_queryset()
        role_code = _get_role_code(self.request.user)
        if self.request.user.is_superuser or role_code in INTERN_CODES | OFFICER_REVIEW_CODES:
            return queryset
        return queryset.filter(complainant=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        complaint = self.get_object()
        if not request.user.is_superuser and complaint.complainant_id != request.user.id:
            raise PermissionDenied("You can only update your own complaint.")
        if complaint.workflow_status != Complaint.WorkflowStatus.COMPLAINANT_REVISION:
            raise ValidationError(
                {"workflow_status": "Complaint is not waiting for complainant revision."}
            )

        allowed_fields = {"title", "description"}
        received_fields = set(request.data.keys())
        if not received_fields:
            raise ValidationError({"detail": "At least one field is required."})
        if not received_fields.issubset(allowed_fields):
            raise ValidationError({"detail": "Only title and description can be updated."})

        serializer = self.get_serializer(complaint, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            workflow_status=Complaint.WorkflowStatus.INTERN_REVIEW,
            intern_feedback="",
            updated_at=timezone.now(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        _require_role(
            self.request.user,
            COMPLAINANT_CODES,
            "Only complainants can create complaints.",
        )
        serializer.save(
            complainant=self.request.user,
            status=Complaint.Status.PENDING,
            workflow_status=Complaint.WorkflowStatus.INTERN_REVIEW,
        )

    @action(detail=True, methods=["post"], url_path="intern/request-correction")
    @transaction.atomic
    def intern_request_correction(self, request, pk=None):
        _require_role(
            request.user,
            INTERN_CODES,
            "Only interns can request complaint correction.",
        )
        complaint = self.get_object()
        if complaint.workflow_status != Complaint.WorkflowStatus.INTERN_REVIEW:
            raise ValidationError({"workflow_status": "Complaint is not in intern review stage."})

        input_serializer = ComplaintFeedbackSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        message = input_serializer.validated_data["message"]

        next_revision_count = complaint.revision_count + 1
        complaint.revision_count = next_revision_count
        complaint.intern_feedback = message
        complaint.reviewed_by_intern = request.user

        if next_revision_count >= 3:
            complaint.workflow_status = Complaint.WorkflowStatus.VOID
            complaint.status = Complaint.Status.REJECTED
        else:
            complaint.workflow_status = Complaint.WorkflowStatus.COMPLAINANT_REVISION

        complaint.save(
            update_fields=[
                "revision_count",
                "intern_feedback",
                "reviewed_by_intern",
                "workflow_status",
                "status",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(complaint).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="intern/forward-to-officer")
    def intern_forward_to_officer(self, request, pk=None):
        _require_role(request.user, INTERN_CODES, "Only interns can forward complaints.")
        complaint = self.get_object()
        if complaint.workflow_status != Complaint.WorkflowStatus.INTERN_REVIEW:
            raise ValidationError({"workflow_status": "Complaint is not in intern review stage."})

        input_serializer = ComplaintForwardSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        officer = input_serializer.validated_data["officer"]
        intern_note = input_serializer.validated_data["intern_note"]

        if not _has_role(officer, OFFICER_REVIEW_CODES):
            raise ValidationError({"officer": "Selected user is not a valid police officer reviewer."})

        complaint.workflow_status = Complaint.WorkflowStatus.OFFICER_REVIEW
        complaint.forwarded_to = officer
        complaint.reviewed_by_intern = request.user
        if intern_note:
            complaint.intern_feedback = intern_note
        complaint.save(
            update_fields=[
                "workflow_status",
                "forwarded_to",
                "reviewed_by_intern",
                "intern_feedback",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(complaint).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="officer/return-to-intern")
    def officer_return_to_intern(self, request, pk=None):
        _require_role(
            request.user,
            OFFICER_REVIEW_CODES,
            "Only police officers can return complaints to intern.",
        )
        complaint = self.get_object()
        if complaint.workflow_status != Complaint.WorkflowStatus.OFFICER_REVIEW:
            raise ValidationError({"workflow_status": "Complaint is not in officer review stage."})
        if (
            complaint.forwarded_to_id
            and complaint.forwarded_to_id != request.user.id
            and not request.user.is_superuser
        ):
            raise PermissionDenied("This complaint is assigned to another officer.")

        input_serializer = ComplaintFeedbackSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        complaint.workflow_status = Complaint.WorkflowStatus.INTERN_REVIEW
        complaint.officer_feedback = input_serializer.validated_data["message"]
        complaint.reviewed_by_officer = request.user
        complaint.forwarded_to = None
        complaint.save(
            update_fields=[
                "workflow_status",
                "officer_feedback",
                "reviewed_by_officer",
                "forwarded_to",
                "updated_at",
            ]
        )
        return Response(self.get_serializer(complaint).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="officer/approve")
    @transaction.atomic
    def officer_approve(self, request, pk=None):
        _require_role(
            request.user,
            OFFICER_REVIEW_CODES,
            "Only police officers can approve complaints.",
        )
        complaint = self.get_object()
        if complaint.case_id is not None:
            raise ValidationError({"complaint": "Complaint is already linked to a case."})
        if complaint.workflow_status != Complaint.WorkflowStatus.OFFICER_REVIEW:
            raise ValidationError({"workflow_status": "Complaint is not in officer review stage."})
        if (
            complaint.forwarded_to_id
            and complaint.forwarded_to_id != request.user.id
            and not request.user.is_superuser
        ):
            raise PermissionDenied("This complaint is assigned to another officer.")

        input_serializer = ComplaintOfficerApproveSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        case = _create_case_from_complaint(
            complaint=complaint,
            actor=request.user,
            assigned_to=input_serializer.validated_data.get("assigned_to"),
            level=input_serializer.validated_data.get("level", Case.Level.LEVEL_3),
            history_action="complaint_approved_by_officer",
        )

        complaint.case = case
        complaint.status = Complaint.Status.APPROVED
        complaint.workflow_status = Complaint.WorkflowStatus.APPROVED
        complaint.reviewed_by_officer = request.user
        complaint.officer_feedback = input_serializer.validated_data.get("approval_note", "")
        complaint.save(
            update_fields=[
                "case",
                "status",
                "workflow_status",
                "reviewed_by_officer",
                "officer_feedback",
                "updated_at",
            ]
        )
        return Response(
            {
                "complaint": self.get_serializer(complaint).data,
                "case": CaseDetailSerializer(case).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CaseComplainantViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CaseComplainantSerializer
    queryset = CaseComplainant.objects.select_related(
        "case",
        "submitted_by",
        "submitted_by__role",
        "reviewed_by",
        "reviewed_by__role",
    ).order_by("-created_at", "-id")

    def get_queryset(self):
        queryset = super().get_queryset()
        case_id = self.request.query_params.get("case")
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="intern-approve")
    def intern_approve(self, request, pk=None):
        _require_role(request.user, INTERN_CODES, "Only interns can approve complainants.")
        record = self.get_object()
        input_serializer = CaseComplainantReviewSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        record.review_status = CaseComplainant.ReviewStatus.APPROVED
        record.review_note = input_serializer.validated_data["note"]
        record.reviewed_by = request.user
        record.save(update_fields=["review_status", "review_note", "reviewed_by", "updated_at"])
        return Response(self.get_serializer(record).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="intern-reject")
    def intern_reject(self, request, pk=None):
        _require_role(request.user, INTERN_CODES, "Only interns can reject complainants.")
        record = self.get_object()
        input_serializer = CaseComplainantReviewSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        record.review_status = CaseComplainant.ReviewStatus.REJECTED
        record.review_note = input_serializer.validated_data["note"]
        record.reviewed_by = request.user
        record.save(update_fields=["review_status", "review_note", "reviewed_by", "updated_at"])
        return Response(self.get_serializer(record).data, status=status.HTTP_200_OK)


class CrimeSceneReportViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CrimeSceneReportSerializer
    queryset = CrimeSceneReport.objects.select_related(
        "reported_by",
        "reported_by__role",
        "approved_by",
        "approved_by__role",
        "case",
    ).prefetch_related("witnesses").order_by("-created_at", "-id")

    def get_queryset(self):
        queryset = super().get_queryset()
        role_code = _get_role_code(self.request.user)
        if self.request.user.is_superuser or role_code in (
            POLICE_SCENE_REPORTER_CODES | INTERN_CODES | OFFICER_REVIEW_CODES
        ):
            return queryset
        return queryset.filter(reported_by=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        _require_role(
            self.request.user,
            POLICE_SCENE_REPORTER_CODES,
            "Only police ranks (except intern) can report crime scenes.",
        )
        report = serializer.save(
            reported_by=self.request.user,
            status=CrimeSceneReport.Status.PENDING_SUPERIOR_REVIEW,
        )
        if _get_role_code(self.request.user) == ROLE_CODE_POLICE_CHIEF:
            _approve_crime_scene_report(
                report=report,
                approver=self.request.user,
                note="Auto-approved because report was created by police chief.",
            )

    @action(detail=True, methods=["post"], url_path="approve")
    @transaction.atomic
    def approve(self, request, pk=None):
        _require_role(
            request.user,
            OFFICER_REVIEW_CODES,
            "Only superior police ranks can approve crime scene reports.",
        )
        report = self.get_object()
        if report.status != CrimeSceneReport.Status.PENDING_SUPERIOR_REVIEW:
            raise ValidationError({"status": "Report is not waiting for approval."})
        if report.reported_by_id == request.user.id and not request.user.is_superuser:
            raise ValidationError(
                {"reported_by": "Reporter cannot approve their own report."}
            )

        input_serializer = CrimeSceneReportApproveSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        _approve_crime_scene_report(
            report=report,
            approver=request.user,
            note=input_serializer.validated_data["note"],
        )
        return Response(self.get_serializer(report).data, status=status.HTTP_200_OK)


class ComplaintToCaseConversionView(APIView):
    @transaction.atomic
    def post(self, request, complaint_id):
        complaint = get_object_or_404(Complaint.objects.select_related("case"), pk=complaint_id)
        if complaint.case_id is not None:
            raise ValidationError({"complaint": "Complaint is already linked to a case."})

        serializer = ComplaintToCaseConversionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        case = _create_case_from_complaint(
            complaint=complaint,
            actor=request.user,
            assigned_to=serializer.validated_data.get("assigned_to"),
            level=serializer.validated_data.get("level", Case.Level.LEVEL_3),
            history_action="complaint_conversion",
        )
        complaint.case = case
        complaint.status = Complaint.Status.APPROVED
        complaint.workflow_status = Complaint.WorkflowStatus.APPROVED
        complaint.save(update_fields=["case", "status", "workflow_status", "updated_at"])

        output = CaseDetailSerializer(case)
        return Response(output.data, status=status.HTTP_201_CREATED)


class TagViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Tag.objects.all().order_by("name", "id")
    serializer_class = TagSerializer
