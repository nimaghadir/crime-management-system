# cases/views.py
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from accounts import constants
from notifications.utils import notify_case, notify_many_case

from .models import Case, Complainant, CaseValidationReview, CaseWitness, CaseSuspect

from .serializers import (
    CaseListSerializer,
    CaseCreateSerializer,
    CasePartialUpdateSerializer,
    CaseValidationReviewListSerializer,
    CaseValidationReviewCreateSerializer,
    CaseWitnessCreateSerializer,
    WitnessCandidateSerializer,
)

User = get_user_model()


def notify_case_validation_event(recipient, case_obj, actor, title, action_phrase, comment=""):
    if not recipient or (actor and recipient.id == actor.id):
        return None
    actor_role = primary_role_name(actor) or "User"
    actor_name = getattr(actor, "username", "user")
    body = f"{actor_role} {actor_name} {action_phrase} for Case #{case_obj.id}."
    if comment:
        body = f"{body} Message: {comment}"
    return notify_case(recipient, case_obj.id, title, body)


def complainant_recipients(case_obj):
    recipients = []
    if case_obj.registered_by:
        recipients.append(case_obj.registered_by)
    recipients.extend(
        User.objects.filter(id__in=Complainant.objects.filter(case=case_obj).values_list("user_id", flat=True))
    )
    return recipients


def user_has_role(user, role_names):
    return bool(user and user.groups.filter(name__in=list(role_names)).exists())


def case_assignment_filter_for_user(user, user_groups):
    if constants.CADET in user_groups:
        return Q(assigned_cadet=user)
    if constants.POLICE_OFFICER in user_groups:
        return Q(assigned_police_officer=user)
    if constants.SERGEANT in user_groups:
        return Q(assigned_sergeant=user)
    if constants.CAPTAIN in user_groups:
        return Q(assigned_captain=user)
    if constants.POLICE_CHIEF in user_groups:
        return Q(assigned_chief=user)
    if constants.DETECTIVE in user_groups:
        return Q(assigned_detective=user)
    if constants.CORONER in user_groups:
        return Q(assigned_coroner=user)
    if constants.JUDGE in user_groups:
        return Q(assigned_judge=user)
    return None


def user_has_assignment_case_access(case, user, user_groups):
    assignment_filter = case_assignment_filter_for_user(user, user_groups)
    if assignment_filter is None:
        return False
    return Case.objects.filter(pk=case.pk).filter(assignment_filter).exists()


def user_can_access_case_workflow(case_obj, user):
    """
    Restrict workflow-state visibility/actions to actors actually involved in the
    case formation process (or system admin), without changing valid flows.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False

    user_groups = set(user.groups.values_list("name", flat=True))
    if constants.SYSTEM_ADMINISTRATOR in user_groups:
        return True

    if user == getattr(case_obj, "registered_by", None):
        return True

    if Complainant.objects.filter(case=case_obj, user=user).exists():
        return True

    if user_has_assignment_case_access(case_obj, user, user_groups):
        return True

    if CaseValidationReview.objects.filter(case=case_obj).filter(Q(source=user) | Q(destination=user)).exists():
        return True

    return False


def user_can_view_case_witnesses(case_obj, user):
    """
    Case witness list is sensitive follow-up data (phone/national_id), so keep it
    limited to related actors who can legitimately access the case.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False

    user_groups = set(user.groups.values_list("name", flat=True))
    if constants.SYSTEM_ADMINISTRATOR in user_groups:
        return True

    if user == getattr(case_obj, "registered_by", None):
        return True

    if Complainant.objects.filter(case=case_obj, user=user).exists():
        return True

    if user_has_assignment_case_access(case_obj, user, user_groups):
        return True

    if CaseWitness.objects.filter(case=case_obj, user=user).exists():
        return True

    if case_obj.testimonies.filter(Q(witness=user) | Q(submitter=user)).exists():
        return True

    return False


def create_case_witness_links_from_payload(case_obj, witness_entries):
    created = []
    seen_user_ids = set()
    rows = witness_entries if isinstance(witness_entries, list) else []
    for row in rows:
        if not isinstance(row, dict):
            continue
        raw_user_id = row.get("user_id") or row.get("id") or row.get("user")
        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            continue
        if user_id <= 0 or user_id in seen_user_ids:
            continue
        seen_user_ids.add(user_id)
        witness_user = User.objects.prefetch_related("groups").filter(id=user_id).first()
        if not witness_user:
            continue
        witness_roles = set(witness_user.groups.values_list("name", flat=True))
        if constants.WITNESS not in witness_roles or constants.COMPLAINANT in witness_roles:
            continue
        existing = CaseWitness.objects.filter(case=case_obj, user=witness_user).first()
        if existing:
            created.append(existing)
            continue
        created.append(
            CaseWitness.objects.create(
                case=case_obj,
                user=witness_user,
                phone_number=getattr(witness_user, "phone_number", "") or "",
                national_id=getattr(witness_user, "national_id", "") or "",
            )
        )
    return created


