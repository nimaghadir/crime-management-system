from decimal import Decimal, InvalidOperation
import json
from urllib import error as urllib_error
from urllib import request as urllib_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
import re
from django.db.models import Q

from django.contrib.auth import get_user_model
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone

from cases.models import Case, Complainant, CaseWitness, CaseSuspect
from financials.models import RewardTip
from notifications.utils import notify_case, notify_many_case
from evidence.models import (
    TestimonyEvidence,
    BiologicalEvidence,
    VehicleEvidence,
    IdentificationDocument,
    OtherEvidence,
)
from .models import (
    DetectiveBoardLayout,
    InvestigationAction,
    DetectiveBoardNote,
    DetectiveBoardRelation,
)
from .permissions import CanViewCaseReport
from accounts.constants import DETECTIVE, SUSPECT, SYSTEM_ADMINISTRATOR, JUDGE
from accounts.constants import POLICE_CHIEF, CAPTAIN, SERGEANT

from .serializers import (
    CaseReportSerializer,
    ComplainantSerializer,
    CaseSuspectSerializer,
    CaseWitnessSerializer,
    RewardTipSerializer,
    UserSerializer,
    CreateCaseSuspectSerializer,
    UpdateCaseSuspectSerializer,
    ArrestFieldsCaseSuspectSerializer,
    InvestigationActionSerializer,
    DetectiveBoardNoteSerializer,
    DetectiveBoardRelationSerializer,
)


User = get_user_model()
BOARD_NODE_KEY_RE = re.compile(r"^[esn]-\d+$")
JUDGE_VERDICT_ACTION_TYPES = {"judge_final_verdict", "judge_verdict"}


def _notify_suspect_workflow(case_obj, actor, suspect_row, previous_status, new_status):
    actor_name = getattr(actor, "username", "System")
    suspect_name = getattr(getattr(suspect_row, "suspect", None), "username", f"Suspect #{suspect_row.id}")
    previous_norm = str(previous_status or "").strip().lower()
    new_norm = str(new_status or "").strip().lower()
    if previous_norm == new_norm:
        return

    detective = getattr(case_obj, "assigned_detective", None)
    sergeant = getattr(case_obj, "assigned_sergeant", None)
    captain = getattr(case_obj, "assigned_captain", None)
    chief = getattr(case_obj, "assigned_chief", None)

    if new_norm == CaseSuspect.ArrestStatus.WARRANT_ISSUED:
        notify_case(
            detective,
            case_obj.id,
            "Suspect referral approved",
            f"{actor_name} approved referral for {suspect_name} and issued arrest warrant.",
        )
        return

    if new_norm == CaseSuspect.ArrestStatus.FREE:
        notify_case(
            detective,
            case_obj.id,
            "Suspect referral rejected / suspect released",
            f"{actor_name} moved {suspect_name} to FREE. Review comments in suspect workflow.",
        )
        return

    if new_norm == CaseSuspect.ArrestStatus.ARRESTED:
        notify_many_case(
            [detective, sergeant, captain],
            case_obj.id,
            "Suspect arrested",
            f"{actor_name} marked {suspect_name} as ARRESTED. Interrogation scoring is now available.",
        )
        return

    if new_norm == CaseSuspect.ArrestStatus.AWAITING_CAPTAIN:
        notify_case(
            captain,
            case_obj.id,
            "Suspect interrogation package ready",
            f"{actor_name} submitted interrogation details for {suspect_name}. Captain review is required.",
        )
        return

    if new_norm == CaseSuspect.ArrestStatus.AWAITING_CHIEF:
        notify_case(
            chief,
            case_obj.id,
            "Critical suspect verdict requires chief review",
            f"{actor_name} escalated {suspect_name} for chief review.",
        )
        return

    if new_norm == CaseSuspect.ArrestStatus.ON_TRIAL:
        notify_many_case(
            [detective, sergeant, captain, chief, getattr(case_obj, "assigned_judge", None)],
            case_obj.id,
            "Suspect sent to trial",
            f"{actor_name} moved {suspect_name} to ON_TRIAL.",
        )


