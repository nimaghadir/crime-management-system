# cases/views.py
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts import constants

from .models import Case, Complainant, CaseValidationReview, CaseWitness

from .serializers import (
    CaseListSerializer,
    CaseCreateSerializer,
    CasePartialUpdateSerializer,
    CaseValidationReviewListSerializer,
    CaseValidationReviewCreateSerializer,
    CaseWitnessCreateSerializer,
)

User = get_user_model()

def get_random_user_by_group(group_name):
    return (
        User.objects
        .filter(groups__name=group_name)
        .order_by("?")
        .first()
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

        police_roles = {
            'Police Chief',
            'Captain',
            'Sergeant',
            'Detective',
            'Police Officer',
            'Cadet',
        }

        if user_groups.intersection(police_roles):
            return Case.objects.all().order_by('-created_at')

        if 'Complainant' in user_groups:
            return Case.objects.filter(
                registered_by=user
            ).order_by('-created_at')

        return Case.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        creation_method = serializer.validated_data.get("creation_method")

        if creation_method == Case.CreationMethod.COMPLAINT:
            if "Complainant" not in user_groups:
                raise PermissionDenied(
                    "Only complainants can create cases via complaint."
                )
            initial_status = Case.Status.AWAITING_VALIDATION

        elif creation_method == Case.CreationMethod.CRIME_SCENE:
            allowed = {
                "Police chief",
                "Captain",
                "Sergeant",
                "Detective",
                "Police Officer",
            }
            if not user_groups.intersection(allowed):
                raise PermissionDenied(
                    "You do not have permission to create crime scene cases."
                )

            if "Police chief" in user_groups:
                initial_status = Case.Status.OPEN
            else:
                initial_status = Case.Status.AWAITING_VALIDATION

        else:
            initial_status = Case.Status.AWAITING_VALIDATION

        serializer.save(
            registered_by=user,
            status=initial_status
        )

        if creation_method == Case.CreationMethod.COMPLAINT:
            Complainant.objects.create(
                case=serializer.instance,
                user=user
            )


class CasePartialUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/cases/<id>/
    Used by complainant-side revision flow.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CasePartialUpdateSerializer
    queryset = Case.objects.all()
    http_method_names = ["patch"]

    def get_object(self):
        case = super().get_object()
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))

        is_complainant_linked = Complainant.objects.filter(case=case, user=user).exists()
        if user == case.registered_by or is_complainant_linked or constants.SYSTEM_ADMINISTRATOR in user_groups:
            return case
        raise PermissionDenied("You do not have permission to edit this case.")


class JoinCaseAsComplainantView(generics.CreateAPIView):
    """
    POST /api/cases/complainants/
    Body: {"case": <id>} or {"case_id": <id>}
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        if constants.COMPLAINANT not in user_groups and constants.BASIC_USER not in user_groups:
            raise PermissionDenied("Only complainant/basic users can join a case as complainant.")

        case_id = request.data.get("case") or request.data.get("case_id")
        if not case_id:
            return Response({"detail": "case is required."}, status=status.HTTP_400_BAD_REQUEST)

        case = Case.objects.filter(pk=case_id).first()
        if not case:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)

        link, created = Complainant.objects.get_or_create(case=case, user=user)
        payload = {
            "message": "You were added to this case." if created else "You are already joined to this case.",
            "case_id": case.id,
            "complainant_id": link.id,
            "already_joined": not created,
        }
        return Response(payload, status=status.HTTP_200_OK)

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
            if "Complainant" in user_groups:
                destination = get_random_user_by_group(constants.CADET)

            elif constants.CADET in user_groups:
                destination = get_random_user_by_group(constants.POLICE_OFFICER)

            elif user_groups.intersection(
                {
                    constants.POLICE_OFFICER,
                    constants.SERGEANT,
                    constants.CAPTAIN,
                    constants.POLICE_CHIEF,
                }
            ):
                # Officer responding → send back to cadet
                destination = get_random_user_by_group(constants.CADET)

            else:
                raise PermissionDenied("Invalid role for review creation.")

        review = serializer.save(
            source=user,
            destination=destination,
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

        if not user_groups.intersection(
            {constants.POLICE_OFFICER, constants.SERGEANT, constants.CAPTAIN, constants.POLICE_CHIEF}
        ):
            raise PermissionDenied("Only police officers can validate cases.")

        serializer.save(validated=True, resolved=True)

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
    if constants.POLICE_OFFICER in groups or constants.PATROL_OFFICER in groups:
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
                "comment": row.message or "",
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


class CaseWorkflowTransitionView(APIView):
    """
    POST /api/cases/<id>/transition/
    Body: { action, comment? }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        case_obj = get_object_or_404(Case, pk=pk)
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

        if path == Case.CreationMethod.COMPLAINT:
            if action == "complainant_resubmit":
                if not is_complainant_actor(user, case_obj):
                    raise PermissionDenied("Only complainants can re-submit this complaint.")
                if stage != "needs_complainant_revision":
                    return Response({"detail": "Complaint re-submission is only allowed after revision request."}, status=status.HTTP_400_BAD_REQUEST)
                destination = pick_cadet_destination(case_obj, user)
                create_review(destination, validated=None, resolved=False)
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
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "officer_approve_formation":
                if not is_police_reviewer_actor(user):
                    raise PermissionDenied("Only police reviewers can approve complaint formation.")
                if stage != "pending_officer_review":
                    return Response({"detail": "Complaint approval is only valid in pending officer review stage."}, status=status.HTTP_400_BAD_REQUEST)
                create_review(user, validated=True, resolved=True)
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
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "superior_request_creator_revision":
                if not creator or not can_approve_crime_scene_as_superior(user, creator):
                    raise PermissionDenied("This role is not allowed to review this crime scene case.")
                if stage != "pending_superior_approval":
                    return Response({"detail": "Superior revision request is only valid in pending superior approval stage."}, status=status.HTTP_400_BAD_REQUEST)
                require_comment()
                create_review(creator, validated=False, resolved=True)
                case_obj.status = Case.Status.AWAITING_VALIDATION
                case_obj.save(update_fields=["status", "updated_at"])

            elif action == "superior_approve_formation":
                if not creator or not can_approve_crime_scene_as_superior(user, creator):
                    raise PermissionDenied("This role is not allowed to approve this crime scene case.")
                if stage != "pending_superior_approval":
                    return Response({"detail": "Superior approval is only valid in pending superior approval stage."}, status=status.HTTP_400_BAD_REQUEST)
                create_review(user, validated=True, resolved=True)
                case_obj.status = Case.Status.OPEN
                case_obj.save(update_fields=["status", "updated_at"])
            else:
                return Response({"detail": "Unsupported crime-scene workflow action."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Unsupported case workflow path."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(build_case_workflow_payload(case_obj), status=status.HTTP_200_OK)

class CaseWitnessCreateView(generics.CreateAPIView):
    """
    POST /api/cases/witnesses/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseWitnessCreateSerializer
    queryset = CaseWitness.objects.all()


class CaseWitnessListView(generics.ListAPIView):
    """
    GET /api/cases/<pk>/witnesses/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseWitnessCreateSerializer

    def get_queryset(self):
        case_pk = self.kwargs["pk"]
        return CaseWitness.objects.filter(case_id=case_pk)