def build_self_assignments_for_crime_scene_creator(user):
    """
    Auto-assign the case creator to the matching assignment slot so admin does not
    need to repeat the same assignment immediately after crime-scene registration.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return {}
    role_names = set(user.groups.values_list("name", flat=True))
    assignments = {}
    if constants.DETECTIVE in role_names:
        assignments["assigned_detective"] = user
    if constants.CORONER in role_names:
        assignments["assigned_coroner"] = user
    if constants.POLICE_CHIEF in role_names:
        assignments["assigned_chief"] = user
    if constants.SERGEANT in role_names:
        assignments["assigned_sergeant"] = user
    if constants.CAPTAIN in role_names:
        assignments["assigned_captain"] = user
    if constants.POLICE_OFFICER in role_names:
        assignments["assigned_police_officer"] = user
    return assignments

def get_random_user_by_group(group_name):
    return (
        User.objects
        .filter(groups__name=group_name)
        .order_by("?")
        .first()
    )

@extend_schema_view(
    get=extend_schema(
        tags=["Cases"],
        summary="List cases",
        description="List cases visible to the current user based on role and assignments.",
        responses={200: CaseListSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["Cases"],
        summary="Create case",
        description="Create a case via complaint or crime scene formation path depending on role and creation_method.",
        request=CaseCreateSerializer,
        responses={201: CaseListSerializer},
    ),
)
class CaseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/cases/
    POST /api/cases/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CaseCreateSerializer
        return CaseListSerializer

    def get_queryset(self):
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))

        if constants.SYSTEM_ADMINISTRATOR in user_groups:
            return Case.objects.all().order_by('-created_at')

        assignment_filter = case_assignment_filter_for_user(user, user_groups)
        if assignment_filter is not None:
            return Case.objects.filter(assignment_filter).order_by('-created_at')

        if constants.COMPLAINANT in user_groups:
            return Case.objects.filter(
                Q(registered_by=user) | Q(complainants__user=user)
            ).distinct().order_by('-created_at')

        if constants.WITNESS in user_groups:
            return Case.objects.filter(
                Q(witnesses__user=user)
                | Q(testimonies__witness=user)
                | Q(testimonies__submitter=user)
            ).distinct().order_by('-updated_at', '-created_at')

        if user_groups.intersection({constants.BASIC_USER, constants.SUSPECT}):
            return Case.objects.all().order_by('-created_at')

        return Case.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        creation_method = serializer.validated_data.get("creation_method")

        if creation_method == Case.CreationMethod.COMPLAINT:
            if constants.COMPLAINANT not in user_groups:
                raise PermissionDenied(
                    "Only complainants can create cases via complaint."
                )
            initial_status = Case.Status.AWAITING_VALIDATION

        elif creation_method == Case.CreationMethod.CRIME_SCENE:
            allowed = {
                constants.POLICE_CHIEF,
                constants.CAPTAIN,
                constants.SERGEANT,
                constants.DETECTIVE,
                constants.POLICE_OFFICER,
            }
            if not user_groups.intersection(allowed):
                raise PermissionDenied(
                    "You do not have permission to create crime scene cases."
                )

            if constants.POLICE_CHIEF in user_groups:
                initial_status = Case.Status.OPEN
            else:
                initial_status = Case.Status.AWAITING_VALIDATION

        else:
            initial_status = Case.Status.AWAITING_VALIDATION

        save_kwargs = {
            "registered_by": user,
            "status": initial_status,
        }
        if creation_method == Case.CreationMethod.CRIME_SCENE:
            save_kwargs.update(build_self_assignments_for_crime_scene_creator(user))

        with transaction.atomic():
            serializer.save(**save_kwargs)
            created_case = serializer.instance

            if creation_method == Case.CreationMethod.COMPLAINT:
                Complainant.objects.create(
                    case=created_case,
                    user=user
                )
                cadet = getattr(created_case, "assigned_cadet", None)
                if cadet:
                    notify_case(
                        cadet,
                        created_case.id,
                        "New complaint case awaiting cadet review",
                        f"Case #{created_case.id} was created by complainant {user.username} and is waiting for cadet validation.",
                    )
            elif creation_method == Case.CreationMethod.CRIME_SCENE and initial_status == Case.Status.AWAITING_VALIDATION:
                created_witnesses = create_case_witness_links_from_payload(
                    created_case,
                    self.request.data.get("witnesses") or [],
                )
                if created_witnesses:
                    notify_many_case(
                        [item.user for item in created_witnesses if getattr(item, "user", None)],
                        created_case.id,
                        "You were added as a witness to a case",
                        f"You were recorded as a witness for Case #{created_case.id}.",
                    )
                superior = pick_crime_scene_superior_destination(created_case, user)
                if superior:
                    notify_case(
                        superior,
                        created_case.id,
                        "Crime scene case awaiting superior approval",
                        f"Case #{created_case.id} was registered by {user.username} and needs formation approval.",
                    )
            elif creation_method == Case.CreationMethod.CRIME_SCENE:
                created_witnesses = create_case_witness_links_from_payload(
                    created_case,
                    self.request.data.get("witnesses") or [],
                )
                if created_witnesses:
                    notify_many_case(
                        [item.user for item in created_witnesses if getattr(item, "user", None)],
                        created_case.id,
                        "You were added as a witness to a case",
                        f"You were recorded as a witness for Case #{created_case.id}.",
                    )


@extend_schema_view(
    get=extend_schema(
        tags=["Cases"],
        summary="Public overview statistics",
        description="Returns landing-page aggregate statistics (resolved cases, active cases, total employees).",
        responses={200: OpenApiTypes.OBJECT},
    )
)
class PublicOverviewView(APIView):
    """
    GET /api/cases/public-overview/
    Public landing-page statistics.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        employee_roles = {
            constants.SYSTEM_ADMINISTRATOR,
            constants.POLICE_CHIEF,
            constants.CAPTAIN,
            constants.SERGEANT,
            constants.DETECTIVE,
            constants.POLICE_OFFICER,
            constants.CADET,
            constants.CORONER,
            constants.JUDGE,
        }

        resolved_cases = Case.objects.filter(status=Case.Status.CLOSED).count()
        active_cases = Case.objects.exclude(
            status__in=[Case.Status.CLOSED, Case.Status.INVALIDATED]
        ).count()
        total_employees = (
            User.objects.filter(groups__name__in=list(employee_roles)).distinct().count()
        )

        return Response(
            {
                "resolved_cases": resolved_cases,
                "total_employees": total_employees,
                "active_cases": active_cases,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        tags=["Cases"],
        summary="List my related cases",
        description="Returns cases related to the current user based on role, assignments, complainant links, or witness links.",
        responses={200: CaseListSerializer(many=True)},
    )
)
class CaseMyListView(generics.ListAPIView):
    """
    GET /api/cases/my/
    Returns cases related to the current user based on role.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseListSerializer

    def get_queryset(self):
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        qs = Case.objects.all()

        if constants.SYSTEM_ADMINISTRATOR in user_groups or constants.POLICE_CHIEF in user_groups:
            return qs.order_by("-created_at")

        if constants.CADET in user_groups:
            return qs.filter(assigned_cadet=user).order_by("-created_at")

        if constants.POLICE_OFFICER in user_groups:
            return qs.filter(assigned_police_officer=user).order_by("-created_at")

        if constants.SERGEANT in user_groups:
            return qs.filter(assigned_sergeant=user).order_by("-created_at")

        if constants.CAPTAIN in user_groups:
            return qs.filter(assigned_captain=user).order_by("-created_at")

        if constants.DETECTIVE in user_groups:
            return qs.filter(assigned_detective=user).order_by("-created_at")

        if constants.CORONER in user_groups:
            return qs.filter(assigned_coroner=user).order_by("-created_at")

        if constants.JUDGE in user_groups:
            return qs.filter(assigned_judge=user).order_by("-created_at")

        if constants.WITNESS in user_groups:
            return (
                qs.filter(
                    Q(witnesses__user=user)
                    | Q(testimonies__witness=user)
                    | Q(testimonies__submitter=user)
                )
                .distinct()
                .order_by("-updated_at", "-created_at")
            )

        if user_groups.intersection({constants.COMPLAINANT, constants.BASIC_USER}):
            return qs.filter(Q(registered_by=user) | Q(complainants__user=user)).distinct().order_by("-created_at")

        return Case.objects.none()


@extend_schema_view(
    get=extend_schema(
        tags=["Cases"],
        summary="Get case detail (role-aware)",
        description="Returns case detail for users allowed to access the case.",
        responses={200: CaseListSerializer},
    ),
    patch=extend_schema(
        tags=["Cases"],
        summary="Patch case (partial update)",
        description="Used primarily for complainant-side revision flow and selected controlled updates.",
        request=CasePartialUpdateSerializer,
        responses={200: CaseListSerializer},
    ),
)
class CasePartialUpdateView(generics.RetrieveUpdateAPIView):
    """
    PATCH /api/cases/<id>/
    Used by complainant-side revision flow.
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Case.objects.all()
    http_method_names = ["get", "patch"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CaseListSerializer
        return CasePartialUpdateSerializer

    def get_object(self):
        case = super().get_object()
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))

        is_complainant_linked = Complainant.objects.filter(case=case, user=user).exists()
        is_witness_linked = CaseWitness.objects.filter(case=case, user=user).exists()
        has_witness_testimony = case.testimonies.filter(Q(witness=user) | Q(submitter=user)).exists()
        if self.request.method == "GET":
            if (
                user == case.registered_by
                or is_complainant_linked
                or is_witness_linked
                or has_witness_testimony
                or constants.SYSTEM_ADMINISTRATOR in user_groups
                or user_has_assignment_case_access(case, user, user_groups)
            ):
                return case
            raise PermissionDenied("You do not have permission to view this case.")

        if user == case.registered_by or is_complainant_linked or constants.SYSTEM_ADMINISTRATOR in user_groups:
            return case
        if constants.JUDGE in user_groups and case.assigned_judge_id == user.id:
            return case
        raise PermissionDenied("You do not have permission to edit this case.")

    def patch(self, request, *args, **kwargs):
        case = self.get_object()
        user = request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        is_system_admin = constants.SYSTEM_ADMINISTRATOR in user_groups
        is_assigned_judge = constants.JUDGE in user_groups and case.assigned_judge_id == user.id

        # Judge can only perform the final close action for their assigned case.
        if is_assigned_judge:
            payload = request.data if hasattr(request, "data") else {}
            payload_keys = {str(key) for key in payload.keys()}
            allowed_keys = {"status", "judicial_outcome"}
            if not payload_keys or not payload_keys.issubset(allowed_keys) or "status" not in payload_keys:
                raise PermissionDenied("Judge can only set final case status to CLOSED (with optional judicial_outcome) from report flow.")

            desired_status = str(payload.get("status") or "").strip().lower()
            if desired_status != Case.Status.CLOSED:
                return Response({"detail": "Judge can only set case status to CLOSED."}, status=status.HTTP_400_BAD_REQUEST)

            requested_outcome = str(payload.get("judicial_outcome") or "").strip().lower()
            if requested_outcome and requested_outcome not in {
                CaseSuspect.JudicialOutcome.CONVICTED,
                CaseSuspect.JudicialOutcome.ACQUITTED,
            }:
                return Response(
                    {"detail": "judicial_outcome must be one of: convicted, acquitted."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (case.status or "").strip().lower() == Case.Status.CLOSED:
                return Response(CaseListSerializer(case, context={"request": request}).data, status=status.HTTP_200_OK)

            suspect_statuses = [
                str(getattr(item, "arrest_status", "") or "").strip().lower()
                for item in case.suspects.all()
            ]
            if not suspect_statuses:
                return Response(
                    {"detail": "Cannot close case before trial stage. No suspect is attached to this case."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            blocking_statuses = {
                "awaiting_sergeant",
                "warrant_issued",
                "arrested",
                "awaiting_captain",
                "awaiting_chief",
            }
            if any(status_value in blocking_statuses for status_value in suspect_statuses):
                return Response(
                    {
                        "detail": "Police workflow is not complete. Judge can close the case only after suspects reach trial stage."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if "on_trial" not in suspect_statuses:
                return Response(
                    {"detail": "Case cannot be closed by judge before at least one suspect reaches ON_TRIAL."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                if requested_outcome:
                    case.suspects.filter(arrest_status=CaseSuspect.ArrestStatus.ON_TRIAL).update(
                        judicial_outcome=requested_outcome,
                        judicial_decided_at=timezone.now(),
                    )

                case.status = Case.Status.CLOSED
                case.save(update_fields=["status", "updated_at"])
            return Response(CaseListSerializer(case, context={"request": request}).data, status=status.HTTP_200_OK)

        # Non-judge patch flow (complainant revision / admin edits)
        serializer = self.get_serializer(case, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Keep status transitions controlled by dedicated workflow/judge endpoints.
        if not is_system_admin and "status" in request.data:
            requested_status = str(request.data.get("status") or "").strip().lower()
            current_status = str(case.status or "").strip().lower()
            if requested_status and requested_status != current_status:
                raise PermissionDenied("You do not have permission to change case status from this endpoint.")

        with transaction.atomic():
            serializer.save()

        case.refresh_from_db()
        return Response(CaseListSerializer(case, context={"request": request}).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["Cases Workflow"],
        summary="Reset judge verdict (temporary recovery)",
        description="Temporary recovery endpoint to reopen a closed case for the assigned judge and reset judicial outcomes to pending.",
        responses={200: CaseListSerializer},
        deprecated=True,
    )
)
class CaseJudgeVerdictResetView(APIView):
    """
    Temporary recovery endpoint for judge verdict reset.
    This is intended only to recover cases affected by the earlier bug where a
    verdict was recorded in the report log but case status stayed inconsistent.
    It reopens the case to AWAITING_TRIAL so the assigned judge can submit the
    verdict again from the UI after local verdict log cleanup.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        case = get_object_or_404(Case, pk=pk)
        user = request.user
        user_groups = set(user.groups.values_list("name", flat=True))

        if constants.JUDGE not in user_groups or case.assigned_judge_id != user.id:
            raise PermissionDenied("Only the assigned judge can reset the final verdict for this case.")

        with transaction.atomic():
            # Remove judicial outcome effects so judge can submit a fresh verdict.
            case.suspects.exclude(judicial_outcome=CaseSuspect.JudicialOutcome.PENDING).update(
                judicial_outcome=CaseSuspect.JudicialOutcome.PENDING,
                judicial_decided_at=None,
            )

            # Reopen only to the final pre-judge stage. If already open, keep current status.
            if str(case.status or "").strip().lower() == Case.Status.CLOSED:
                case.status = Case.Status.AWAITING_TRIAL
                case.save(update_fields=["status", "updated_at"])

        return Response(CaseListSerializer(case, context={"request": request}).data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["Cases Workflow"],
        summary="Join case as complainant",
        description="Allows a complainant/basic-user to join an existing case as complainant.",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
        examples=[
            OpenApiExample(
                "Join existing case",
                value={"case_id": 12},
                request_only=True,
            ),
            OpenApiExample(
                "Join success response",
                value={
                    "message": "You were added to this case.",
                    "case_id": 12,
                    "complainant_id": 33,
                    "already_joined": False,
                },
                response_only=True,
            ),
        ],
    )
)
class JoinCaseAsComplainantView(generics.CreateAPIView):
    """
    POST /api/cases/complainants/
    Body: {"case": <id>} or {"case_id": <id>}
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        if constants.WITNESS in user_groups:
            raise PermissionDenied("Witness users cannot join a case as complainant.")
        if constants.COMPLAINANT not in user_groups and constants.BASIC_USER not in user_groups:
            raise PermissionDenied("Only complainant/basic users can join a case as complainant.")

        case_id = request.data.get("case") or request.data.get("case_id")
        if not case_id:
            return Response({"detail": "case is required."}, status=status.HTTP_400_BAD_REQUEST)

        case = Case.objects.filter(pk=case_id).first()
        if not case:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)

        link, created = Complainant.objects.get_or_create(case=case, user=user)
        if created:
            targets = [getattr(case, "assigned_cadet", None), getattr(case, "assigned_police_officer", None)]
            notify_many_case(
                [target for target in targets if target],
                case.id,
                "A complainant joined the case",
                f"User {user.username} joined Case #{case.id} as a complainant.",
            )
        payload = {
            "message": "You were added to this case." if created else "You are already joined to this case.",
            "case_id": case.id,
            "complainant_id": link.id,
            "already_joined": not created,
        }
        return Response(payload, status=status.HTTP_200_OK)

@extend_schema_view(
    get=extend_schema(
        tags=["Cases Workflow"],
        summary="List case validation reviews",
        description="Lists validation review messages where the current user is source or destination.",
        responses={200: CaseValidationReviewListSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["Cases Workflow"],
        summary="Create case validation review",
        description="Create a case validation review message in the formation workflow.",
        request=CaseValidationReviewCreateSerializer,
        responses={201: CaseValidationReviewListSerializer},
        examples=[
            OpenApiExample(
                "Cadet returns case to complainant",
                value={
                    "case": 12,
                    "message": "Please complete missing incident location and upload a clearer attachment.",
                    "destination": 45,
                },
                request_only=True,
            ),
        ],
    ),
)
class CaseValidationReviewListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/cases/case-validation-reviews/
    POST /api/cases/case-validation-reviews/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseValidationReviewListSerializer

    # 🔹 LIST logic (unchanged)
    def get_queryset(self):
        user = self.request.user
        return CaseValidationReview.objects.filter(
            Q(source=user) | Q(destination=user)
        ).order_by("-created_at")

    # 🔹 CREATE logic (unchanged)
    def perform_create(self, serializer):
        user = self.request.user
        review_case = serializer.validated_data["case"]
        destination = serializer.validated_data.get("destination")

        user_groups = set(user.groups.values_list("name", flat=True))

        if destination is None:
            if constants.COMPLAINANT in user_groups:
                destination = get_random_user_by_group(constants.CADET)

            elif constants.CADET in user_groups:
                destination = get_random_user_by_group(constants.POLICE_OFFICER)

            elif user_groups.intersection(POLICE_REVIEW_ROLES):
                # Officer responding → send back to cadet
                destination = get_random_user_by_group(constants.CADET)

            else:
                raise PermissionDenied("Invalid role for review creation.")

        review = serializer.save(
            source=user,
            destination=destination,
        )
        notify_case_validation_event(
            destination,
            review_case,
            user,
            "Case validation review received",
            "sent a case validation review",
            str(serializer.validated_data.get("message") or ""),
        )

        complainant = review_case.registered_by

        rejection_count = CaseValidationReview.objects.filter(
            case=review_case,
            destination=complainant,
            validated=False,
        ).count()

        if rejection_count >= 3:
            review_case.status = Case.Status.INVALIDATED
            review_case.save(update_fields=["status"])

@extend_schema_view(
    patch=extend_schema(
        tags=["Cases Workflow"],
        summary="Validate case validation review",
        description="Resolve/validate a pending case validation review (destination reviewer only).",
        request=CaseValidationReviewCreateSerializer,
        responses={200: CaseValidationReviewListSerializer},
    )
)
class CaseValidationReviewValidateView(generics.UpdateAPIView):
    """
    PATCH /api/cases/case-validation-review/<id>/
    """
    http_method_names = ["patch"]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseValidationReviewCreateSerializer
    queryset = CaseValidationReview.objects.all()

    def perform_update(self, serializer):
        user = self.request.user
        review = self.get_object()
        user_groups = set(user.groups.values_list("name", flat=True))

        if not user_groups.intersection(POLICE_REVIEW_ROLES):
            raise PermissionDenied("Only police reviewers can validate cases.")

        if review.destination_id != user.id:
            raise PermissionDenied("Only the assigned destination reviewer can validate this case review.")

        if bool(review.resolved) or review.validated is not None:
            raise PermissionDenied("This case validation review has already been resolved.")

        serializer.save(validated=True, resolved=True)
        notify_many_case(
            complainant_recipients(review.case),
            review.case.id,
            "Case formation approved",
            f"{(primary_role_name(user) or 'User')} {user.username} approved case formation for Case #{review.case.id}.",
        )

        review.case.status = Case.Status.OPEN
        review.case.save(update_fields=["status"])


POLICE_REVIEW_ROLES = {
    constants.POLICE_OFFICER,
    constants.SERGEANT,
    constants.CAPTAIN,
    constants.POLICE_CHIEF,
}


def user_group_names(user):
    return set(user.groups.values_list("name", flat=True))


def primary_role_name(user):
    return user.groups.values_list("name", flat=True).first() or ""


def user_has_any_role(user, roles):
    return bool(user_group_names(user).intersection(set(roles)))


def is_complainant_actor(user, case):
    if user == case.registered_by:
        return True
    return Complainant.objects.filter(case=case, user=user).exists()


def is_cadet_actor(user):
    return constants.CADET in user_group_names(user)


def is_police_reviewer_actor(user):
    return bool(user_group_names(user).intersection(POLICE_REVIEW_ROLES))


def is_coroner_actor(user):
    return constants.CORONER in user_group_names(user)


def role_rank_for_validation(user):
    groups = user_group_names(user)
    if constants.POLICE_CHIEF in groups:
        return 5
    if constants.CAPTAIN in groups:
        return 4
    if constants.SERGEANT in groups:
        return 3
    if constants.DETECTIVE in groups or constants.CORONER in groups:
        return 2
    if constants.POLICE_OFFICER in groups:
        return 2
    if constants.CADET in groups:
        return 1
    return 0


def can_approve_crime_scene_as_superior(actor, creator):
    if is_coroner_actor(actor):
        return True
    if is_cadet_actor(actor):
        return False
    return role_rank_for_validation(actor) > role_rank_for_validation(creator)


def pick_user_from_groups(group_names, exclude_user_ids=None):
    exclude_user_ids = {int(value) for value in (exclude_user_ids or []) if int(value) > 0}
    queryset = User.objects.filter(groups__name__in=list(group_names)).distinct()
    if exclude_user_ids:
        queryset = queryset.exclude(id__in=list(exclude_user_ids))
    return queryset.order_by("?").first()


def pick_cadet_destination(case_obj, actor=None):
    assigned = getattr(case_obj, "assigned_cadet", None)
    if assigned and constants.CADET in user_group_names(assigned):
        return assigned
    exclude = [actor.id] if actor else []
    return pick_user_from_groups([constants.CADET], exclude)


def pick_complainant_destination(case_obj):
    if case_obj.registered_by:
        return case_obj.registered_by
    link = Complainant.objects.filter(case=case_obj).select_related("user").order_by("id").first()
    return link.user if link else None


def pick_officer_review_destination(case_obj, actor=None):
    candidates = []
    assigned_officer = getattr(case_obj, "assigned_police_officer", None)
    if assigned_officer and user_group_names(assigned_officer).intersection(POLICE_REVIEW_ROLES):
        candidates.append(assigned_officer)
    for field_name in ["assigned_sergeant", "assigned_captain"]:
        candidate = getattr(case_obj, field_name, None)
        if candidate and user_group_names(candidate).intersection(POLICE_REVIEW_ROLES):
            candidates.append(candidate)
    if case_obj.registered_by and user_group_names(case_obj.registered_by).intersection(POLICE_REVIEW_ROLES):
        candidates.append(case_obj.registered_by)
    for candidate in candidates:
        if actor and candidate.id == actor.id:
            continue
        return candidate
    exclude = [actor.id] if actor else []
    return pick_user_from_groups(list(POLICE_REVIEW_ROLES), exclude)


def pick_crime_scene_superior_destination(case_obj, actor=None):
    creator = case_obj.registered_by
    creator_rank = role_rank_for_validation(creator) if creator else 0
    ordered_candidates = [
        getattr(case_obj, "assigned_sergeant", None),
        getattr(case_obj, "assigned_captain", None),
        None,  # placeholder for chief if later added to model
    ]
    if creator and constants.POLICE_CHIEF in user_group_names(creator):
        return None
    for candidate in ordered_candidates:
        if not candidate:
            continue
        if actor and candidate.id == actor.id:
            continue
        if role_rank_for_validation(candidate) > creator_rank:
            return candidate
    if creator_rank < 3:
        groups = [constants.SERGEANT, constants.CAPTAIN, constants.POLICE_CHIEF]
    elif creator_rank < 4:
        groups = [constants.CAPTAIN, constants.POLICE_CHIEF]
    elif creator_rank < 5:
        groups = [constants.POLICE_CHIEF]
    else:
        groups = [constants.POLICE_CHIEF]
    exclude = [actor.id] if actor else []
    return pick_user_from_groups(groups, exclude)


def latest_case_reviews(case_obj):
    return list(
        CaseValidationReview.objects
        .filter(case=case_obj)
        .select_related("source", "destination")
        .order_by("-created_at", "-id")
    )


def infer_workflow_stage(case_obj, reviews):
    case_status = (case_obj.status or "").strip().lower()
    path = (case_obj.creation_method or "").strip().lower()
    if case_status == Case.Status.INVALIDATED:
        return "voided"
    if case_status in {Case.Status.OPEN, Case.Status.UNDER_INVESTIGATION, Case.Status.AWAITING_TRIAL, Case.Status.CLOSED}:
        return "formed"
    if case_status != Case.Status.AWAITING_VALIDATION:
        return "formed"

    latest = reviews[0] if reviews else None
    if not latest:
        return "pending_superior_approval" if path == Case.CreationMethod.CRIME_SCENE else "pending_cadet_review"

    dest_groups = user_group_names(latest.destination)
    src_groups = user_group_names(latest.source)
    if path == Case.CreationMethod.CRIME_SCENE:
        if constants.CORONER in dest_groups or dest_groups.intersection(POLICE_REVIEW_ROLES):
            return "pending_superior_approval"
        return "needs_creator_revision"

    if constants.CADET in dest_groups:
        if src_groups.intersection(POLICE_REVIEW_ROLES):
            return "pending_cadet_recheck"
        return "pending_cadet_review"
    if dest_groups.intersection(POLICE_REVIEW_ROLES):
        return "pending_officer_review"
    return "needs_complainant_revision"


def build_case_workflow_payload(case_obj):
    reviews = latest_case_reviews(case_obj)
    stage = infer_workflow_stage(case_obj, reviews)
    path = (case_obj.creation_method or "").strip().lower() or "complaint"
    latest = reviews[0] if reviews else None

    complainant_rejections = CaseValidationReview.objects.filter(
        case=case_obj,
        validated=False,
        destination__groups__name__in=[constants.COMPLAINANT, constants.BASIC_USER],
    ).distinct().count()

    history = []
    for row in reversed(reviews[:50]):
        history.append(
            {
                "id": row.id,
                "at": row.created_at.isoformat() if row.created_at else None,
                "action": "case_validation_review",
                "by_user_id": row.source_id,
                "by_role": primary_role_name(row.source),
                "from_user_id": row.source_id,
                "from_role": primary_role_name(row.source),
                "to_user_id": row.destination_id,
                "to_role": primary_role_name(row.destination),
                "comment": row.message or "",
                "validated": row.validated,
                "resolved": row.resolved,
            }
        )

    is_voided = stage == "voided" or case_obj.status == Case.Status.INVALIDATED
    formed = stage == "formed" and not is_voided
    return {
        "path": path,
        "stage": stage,
        "status": stage,
        "rejection_count": complainant_rejections,
        "complainant_revision_count": complainant_rejections,
        "last_comment": latest.message if latest else "",
        "is_voided": is_voided,
        "formed": formed,
        "last_actor_role": primary_role_name(latest.source) if latest else "",
        "history": history,
    }


@extend_schema_view(
    get=extend_schema(
        tags=["Cases Workflow"],
        summary="Get case formation workflow state",
        description="Returns current complaint/crime-scene formation workflow state and history for a case.",
        responses={200: OpenApiTypes.OBJECT},
    ),
    post=extend_schema(
        tags=["Cases Workflow"],
        summary="Apply case formation workflow action",
        description="Applies a workflow transition action (cadet/officer/complainant/superior) and returns updated workflow state.",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
        examples=[
            OpenApiExample(
                "Cadet forwards to officer",
                value={
                    "action": "cadet_forward_to_officer",
                    "comment": "All required complaint data is complete. Forwarding for officer review.",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Officer returns to cadet",
                value={
                    "action": "officer_return_to_cadet",
                    "comment": "Need cadet re-check for witness contact information.",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Workflow response snapshot",
                value={
                    "path": "complaint",
                    "stage": "pending_officer_review",
                    "status": "pending_officer_review",
                    "rejection_count": 0,
                    "complainant_revision_count": 0,
                    "last_comment": "Forwarding for officer review.",
                    "is_voided": False,
                    "formed": False,
                    "last_actor_role": "Cadet",
                    "history": [],
                },
                response_only=True,
            ),
        ],
    ),
)
class CaseWorkflowTransitionView(APIView):
    """
    GET  /api/cases/<id>/transition/   -> current workflow state
    POST /api/cases/<id>/transition/   -> apply workflow action
    Body: { action, comment? }
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        case_obj = get_object_or_404(Case, pk=pk)
        if not user_can_access_case_workflow(case_obj, request.user):
            raise PermissionDenied("You do not have permission to view this case workflow.")
        return Response(build_case_workflow_payload(case_obj), status=status.HTTP_200_OK)

    def post(self, request, pk):
        case_obj = get_object_or_404(Case, pk=pk)
        if not user_can_access_case_workflow(case_obj, request.user):
            raise PermissionDenied("You do not have permission to modify this case workflow.")
        user = request.user
        action = str(request.data.get("action") or "").strip().lower()
        comment = str(request.data.get("comment") or "").strip()

        if not action:
            return Response({"detail": "action is required."}, status=status.HTTP_400_BAD_REQUEST)

        workflow = build_case_workflow_payload(case_obj)
        stage = workflow.get("stage")
        path = workflow.get("path")

        if workflow.get("is_voided"):
            return Response({"detail": "This case workflow is voided and cannot be transitioned."}, status=status.HTTP_400_BAD_REQUEST)

        def require_comment():
            if not comment:
                raise PermissionDenied("A workflow message/comment is required for this action.")

        def create_review(destination, validated=None, resolved=True):
            if destination is None:
                raise PermissionDenied("No valid destination user is available for this workflow action.")
            return CaseValidationReview.objects.create(
                case=case_obj,
                source=user,
                destination=destination,
                message=comment,
                validated=validated,
                resolved=resolved,
            )

        def notify_dest(destination, title, action_phrase):
            notify_case_validation_event(destination, case_obj, user, title, action_phrase, comment)

        def notify_complainants(title, action_phrase):
            notify_many_case(
                complainant_recipients(case_obj),
                case_obj.id,
                title,
                f"{(primary_role_name(user) or 'User')} {user.username} {action_phrase} for Case #{case_obj.id}."
                + (f" Message: {comment}" if comment else ""),
            )

        if path == Case.CreationMethod.COMPLAINT:
            if action == "complainant_resubmit":
                if not is_complainant_actor(user, case_obj):
                    raise PermissionDenied("Only complainants can re-submit this complaint.")
                if stage != "needs_complainant_revision":
                    return Response({"detail": "Complaint re-submission is only allowed after revision request."}, status=status.HTTP_400_BAD_REQUEST)
                destination = pick_cadet_destination(case_obj, user)
                create_review(destination, validated=None, resolved=False)
                notify_dest(destination, "Complaint resubmitted", "re-submitted the complaint")
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "cadet_request_revision":
                if not is_cadet_actor(user):
                    raise PermissionDenied("Only cadet can return complaint to complainant.")
                if stage not in {"pending_cadet_review", "pending_cadet_recheck"}:
                    return Response({"detail": "Cadet revision request is not valid at this stage."}, status=status.HTTP_400_BAD_REQUEST)
                require_comment()
                destination = pick_complainant_destination(case_obj)
                create_review(destination, validated=False, resolved=True)
                notify_dest(destination, "Complaint revision requested", "requested complaint revision")
                rejection_count = CaseValidationReview.objects.filter(
                    case=case_obj,
                    validated=False,
                    destination__groups__name__in=[constants.COMPLAINANT, constants.BASIC_USER],
                ).distinct().count()
                if rejection_count >= 3:
                    case_obj.status = Case.Status.INVALIDATED
                else:
                    case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "cadet_forward_to_officer":
                if not is_cadet_actor(user):
                    raise PermissionDenied("Only cadet can forward complaint to officer.")
                if stage not in {"pending_cadet_review", "pending_cadet_recheck"}:
                    return Response({"detail": "Cadet approval is not valid at this stage."}, status=status.HTTP_400_BAD_REQUEST)
                destination = pick_officer_review_destination(case_obj, user)
                create_review(destination, validated=None, resolved=False)
                notify_dest(destination, "Complaint forwarded for officer review", "forwarded the complaint to officer review")
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "officer_return_to_cadet":
                if not is_police_reviewer_actor(user):
                    raise PermissionDenied("Only police reviewers can return complaint to cadet.")
                if stage != "pending_officer_review":
                    return Response({"detail": "Officer recheck request is only valid in pending officer review stage."}, status=status.HTTP_400_BAD_REQUEST)
                require_comment()
                destination = pick_cadet_destination(case_obj, user)
                create_review(destination, validated=False, resolved=True)
                notify_dest(destination, "Complaint returned to cadet", "returned the complaint to cadet review")
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "officer_approve_formation":
                if not is_police_reviewer_actor(user):
                    raise PermissionDenied("Only police reviewers can approve complaint formation.")
                if stage != "pending_officer_review":
                    return Response({"detail": "Complaint approval is only valid in pending officer review stage."}, status=status.HTTP_400_BAD_REQUEST)
                create_review(user, validated=True, resolved=True)
                notify_complainants("Case formation approved", "approved case formation")
                notify_many_case(
                    [getattr(case_obj, "assigned_cadet", None)],
                    case_obj.id,
                    "Case formation approved",
                    f"{(primary_role_name(user) or 'User')} {user.username} approved case formation for Case #{case_obj.id}.",
                )
                case_obj.status = Case.Status.OPEN
                case_obj.save(update_fields=["status", "updated_at"])
            else:
                return Response({"detail": "Unsupported complaint workflow action."}, status=status.HTTP_400_BAD_REQUEST)

        elif path == Case.CreationMethod.CRIME_SCENE:
            creator = case_obj.registered_by
            if action == "creator_resubmit_for_approval":
                if not creator or creator != user:
                    raise PermissionDenied("Only the case creator can re-submit this crime scene case.")
                if stage != "needs_creator_revision":
                    return Response({"detail": "Creator re-submission is only allowed after superior revision request."}, status=status.HTTP_400_BAD_REQUEST)
                destination = pick_crime_scene_superior_destination(case_obj, user)
                create_review(destination, validated=None, resolved=False)
                notify_dest(destination, "Crime scene case resubmitted", "re-submitted the crime scene case for superior approval")
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "superior_request_creator_revision":
                if not creator or not can_approve_crime_scene_as_superior(user, creator):
                    raise PermissionDenied("This role is not allowed to review this crime scene case.")
                if stage != "pending_superior_approval":
                    return Response({"detail": "Superior revision request is only valid in pending superior approval stage."}, status=status.HTTP_400_BAD_REQUEST)
                require_comment()
                create_review(creator, validated=False, resolved=True)
                notify_dest(creator, "Crime scene case revision requested", "requested creator revision on the crime scene case")
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "superior_approve_formation":
                if not creator or not can_approve_crime_scene_as_superior(user, creator):
                    raise PermissionDenied("This role is not allowed to approve this crime scene case.")
                if stage != "pending_superior_approval":
                    return Response({"detail": "Superior approval is only valid in pending superior approval stage."}, status=status.HTTP_400_BAD_REQUEST)
                create_review(user, validated=True, resolved=True)
                if creator and creator != user:
                    notify_case_validation_event(
                        creator,
                        case_obj,
                        user,
                        "Crime scene case formation approved",
                        "approved crime scene case formation",
                        comment,
                    )
                case_obj.status = Case.Status.OPEN
                case_obj.save(update_fields=["status", "updated_at"])
            else:
                return Response({"detail": "Unsupported crime-scene workflow action."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Unsupported case workflow path."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(build_case_workflow_payload(case_obj), status=status.HTTP_200_OK)

@extend_schema_view(
    post=extend_schema(
        tags=["Cases Witnesses"],
        summary="Add witness to case",
        description="Add a registered system user with Witness role to a case (authorized police/admin roles only).",
        request=CaseWitnessCreateSerializer,
        responses={201: CaseWitnessCreateSerializer},
    )
)
class CaseWitnessCreateView(generics.CreateAPIView):
    """
    POST /api/cases/witnesses/
    Body: {"case": <id>, "user_id": <system_user_id>}
    Police/admin adds a registered system user as case witness.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseWitnessCreateSerializer
    queryset = CaseWitness.objects.all()

    def create(self, request, *args, **kwargs):
        role_names = set(request.user.groups.values_list("name", flat=True))
        allowed = {
            constants.SYSTEM_ADMINISTRATOR,
            constants.POLICE_OFFICER,
            constants.DETECTIVE,
            constants.SERGEANT,
            constants.CAPTAIN,
            constants.POLICE_CHIEF,
            constants.CORONER,
        }
        if not role_names.intersection(allowed):
            raise PermissionDenied("Only authorized police/admin roles can add witnesses to a case.")
        if request.data.get("user_id") in (None, "", 0, "0"):
            return Response(
                {"detail": "user_id is required and must refer to a registered witness user."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context

    def perform_create(self, serializer):
        witness = serializer.save()
        if getattr(witness, "user", None):
            notify_case(
                witness.user,
                witness.case_id,
                "You were added as a witness to a case",
                f"{request_user_label(self.request.user)} added you as a witness to Case #{witness.case_id}.",
            )


@extend_schema_view(
    get=extend_schema(
        tags=["Cases Witnesses"],
        summary="List case witnesses",
        description="List witness links for a case (role/relationship restricted).",
        responses={200: CaseWitnessCreateSerializer(many=True)},
    )
)
class CaseWitnessListView(generics.ListAPIView):
    """
    GET /api/cases/<pk>/witnesses/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseWitnessCreateSerializer

    def get_queryset(self):
        case_pk = self.kwargs["pk"]
        case_obj = get_object_or_404(Case, pk=case_pk)
        if not user_can_view_case_witnesses(case_obj, self.request.user):
            raise PermissionDenied("You do not have permission to view case witness records.")
        return CaseWitness.objects.select_related("user").filter(case_id=case_pk).order_by("id")


def request_user_label(user):
    return f"{(primary_role_name(user) or 'User')} {getattr(user, 'username', 'user')}"


@extend_schema_view(
    get=extend_schema(
        tags=["Cases Witnesses"],
        summary="List witness candidates",
        description="List registered users that can be selected as witnesses.",
        parameters=[
            OpenApiParameter("q", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description="Search by username/name/phone/national_id"),
        ],
        responses={200: WitnessCandidateSerializer(many=True)},
    )
)
class WitnessCandidateListView(generics.ListAPIView):
    """
    GET /api/cases/witness-candidates/?q=
    Returns registered system users that can be selected as witnesses.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WitnessCandidateSerializer

    def get_queryset(self):
        role_names = set(self.request.user.groups.values_list("name", flat=True))
        allowed = {
            constants.SYSTEM_ADMINISTRATOR,
            constants.POLICE_OFFICER,
            constants.DETECTIVE,
            constants.SERGEANT,
            constants.CAPTAIN,
            constants.POLICE_CHIEF,
            constants.CORONER,
        }
        if not role_names.intersection(allowed):
            raise PermissionDenied("You do not have permission to view witness candidates.")

        qs = (
            User.objects.filter(groups__name=constants.WITNESS)
            .exclude(groups__name=constants.COMPLAINANT)
            .distinct()
            .order_by("username")
        )
        q = str(self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(username__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone_number__icontains=q)
                | Q(national_id__icontains=q)
            )
        return qs[:200]


@extend_schema_view(
    post=extend_schema(
        tags=["Cases Witnesses"],
        summary="Join case as witness",
        description="Allows a witness-role user to self-join an existing case as witness.",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
    )
)
class WitnessJoinCaseView(APIView):
    """
    POST /api/cases/witnesses/join/
    Body: {"case": <id>} or {"case_id": <id>}
    A registered witness joins an existing case.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        role_names = set(user.groups.values_list("name", flat=True))
        if constants.COMPLAINANT in role_names:
            raise PermissionDenied("Complainant users cannot join a case as witness.")
        if constants.WITNESS not in role_names:
            raise PermissionDenied("Only witness users can join a case as witness.")

        case_id = request.data.get("case") or request.data.get("case_id")
        if not case_id:
            return Response({"detail": "case is required."}, status=status.HTTP_400_BAD_REQUEST)

        case_obj = Case.objects.filter(pk=case_id).first()
        if not case_obj:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)

        existing = CaseWitness.objects.filter(case=case_obj, user=user).first()
        created = False
        if not existing:
            existing = CaseWitness.objects.create(
                case=case_obj,
                user=user,
                phone_number=getattr(user, "phone_number", "") or "",
                national_id=getattr(user, "national_id", "") or "",
            )
            created = True

            notify_many_case(
                [
                    getattr(case_obj, "assigned_cadet", None),
                    getattr(case_obj, "assigned_police_officer", None),
                    getattr(case_obj, "assigned_detective", None),
                    getattr(case_obj, "assigned_sergeant", None),
                    getattr(case_obj, "assigned_captain", None),
                    getattr(case_obj, "registered_by", None),
                ],
                case_obj.id,
                "A witness joined the case",
                f"User {user.username} joined Case #{case_obj.id} as a witness.",
            )

        payload = CaseWitnessCreateSerializer(existing, context={"request": request}).data
        return Response(
            {
                "message": "You were added as a witness to this case." if created else "You are already registered as a witness on this case.",
                "already_joined": not created,
                "case_id": case_obj.id,
                "witness": payload,
            },
            status=status.HTTP_200_OK,
        )