class CaseSuspectCreateUpdateView(generics.GenericAPIView):
    """
    POST   /api/investigations/suspects/          → detective creates CaseSuspect
    PATCH  /api/investigations/suspects/<pk>/     → sergeant / captain / chief update
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            suspect = self.get_object()
            role_names = set(self.request.user.groups.values_list("name", flat=True))
            payload_keys = set(getattr(self.request, "data", {}).keys())
            arrest_detail_fields = {
                "confession_transcript",
                "detective_guilt_score",
                "sergeant_guilt_score",
            }
            if (
                suspect.arrest_status == CaseSuspect.ArrestStatus.ARRESTED
                and role_names.intersection({DETECTIVE, SERGEANT})
                and payload_keys.intersection(arrest_detail_fields)
            ):
                return ArrestFieldsCaseSuspectSerializer

            return UpdateCaseSuspectSerializer

        return CreateCaseSuspectSerializer

    def get_object(self):
        pk       = self.kwargs.get('pk')
        role     = self.request.user.groups.values_list('name', flat=True).first()
        suspect  = get_object_or_404(
            CaseSuspect.objects.select_related('case'),
            pk=pk
        )
        return suspect

    def get(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        if pk:
            suspect = self.get_object()
            serializer = CaseSuspectSerializer(suspect, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        case_id = request.query_params.get("case")
        qs = CaseSuspect.objects.select_related("case", "suspect").all().order_by("-id")
        if case_id:
            qs = qs.filter(case_id=case_id)

        # Keep this endpoint usable for current frontend flows (basic users can submit suspect-related tips).
        # Sensitive access rules can be tightened later with a dedicated public/intense-tracking endpoint.
        serializer = CaseSuspectSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ── POST ──────────────────────────────────────────────────────────────────
    def post(self, request, *args, **kwargs):
        role = request.user.groups.values_list('name', flat=True).first()
        if role != DETECTIVE:
            self.permission_denied(request, message="Only detectives can add suspects.")

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        case_obj = serializer.validated_data.get("case")
        case_status = str(getattr(case_obj, "status", "") or "").strip().lower()
        if case_status in {str(Case.Status.AWAITING_TRIAL).lower(), str(Case.Status.CLOSED).lower()}:
            return Response(
                {"detail": "Suspects cannot be added after a case reaches trial stage or is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        row = serializer.save()
        case_obj = getattr(row, "case", None)
        if case_obj:
            notify_case(
                case_obj.assigned_detective,
                case_obj.id,
                "Suspect added to case",
                f"{request.user.username} added {getattr(row.suspect, 'username', f'Suspect #{row.id}')} to the case suspect list.",
            )
        return Response(CaseSuspectSerializer(row, context={"request": request}).data, status=status.HTTP_201_CREATED)

    # ── PATCH ─────────────────────────────────────────────────────────────────
    def patch(self, request, *args, **kwargs):
        instance   = self.get_object()
        previous_status = instance.arrest_status
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        _notify_suspect_workflow(
            updated.case,
            request.user,
            updated,
            previous_status,
            updated.arrest_status,
        )
        return Response(CaseSuspectSerializer(updated, context={"request": request}).data, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        role_names = set(request.user.groups.values_list("name", flat=True))
        case_obj = instance.case
        if SYSTEM_ADMINISTRATOR not in role_names:
            if DETECTIVE not in role_names or case_obj.assigned_detective_id != request.user.id:
                raise PermissionDenied("Only assigned detective or system administrator can remove a suspect from a case.")

        suspect_name = getattr(instance.suspect, "username", f"Suspect #{instance.id}")
        case_id = case_obj.id
        instance.delete()
        notify_many_case(
            [case_obj.assigned_detective, case_obj.assigned_sergeant],
            case_id,
            "Suspect removed from case",
            f"{request.user.username} removed {suspect_name} from the case suspect list.",
        )
        return Response({"deleted": True, "case": case_id}, status=status.HTTP_200_OK)


class AssignedCasesListView(generics.ListAPIView):
    """GET /api/investigations/cases/assigned/"""
    serializer_class   = CaseReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        roles = user.groups.values_list('name', flat=True)

        if DETECTIVE not in roles:
            return Case.objects.none()

        return Case.objects.filter(
            assigned_detective=user
        ).prefetch_related(
            'complainants',
            'suspects',
            'testimonies',
            'biological_evidences',
            'vehicle_evidences',
            'identification_documents',
            'other_evidences',
            'tips',
        )
    

class UserDetailView(generics.RetrieveAPIView):
    """GET /api/investigations/users/<pk>/"""
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return User.objects.prefetch_related('groups')


class SuspectCandidateListView(APIView):
    """
    GET /api/investigations/suspect-candidates/?case=<id>&q=<text>
    Returns system users with role=Suspect (excluding suspects already linked to the case if provided).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if DETECTIVE not in role_names and SYSTEM_ADMINISTRATOR not in role_names:
            raise PermissionDenied("Only detectives or system administrators can list suspect candidates.")

        q = str(request.query_params.get("q") or "").strip()
        raw_case_id = request.query_params.get("case")
        case_id = None
        try:
            if raw_case_id not in (None, "", "null"):
                case_id = int(raw_case_id)
        except (TypeError, ValueError):
            case_id = None

        if case_id:
            case_obj = get_object_or_404(Case, pk=case_id)
            # Non-admin detectives can only query candidates for their assigned cases.
            if SYSTEM_ADMINISTRATOR not in role_names and case_obj.assigned_detective_id != request.user.id:
                raise PermissionDenied("You are not the assigned detective for this case.")

        qs = User.objects.prefetch_related("groups").filter(groups__name=SUSPECT).distinct()

        if case_id:
            linked_ids = CaseSuspect.objects.filter(case_id=case_id).values_list("suspect_id", flat=True)
            qs = qs.exclude(id__in=linked_ids)

        if q:
            qs = qs.filter(
                Q(username__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(national_id__icontains=q)
            )

        qs = qs.order_by("username")[:50]
        return Response(UserSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class DetectiveBoardLayoutView(APIView):
    """
    GET/PATCH /api/investigations/board-layout/<case_id>/
    Stores visual positions of detective-board nodes.
    """

    permission_classes = [IsAuthenticated]

    def _can_view_layout(self, request, case):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SYSTEM_ADMINISTRATOR in role_names:
            return True
        if DETECTIVE in role_names and case.assigned_detective_id == request.user.id:
            return True
        if SERGEANT in role_names and getattr(case, "assigned_sergeant_id", None) == request.user.id:
            return True
        return False

    def _get_case(self, request, case_id):
        case = get_object_or_404(Case, pk=case_id)
        if not self._can_view_layout(request, case):
            raise PermissionDenied("You do not have permission to access this case board.")
        return case

    def _can_edit_layout(self, request, case):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SYSTEM_ADMINISTRATOR in role_names:
            return True
        return DETECTIVE in role_names and case.assigned_detective_id == request.user.id

    def _sanitize_positions(self, raw_positions):
        if not isinstance(raw_positions, dict):
            return None
        cleaned = {}
        for key, value in raw_positions.items():
            node_key = str(key or "").strip()
            if not BOARD_NODE_KEY_RE.match(node_key):
                continue
            if not isinstance(value, dict):
                continue
            try:
                x = float(value.get("x"))
                y = float(value.get("y"))
            except (TypeError, ValueError):
                continue
            if x != x or y != y:  # NaN
                continue
            cleaned[node_key] = {"x": round(x, 2), "y": round(y, 2)}
        return cleaned

    def get(self, request, case_id):
        case = self._get_case(request, case_id)
        layout = DetectiveBoardLayout.objects.filter(case=case).first()
        return Response(
            {
                "case_id": case.id,
                "node_positions": layout.node_positions if layout else {},
                "updated_at": getattr(layout, "updated_at", None),
                "updated_by": getattr(layout, "updated_by_id", None),
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, case_id):
        case = self._get_case(request, case_id)
        if not self._can_edit_layout(request, case):
            raise PermissionDenied("Only the assigned detective or system administrator can save board layout.")

        raw_positions = request.data.get("node_positions", request.data.get("positions", request.data))
        cleaned = self._sanitize_positions(raw_positions)
        if cleaned is None:
            return Response({"detail": "node_positions must be an object."}, status=status.HTTP_400_BAD_REQUEST)

        layout, _ = DetectiveBoardLayout.objects.get_or_create(case=case)
        layout.node_positions = cleaned
        layout.updated_by = request.user
        layout.save(update_fields=["node_positions", "updated_by", "updated_at"])

        return Response(
            {
                "case_id": case.id,
                "node_positions": layout.node_positions,
                "updated_at": layout.updated_at,
                "updated_by": layout.updated_by_id,
            },
            status=status.HTTP_200_OK,
        )


def _detective_board_role_names(user):
    return set(user.groups.values_list("name", flat=True))


def _can_view_detective_board(user, case_obj):
    role_names = _detective_board_role_names(user)
    if SYSTEM_ADMINISTRATOR in role_names:
        return True
    if DETECTIVE in role_names and getattr(case_obj, "assigned_detective_id", None) == user.id:
        return True
    if SERGEANT in role_names and getattr(case_obj, "assigned_sergeant_id", None) == user.id:
        return True
    return False


def _can_edit_detective_board(user, case_obj):
    role_names = _detective_board_role_names(user)
    if SYSTEM_ADMINISTRATOR in role_names:
        return True
    return DETECTIVE in role_names and getattr(case_obj, "assigned_detective_id", None) == user.id


def _board_case_or_403(user, case_id, require_edit=False):
    case_obj = get_object_or_404(Case, pk=case_id)
    if not _can_view_detective_board(user, case_obj):
        raise PermissionDenied("You do not have permission to access this detective board.")
    if require_edit and not _can_edit_detective_board(user, case_obj):
        raise PermissionDenied("Only the assigned detective or system administrator can modify this detective board.")
    return case_obj


def _evidence_exists_in_case(case_obj, evidence_id):
    try:
        numeric_id = int(evidence_id)
    except (TypeError, ValueError):
        return False
    if numeric_id <= 0:
        return False

    evidence_models = (
        TestimonyEvidence,
        BiologicalEvidence,
        VehicleEvidence,
        IdentificationDocument,
        OtherEvidence,
    )
    return any(model.objects.filter(case=case_obj, pk=numeric_id).exists() for model in evidence_models)


def _validate_relation_case_links(case_obj, relation_data):
    for key in ("source_suspect", "target_suspect"):
        suspect_row_id = relation_data.get(key)
        if suspect_row_id in (None, "", 0):
            continue
        if not CaseSuspect.objects.filter(case=case_obj, pk=suspect_row_id).exists():
            return f"{key} must belong to the same case."

    for key in ("source_evidence", "target_evidence"):
        evidence_id = relation_data.get(key)
        if evidence_id in (None, "", 0):
            continue
        if not _evidence_exists_in_case(case_obj, evidence_id):
            return f"{key} must reference an evidence item that belongs to the same case."

    return None


class DetectiveBoardStateView(APIView):
    """
    GET /api/investigations/board-state/<case_id>/
    Returns backend-native notes and relations for detective board.
    Evidence, suspects, and layout remain served by existing endpoints.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        case_obj = _board_case_or_403(request.user, case_id, require_edit=False)
        notes = DetectiveBoardNote.objects.filter(case=case_obj).order_by("order_index", "id")
        relations = DetectiveBoardRelation.objects.filter(case=case_obj).order_by("id")
        return Response(
            {
                "case_id": case_obj.id,
                "notes": DetectiveBoardNoteSerializer(notes, many=True).data,
                "relations": DetectiveBoardRelationSerializer(relations, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class DetectiveBoardRelationCreateView(APIView):
    """POST /api/investigations/board-relations/"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DetectiveBoardRelationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        case_obj = _board_case_or_403(request.user, serializer.validated_data["case"].id, require_edit=True)
        relation_error = _validate_relation_case_links(case_obj, serializer.validated_data)
        if relation_error:
            return Response({"detail": relation_error}, status=status.HTTP_400_BAD_REQUEST)

        row = serializer.save(case=case_obj, created_by=request.user)
        return Response(DetectiveBoardRelationSerializer(row).data, status=status.HTTP_201_CREATED)


class DetectiveBoardRelationDeleteView(APIView):
    """DELETE /api/investigations/board-relations/<pk>/"""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        row = get_object_or_404(DetectiveBoardRelation, pk=pk)
        _board_case_or_403(request.user, row.case_id, require_edit=True)
        row.delete()
        return Response({"deleted": True, "id": pk}, status=status.HTTP_200_OK)


class DetectiveBoardNoteCreateView(APIView):
    """POST /api/investigations/board-notes/"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DetectiveBoardNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        case_obj = _board_case_or_403(request.user, serializer.validated_data["case"].id, require_edit=True)
        last_order = (
            DetectiveBoardNote.objects.filter(case=case_obj)
            .order_by("-order_index", "-id")
            .values_list("order_index", flat=True)
            .first()
        )
        next_order = (int(last_order) + 1) if last_order is not None else 0

        row = serializer.save(case=case_obj, created_by=request.user, order_index=next_order)
        return Response(DetectiveBoardNoteSerializer(row).data, status=status.HTTP_201_CREATED)


class DetectiveBoardNoteDeleteView(APIView):
    """DELETE /api/investigations/board-notes/<pk>/"""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        row = get_object_or_404(DetectiveBoardNote, pk=pk)
        case_obj = _board_case_or_403(request.user, row.case_id, require_edit=True)
        row.delete()

        remaining = DetectiveBoardNote.objects.filter(case=case_obj).order_by("order_index", "id")
        for index, note in enumerate(remaining):
            if note.order_index != index:
                note.order_index = index
                note.save(update_fields=["order_index", "updated_at"])

        return Response({"deleted": True, "id": pk}, status=status.HTTP_200_OK)


class DetectiveBoardNoteReorderView(APIView):
    """POST /api/investigations/board-notes/reorder/"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_case_id = request.data.get("case_id", request.data.get("case"))
        try:
            case_id = int(raw_case_id)
        except (TypeError, ValueError):
            return Response({"detail": "Valid case_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        case_obj = _board_case_or_403(request.user, case_id, require_edit=True)
        raw_note_ids = request.data.get("note_ids", request.data.get("ids", []))
        if not isinstance(raw_note_ids, list):
            return Response({"detail": "note_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        notes = list(DetectiveBoardNote.objects.filter(case=case_obj).order_by("order_index", "id"))
        note_by_id = {note.id: note for note in notes}
        ordered = []
        used = set()

        for raw_id in raw_note_ids:
            try:
                note_id = int(raw_id)
            except (TypeError, ValueError):
                continue
            note = note_by_id.get(note_id)
            if not note or note_id in used:
                continue
            used.add(note_id)
            ordered.append(note)

        for note in notes:
            if note.id in used:
                continue
            ordered.append(note)

        for index, note in enumerate(ordered):
            if note.order_index != index:
                note.order_index = index
                note.save(update_fields=["order_index", "updated_at"])

        refreshed = DetectiveBoardNote.objects.filter(case=case_obj).order_by("order_index", "id")
        return Response(
            {"case_id": case_obj.id, "notes": DetectiveBoardNoteSerializer(refreshed, many=True).data},
            status=status.HTTP_200_OK,
        )


def _investigation_action_case_access_level(user, case_obj):
    """
    Returns one of: none / read / write.
    Keeps current UI flows working while enforcing assignment-based access.
    """
    role_names = set(user.groups.values_list("name", flat=True))
    if SYSTEM_ADMINISTRATOR in role_names:
        return "write"

    user_id = user.id
    # Write access mirrors current workflow actors.
    if DETECTIVE in role_names and getattr(case_obj, "assigned_detective_id", None) == user_id:
        return "write"
    if SERGEANT in role_names and getattr(case_obj, "assigned_sergeant_id", None) == user_id:
        return "write"
    if CAPTAIN in role_names and getattr(case_obj, "assigned_captain_id", None) == user_id:
        return "write"
    if POLICE_CHIEF in role_names and getattr(case_obj, "assigned_chief_id", None) == user_id:
        return "write"
    if JUDGE in role_names and getattr(case_obj, "assigned_judge_id", None) == user_id:
        return "write"

    return "none"


class InvestigationActionListCreateView(APIView):
    """
    GET/POST/DELETE /api/investigations/actions/

    GET params:
      - case (required)
    DELETE params:
      - case (required)
      - suspect (optional) -> delete entries with payload.suspect_id match
      - action_family=judge_verdict (optional) -> delete only judge verdict actions
    """

    permission_classes = [IsAuthenticated]

    def _get_case(self, request, case_id):
        case_obj = get_object_or_404(Case, pk=case_id)
        access = _investigation_action_case_access_level(request.user, case_obj)
        if access == "none":
            raise PermissionDenied("You do not have permission to access investigation actions for this case.")
        return case_obj, access

    def get(self, request):
        raw_case_id = request.query_params.get("case")
        try:
            case_id = int(raw_case_id)
        except (TypeError, ValueError):
            return Response({"detail": "Valid case query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        case_obj, _ = self._get_case(request, case_id)
        rows = InvestigationAction.objects.filter(case=case_obj).order_by("-created_at", "-id")
        return Response(InvestigationActionSerializer(rows, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = InvestigationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        case_obj, access = self._get_case(request, serializer.validated_data["case"].id)
        if access != "write":
            raise PermissionDenied("You do not have permission to create investigation actions for this case.")

        row = serializer.save(case=case_obj, created_by=request.user)
        return Response(InvestigationActionSerializer(row).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        raw_case_id = request.query_params.get("case")
        try:
            case_id = int(raw_case_id)
        except (TypeError, ValueError):
            return Response({"detail": "Valid case query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        case_obj, access = self._get_case(request, case_id)
        if access != "write":
            raise PermissionDenied("You do not have permission to delete investigation actions for this case.")

        qs = InvestigationAction.objects.filter(case=case_obj)

        raw_suspect_id = request.query_params.get("suspect")
        if raw_suspect_id not in (None, "", "null"):
            try:
                suspect_id = int(raw_suspect_id)
            except (TypeError, ValueError):
                return Response({"detail": "suspect must be a valid integer."}, status=status.HTTP_400_BAD_REQUEST)
            # JSONField payload lookup is supported on SQLite by Django and matches current payload structure.
            qs = qs.filter(payload__suspect_id=suspect_id)

        action_family = str(request.query_params.get("action_family") or "").strip().lower()
        if action_family == "judge_verdict":
            qs = qs.filter(action_type__in=JUDGE_VERDICT_ACTION_TYPES)
        elif action_family:
            return Response({"detail": "Unsupported action_family filter."}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = qs.delete()
        response_payload = {
            "deleted": True,
            "deleted_count": int(deleted_count),
            "case": case_obj.id,
        }
        if raw_suspect_id not in (None, "", "null"):
            response_payload["suspect_id"] = int(raw_suspect_id)
        if action_family:
            response_payload["action_family"] = action_family
        return Response(response_payload, status=status.HTTP_200_OK)


def crime_level_weight(crime_level):
    value = str(crime_level or "").strip().lower()
    if value == "critical":
        return 4
    if value in {"level_1", "1"}:
        return 1
    if value in {"level_2", "2"}:
        return 2
    if value in {"level_3", "3"}:
        return 3
    return 1


def suspect_current_status(case_suspect):
    return str(case_suspect.arrest_status or "").strip() or "under_pursuit"


UNDER_PURSUIT_STATUSES = {
    CaseSuspect.ArrestStatus.AWAITING_SERGEANT,
    CaseSuspect.ArrestStatus.WARRANT_ISSUED,
}

BAIL_LOW_LEVEL_MAX_WEIGHT = 2
BAIL_CONVICT_ONLY_WEIGHT = 1
BAIL_DETAINED_OR_TRIAL_STATUSES = {
    CaseSuspect.ArrestStatus.ARRESTED,
    CaseSuspect.ArrestStatus.AWAITING_CAPTAIN,
    CaseSuspect.ArrestStatus.AWAITING_CHIEF,
    CaseSuspect.ArrestStatus.ON_TRIAL,
}


def suspect_tracking_window(case_suspect, now=None):
    now = now or timezone.now()
    start = getattr(case_suspect, "identified_at", None) or getattr(case_suspect.case, "created_at", None)
    if not start:
        return None, None

    status_value = suspect_current_status(case_suspect)
    explicit_end = getattr(case_suspect, "under_pursuit_ended_at", None)
    arrested_at = getattr(case_suspect, "arrested_at", None)

    if explicit_end:
        end = explicit_end
    elif status_value in UNDER_PURSUIT_STATUSES:
        end = now
    else:
        end = arrested_at or getattr(case_suspect, "judicial_decided_at", None) or now

    if end < start:
        end = start
    return start, end


def is_low_level_case_for_bail(case_obj):
    return crime_level_weight(getattr(case_obj, "crime_level", None)) <= BAIL_LOW_LEVEL_MAX_WEIGHT


def bail_eligibility_for_case_suspect(case_suspect):
    """
    Optional bail/fine eligibility rule (current implementation):
    - suspect can be released only if *all non-acquitted linked cases* are among the two lower crime levels
    - current row must be in a detained/trial state OR already convicted in the lowest-level case only
    """
    reasons = []
    row = case_suspect
    case_obj = getattr(row, "case", None)
    if not case_obj:
        return {"eligible": False, "reasons": ["Case is missing."]}

    row_weight = crime_level_weight(getattr(case_obj, "crime_level", None))
    if row_weight > BAIL_LOW_LEVEL_MAX_WEIGHT:
        reasons.append("This case is not in the two lower crime levels.")

    linked_rows = (
        CaseSuspect.objects.select_related("case")
        .filter(suspect_id=row.suspect_id)
        .exclude(judicial_outcome=CaseSuspect.JudicialOutcome.ACQUITTED)
    )
    high_level_rows = [item for item in linked_rows if crime_level_weight(getattr(item.case, "crime_level", None)) > BAIL_LOW_LEVEL_MAX_WEIGHT]
    if high_level_rows:
        reasons.append("This suspect has at least one linked high-level case and is not eligible for bail/fine release.")

    judicial_outcome = str(getattr(row, "judicial_outcome", "") or "").strip().lower()
    arrest_status = suspect_current_status(row)
    is_convicted_lowest_level = (
        judicial_outcome == CaseSuspect.JudicialOutcome.CONVICTED and row_weight == BAIL_CONVICT_ONLY_WEIGHT
    )
    if (
        judicial_outcome == CaseSuspect.JudicialOutcome.CONVICTED
        and row_weight != BAIL_CONVICT_ONLY_WEIGHT
    ):
        reasons.append("Convicted suspects are eligible for bail/fine only in the lowest crime level (Level 1).")
    is_detained_or_trial = arrest_status in BAIL_DETAINED_OR_TRIAL_STATUSES
    if not is_convicted_lowest_level and not is_detained_or_trial:
        reasons.append("Suspect must be detained / awaiting higher review / on trial, or be a convict in the lowest-level case only.")

    if getattr(row, "released_on_bail", False):
        reasons.append("This suspect case-entry is already released on bail/fine.")

    already_paid = getattr(row, "bail_paid_at", None) is not None
    return {
        "eligible": not reasons,
        "reasons": reasons,
        "already_paid": already_paid,
        "is_convict": judicial_outcome == CaseSuspect.JudicialOutcome.CONVICTED,
        "is_low_level_case": row_weight <= BAIL_LOW_LEVEL_MAX_WEIGHT,
        "current_status": arrest_status,
    }


def _zarinpal_base_url():
    return "https://sandbox.zarinpal.com" if getattr(settings, "ZARINPAL_SANDBOX_ENABLED", True) else "https://payment.zarinpal.com"


def _zarinpal_gateway_name():
    return "zarinpal_sandbox" if getattr(settings, "ZARINPAL_SANDBOX_ENABLED", True) else "zarinpal"


def _zarinpal_post_json(path, payload):
    url = f"{_zarinpal_base_url().rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib_error.HTTPError as exc:
        raw = ""
        try:
            raw = exc.read().decode("utf-8")
        except Exception:
            raw = ""
        message = f"Gateway HTTP {exc.code}"
        if raw:
            try:
                payload = json.loads(raw)
                message = f"{message}: {json.dumps(payload, ensure_ascii=False)}"
            except json.JSONDecodeError:
                message = f"{message}: {raw}"
        raise RuntimeError(message) from exc
    except urllib_error.URLError as exc:
        raise RuntimeError(f"Gateway connection failed: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError("Gateway returned invalid JSON payload.") from exc


def _zarinpal_gateway_amount_from_rial(amount):
    # Internal amounts are stored in IRR; for sandbox simulation we pass a stable positive integer.
    try:
        numeric = int(Decimal(str(amount)))
    except (InvalidOperation, TypeError, ValueError):
        numeric = 0
    return max(numeric, 1)


def _build_bail_gateway_callback_url(row):
    frontend_base = str(getattr(settings, "FRONTEND_PUBLIC_URL", "http://localhost:5173") or "").rstrip("/")
    return f"{frontend_base}/bail/return?suspectRowId={row.id}"


def _build_zarinpal_payment_url(authority):
    return f"{_zarinpal_base_url().rstrip('/')}/pg/StartPay/{authority}"


def _extract_zarinpal_data(payload):
    return payload.get("data") if isinstance(payload, dict) and isinstance(payload.get("data"), dict) else {}


def _extract_zarinpal_errors(payload):
    return payload.get("errors") if isinstance(payload, dict) and isinstance(payload.get("errors"), dict) else {}


def _finalize_bail_payment(row, authority="", ref_id=""):
    now = timezone.now()
    row.bail_paid_at = row.bail_paid_at or now
    row.released_on_bail = True
    row.arrest_status = CaseSuspect.ArrestStatus.RELEASED
    if not row.under_pursuit_ended_at:
        row.under_pursuit_ended_at = now
    if authority:
        row.bail_payment_authority = str(authority)
    if ref_id:
        row.bail_payment_ref_id = str(ref_id)
    row.save(
        update_fields=[
            "bail_paid_at",
            "released_on_bail",
            "arrest_status",
            "under_pursuit_ended_at",
            "bail_payment_authority",
            "bail_payment_ref_id",
        ]
    )

    notify_many_case(
        [getattr(row.case, "assigned_sergeant", None), getattr(row.case, "assigned_detective", None)],
        row.case_id,
        "Bail / fine paid",
        f"{row.suspect.username} paid the bail/fine amount for suspect record #{row.id} and was released.",
    )


class IntenseTrackingSuspectsListView(APIView):
    """
    GET /api/investigations/suspects/intense-tracking/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        rows = (
            CaseSuspect.objects
            .select_related("case", "suspect")
            .filter(case__isnull=False, suspect__isnull=False)
            .exclude(judicial_outcome=CaseSuspect.JudicialOutcome.ACQUITTED)
            .filter(case__status__in=[Case.Status.OPEN, Case.Status.UNDER_INVESTIGATION, Case.Status.AWAITING_TRIAL, Case.Status.CLOSED])
            .order_by("suspect_id", "-identified_at", "-case__created_at")
        )

        grouped = {}
        for item in rows:
            tracking_started_at, tracking_ended_at = suspect_tracking_window(item, now=now)
            if not tracking_started_at or not tracking_ended_at:
                continue
            days = max(0, (tracking_ended_at - tracking_started_at).days)
            level_weight = crime_level_weight(item.case.crime_level)
            user = item.suspect
            suspect_key = f"user-{user.id}"
            record = {
                "suspect_id": item.id,
                "case_id": item.case_id,
                "case_title": item.case.title,
                "status": suspect_current_status(item),
                "judicial_outcome": str(getattr(item, "judicial_outcome", "") or "").strip().lower(),
                "tracking_started_at": tracking_started_at,
                "tracking_ended_at": tracking_ended_at,
                "currently_under_pursuit": suspect_current_status(item) in UNDER_PURSUIT_STATUSES,
                "tracking_days": days,
                "level_weight": level_weight,
            }

            entry = grouped.get(suspect_key)
            if not entry:
                display_name = f"{user.first_name} {user.last_name}".strip() or user.username
                entry = {
                    "suspect_key": suspect_key,
                    "suspect_id": item.id,
                    "user_id": user.id,
                    "display_name": display_name,
                    "name": display_name,
                    "national_id": getattr(user, "national_id", ""),
                    "photo_url": "",
                    "last_known_location": "",
                    "current_status": suspect_current_status(item),
                    "current_case_person_type": "convict" if str(item.judicial_outcome or "").lower() == "convicted" else "suspect",
                    "records": [],
                    "_max_tracking_days": 0,
                    "_max_level_weight": 1,
                    "_has_active_pursuit_record": False,
                    "_has_convicted_record": False,
                }
                grouped[suspect_key] = entry

            entry["records"].append(record)
            entry["_max_tracking_days"] = max(entry["_max_tracking_days"], days)
            entry["_max_level_weight"] = max(entry["_max_level_weight"], level_weight)
            entry["_has_active_pursuit_record"] = entry["_has_active_pursuit_record"] or bool(record["currently_under_pursuit"])
            entry["_has_convicted_record"] = entry["_has_convicted_record"] or (record["judicial_outcome"] == "convicted")

            if record["currently_under_pursuit"]:
                entry["current_status"] = record["status"]
                entry["current_case_person_type"] = "suspect"
            elif record["judicial_outcome"] == "convicted" and not entry["_has_active_pursuit_record"]:
                entry["current_case_person_type"] = "convict"

        result = []
        for entry in grouped.values():
            if entry["_max_tracking_days"] <= 30:
                continue
            if not entry["_has_active_pursuit_record"] and not entry["_has_convicted_record"]:
                continue
            max_d = entry["_max_tracking_days"]
            max_l = entry["_max_level_weight"]
            ranking = max_d * max_l
            reward_amount = 20_000_000 * ranking
            records = sorted(entry["records"], key=lambda r: (r["tracking_days"], r["level_weight"]), reverse=True)
            result.append(
                {
                    "suspect_key": entry["suspect_key"],
                    "suspect_id": entry["suspect_id"],
                    "display_name": entry["display_name"],
                    "name": entry["name"],
                    "national_id": entry["national_id"],
                    "photo_url": entry["photo_url"],
                    "last_known_location": entry["last_known_location"],
                    "current_status": entry["current_status"],
                    "current_case_person_type": entry["current_case_person_type"],
                    "max_tracking_days": max_d,
                    "max_level_weight": max_l,
                    "ranking_score": ranking,
                    "reward_amount_rial": reward_amount,
                    "records": records,
                }
            )

        result.sort(key=lambda r: (r["ranking_score"], r["max_tracking_days"]), reverse=True)
        for index, row in enumerate(result, start=1):
            row["rank"] = index

        return Response(result, status=status.HTTP_200_OK)


class SergeantBailCandidatesView(APIView):
    """
    GET /api/investigations/bail/sergeant-candidates/?case=<id>
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SERGEANT not in role_names and SYSTEM_ADMINISTRATOR not in role_names:
            raise PermissionDenied("Only sergeant or system administrator can review bail/fine candidates.")

        raw_case_id = request.query_params.get("case")
        try:
            case_id = int(raw_case_id)
        except (TypeError, ValueError):
            return Response({"detail": "Valid case query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        case_obj = get_object_or_404(Case, pk=case_id)
        if SYSTEM_ADMINISTRATOR not in role_names and getattr(case_obj, "assigned_sergeant_id", None) != request.user.id:
            raise PermissionDenied("You are not the assigned sergeant for this case.")

        rows = (
            CaseSuspect.objects
            .select_related("case", "suspect", "bail_set_by")
            .filter(case=case_obj)
            .order_by("id")
        )
        serialized = CaseSuspectSerializer(rows, many=True).data
        by_id = {row.id: row for row in rows}
        output = []
        for item in serialized:
            row = by_id.get(int(item.get("id") or 0))
            if not row:
                continue
            eligibility = bail_eligibility_for_case_suspect(row)
            item["bail_eligibility"] = eligibility
            output.append(item)
        return Response(output, status=status.HTTP_200_OK)


class CaseSuspectBailOfferView(APIView):
    """
    POST /api/investigations/suspects/<pk>/bail-offer/
    Body: { amount, note? }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SERGEANT not in role_names and SYSTEM_ADMINISTRATOR not in role_names:
            raise PermissionDenied("Only sergeant or system administrator can set bail/fine amount.")

        row = get_object_or_404(CaseSuspect.objects.select_related("case", "suspect"), pk=pk)
        if SYSTEM_ADMINISTRATOR not in role_names and getattr(row.case, "assigned_sergeant_id", None) != request.user.id:
            raise PermissionDenied("You are not the assigned sergeant for this case.")

        eligibility = bail_eligibility_for_case_suspect(row)
        if not eligibility.get("eligible"):
            return Response(
                {"detail": "This suspect is not eligible for bail/fine release.", "eligibility": eligibility},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_amount = request.data.get("amount") or request.data.get("bail_amount")
        try:
            amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"detail": "amount must be a valid positive number."}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({"detail": "amount must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)

        row.bail_amount = amount
        row.bail_notes = str(request.data.get("note") or request.data.get("bail_notes") or "").strip()
        row.bail_set_at = timezone.now()
        row.bail_set_by = request.user
        row.bail_paid_at = None
        row.bail_payment_initiated_at = None
        row.bail_payment_authority = ""
        row.bail_payment_ref_id = ""
        row.released_on_bail = False
        row.save(
            update_fields=[
                "bail_amount",
                "bail_notes",
                "bail_set_at",
                "bail_set_by",
                "bail_paid_at",
                "bail_payment_initiated_at",
                "bail_payment_authority",
                "bail_payment_ref_id",
                "released_on_bail",
            ]
        )

        notify_case(
            row.suspect,
            row.case_id,
            "Bail / fine amount is ready",
            f"Sergeant set a bail/fine amount for your suspect record in Case #{row.case_id}. You can proceed to payment.",
        )

        return Response(
            {
                **CaseSuspectSerializer(row).data,
                "bail_eligibility": bail_eligibility_for_case_suspect(row),
            },
            status=status.HTTP_200_OK,
        )


class MyBailOffersView(APIView):
    """
    GET /api/investigations/bail/my/
    For suspect role: rows that have a bail/fine amount assigned.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SUSPECT not in role_names:
            raise PermissionDenied("Only suspect users can view their bail/fine offers.")

        qs = (
            CaseSuspect.objects
            .select_related("case", "suspect", "bail_set_by")
            .filter(suspect=request.user)
            .exclude(bail_amount__isnull=True)
            .order_by("-bail_set_at", "-id")
        )
        rows = []
        for row in qs:
            item = CaseSuspectSerializer(row).data
            item["bail_eligibility"] = bail_eligibility_for_case_suspect(row)
            item["can_pay"] = bool(row.bail_amount and not row.bail_paid_at and not row.released_on_bail)
            rows.append(item)
        return Response(rows, status=status.HTTP_200_OK)


class CaseSuspectBailPayView(APIView):
    """
    POST /api/investigations/suspects/<pk>/bail-pay/
    Initiate ZarinPal sandbox payment for bail/fine.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SUSPECT not in role_names:
            raise PermissionDenied("Only suspect users can pay their bail/fine.")

        row = get_object_or_404(CaseSuspect.objects.select_related("case", "suspect"), pk=pk)
        if row.suspect_id != request.user.id:
            raise PermissionDenied("You can only pay bail/fine for your own suspect record.")
        if row.bail_amount is None:
            return Response({"detail": "No bail/fine amount has been set for this suspect record."}, status=status.HTTP_400_BAD_REQUEST)
        if row.bail_paid_at or row.released_on_bail:
            return Response({"detail": "This bail/fine has already been paid."}, status=status.HTTP_400_BAD_REQUEST)
        eligibility = bail_eligibility_for_case_suspect(row)
        if not eligibility.get("eligible"):
            return Response(
                {"detail": "This suspect is no longer eligible for bail/fine release.", "eligibility": eligibility},
                status=status.HTTP_400_BAD_REQUEST,
            )
        amount = _zarinpal_gateway_amount_from_rial(row.bail_amount)
        callback_url = _build_bail_gateway_callback_url(row)
        request_payload = {
            "merchant_id": str(getattr(settings, "ZARINPAL_MERCHANT_ID", "") or "").strip(),
            "amount": amount,
            "description": f"Bail/Fine payment for Case #{row.case_id} (suspect record #{row.id})",
            "callback_url": callback_url,
            "metadata": {
                "mobile": str(getattr(row.suspect, "phone_number", "") or "").strip(),
                "email": str(getattr(row.suspect, "email", "") or "").strip(),
            },
        }
        try:
            gateway_response = _zarinpal_post_json("/pg/v4/payment/request.json", request_payload)
        except RuntimeError as exc:
            return Response(
                {"detail": "Failed to connect to ZarinPal sandbox gateway.", "gateway_error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = _extract_zarinpal_data(gateway_response)
        errors = _extract_zarinpal_errors(gateway_response)
        code = data.get("code")
        authority = str(data.get("authority") or "").strip()
        if code != 100 or not authority:
            return Response(
                {
                    "detail": "ZarinPal sandbox did not return a valid payment authority.",
                    "gateway": _zarinpal_gateway_name(),
                    "gateway_request": gateway_response,
                    "gateway_errors": errors,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        row.bail_payment_initiated_at = timezone.now()
        row.bail_payment_authority = authority
        row.save(update_fields=["bail_payment_initiated_at", "bail_payment_authority"])

        return Response(
            {
                "gateway": _zarinpal_gateway_name(),
                "sandbox": bool(getattr(settings, "ZARINPAL_SANDBOX_ENABLED", True)),
                "authority": authority,
                "payment_url": _build_zarinpal_payment_url(authority),
                "callback_url": callback_url,
                "suspect_row": CaseSuspectSerializer(row).data,
                "gateway_response": {
                    "code": code,
                    "message": data.get("message"),
                },
            },
            status=status.HTTP_200_OK,
        )


class CaseSuspectBailPayVerifyView(APIView):
    """
    POST /api/investigations/suspects/<pk>/bail-pay/verify/
    Body: { authority, status } (usually from gateway callback query params)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        role_names = set(request.user.groups.values_list("name", flat=True))
        if SUSPECT not in role_names:
            raise PermissionDenied("Only suspect users can verify their bail/fine payment.")

        row = get_object_or_404(CaseSuspect.objects.select_related("case", "suspect"), pk=pk)
        if row.suspect_id != request.user.id:
            raise PermissionDenied("You can only verify bail/fine for your own suspect record.")
        if row.bail_amount is None:
            return Response({"detail": "No bail/fine amount has been set for this suspect record."}, status=status.HTTP_400_BAD_REQUEST)

        authority = str(request.data.get("authority") or request.data.get("Authority") or "").strip()
        gateway_status = str(request.data.get("status") or request.data.get("Status") or "").strip().upper()
        if not authority:
            return Response({"detail": "Authority is required for payment verification."}, status=status.HTTP_400_BAD_REQUEST)

        expected_authority = str(getattr(row, "bail_payment_authority", "") or "").strip()
        if expected_authority and authority != expected_authority:
            return Response(
                {
                    "detail": "Payment authority does not match the initiated gateway session for this suspect record.",
                    "expected_authority": expected_authority,
                    "received_authority": authority,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if gateway_status != "OK":
            return Response(
                {
                    "verified": False,
                    "gateway_status": "cancelled",
                    "authority": authority,
                    "detail": "Payment was cancelled or failed in the gateway.",
                    "suspect_row": CaseSuspectSerializer(row).data,
                },
                status=status.HTTP_200_OK,
            )

        if row.bail_paid_at or row.released_on_bail:
            if authority and not row.bail_payment_authority:
                row.bail_payment_authority = authority
                row.save(update_fields=["bail_payment_authority"])
            return Response(
                {
                    "verified": True,
                    "gateway_status": "already_paid",
                    "authority": authority,
                    "ref_id": str(row.bail_payment_ref_id or "").strip() or None,
                    "suspect_row": CaseSuspectSerializer(row).data,
                },
                status=status.HTTP_200_OK,
            )

        eligibility = bail_eligibility_for_case_suspect(row)
        if not eligibility.get("eligible"):
            return Response(
                {"detail": "This suspect is no longer eligible for bail/fine release.", "eligibility": eligibility},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verify_payload = {
            "merchant_id": str(getattr(settings, "ZARINPAL_MERCHANT_ID", "") or "").strip(),
            "amount": _zarinpal_gateway_amount_from_rial(row.bail_amount),
            "authority": authority,
        }
        try:
            gateway_response = _zarinpal_post_json("/pg/v4/payment/verify.json", verify_payload)
        except RuntimeError as exc:
            return Response(
                {"detail": "Failed to verify payment with ZarinPal sandbox gateway.", "gateway_error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = _extract_zarinpal_data(gateway_response)
        code = data.get("code")
        ref_id = str(data.get("ref_id") or data.get("refid") or "").strip()
        if code not in {100, 101}:
            return Response(
                {
                    "verified": False,
                    "gateway_status": "failed",
                    "authority": authority,
                    "gateway_code": code,
                    "detail": "ZarinPal did not confirm this payment.",
                    "gateway_response": gateway_response,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        _finalize_bail_payment(row, authority=authority, ref_id=ref_id)

        return Response(
            {
                "verified": True,
                "gateway_status": "paid" if code == 100 else "already_verified",
                "authority": authority,
                "ref_id": ref_id or None,
                "gateway_code": code,
                "suspect_row": CaseSuspectSerializer(row).data,
            },
            status=status.HTTP_200_OK,
        )



def check_case_permission(request, case):
    """
    Reuse the object-level permission check against the parent case.
    Raises PermissionDenied if the user cannot access it.
    """
    permission = CanViewCaseReport()
    if not permission.has_object_permission(request, None, case):
        raise PermissionDenied()
    

class CaseReportView(generics.RetrieveAPIView):
    """
    GET /api/investigations/cases/<pk>/

    Returns the case with flat id-lists for all related objects.
    Allowed: Judge, Police Chief, Captain (any case)
             Assigned Detective / Sergeant (their case only)
    """
    serializer_class   = CaseReportSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return Case.objects.prefetch_related(
            'complainants',
            'suspects',
            'testimonies',
            'biological_evidences',
            'vehicle_evidences',
            'identification_documents',
            'other_evidences',
            'tips',
        )


# ── Complainant ───────────────────────────────────────────────────────────────

class ComplainantDetailView(generics.RetrieveAPIView):
    serializer_class   = ComplainantSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return Complainant.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj


# ── CaseSuspect ───────────────────────────────────────────────────────────────

class CaseSuspectDetailView(generics.RetrieveAPIView):
    serializer_class   = CaseSuspectSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return CaseSuspect.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj


# ── CaseWitness ───────────────────────────────────────────────────────────────

class CaseWitnessDetailView(generics.RetrieveAPIView):
    serializer_class   = CaseWitnessSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return CaseWitness.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj


# ── RewardTip ─────────────────────────────────────────────────────────────────

class RewardTipDetailView(generics.RetrieveAPIView):
    serializer_class   = RewardTipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RewardTip.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj
    
class UserDetailView(generics.RetrieveAPIView):
    """GET /api/investigations/users/<pk>/"""
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return User.objects.prefetch_related('groups')
