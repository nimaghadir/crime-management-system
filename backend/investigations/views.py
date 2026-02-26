from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

import re
from django.db.models import Q

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from cases.models import Case, Complainant, CaseWitness, CaseSuspect
from financials.models import RewardTip
from notifications.utils import notify_case, notify_many_case
from .models import DetectiveBoardLayout
from .permissions import CanViewCaseReport
from accounts.constants import DETECTIVE, SUSPECT, SYSTEM_ADMINISTRATOR
from accounts.constants import BASIC_USER, POLICE_CHIEF, CAPTAIN, SERGEANT, POLICE_OFFICER

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
)


User = get_user_model()
BOARD_NODE_KEY_RE = re.compile(r"^[esn]-\d+$")


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


def crime_level_weight(crime_level):
    value = str(crime_level or "").strip().lower()
    if value == "critical":
        return 4
    if value in {"level_1", "1"}:
        return 3
    if value in {"level_2", "2"}:
        return 2
    return 1


def suspect_current_status(case_suspect):
    return str(case_suspect.arrest_status or "").strip() or "under_pursuit"


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
            .filter(judicial_outcome=CaseSuspect.JudicialOutcome.PENDING)
            .filter(case__status__in=[Case.Status.OPEN, Case.Status.UNDER_INVESTIGATION, Case.Status.AWAITING_TRIAL, Case.Status.CLOSED])
            .order_by("suspect_id", "-case__created_at")
        )

        grouped = {}
        for item in rows:
            tracking_started_at = item.arrest_warrant_issued_at or item.case.created_at
            if not tracking_started_at:
                continue
            days = max(0, (now - tracking_started_at).days)
            level_weight = crime_level_weight(item.case.crime_level)
            user = item.suspect
            suspect_key = f"user-{user.id}"
            record = {
                "suspect_id": item.id,
                "case_id": item.case_id,
                "case_title": item.case.title,
                "status": suspect_current_status(item),
                "tracking_started_at": tracking_started_at,
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
                    "records": [],
                    "_max_tracking_days": 0,
                    "_max_level_weight": 1,
                }
                grouped[suspect_key] = entry

            entry["records"].append(record)
            entry["_max_tracking_days"] = max(entry["_max_tracking_days"], days)
            entry["_max_level_weight"] = max(entry["_max_level_weight"], level_weight)

        result = []
        for entry in grouped.values():
            if entry["_max_tracking_days"] <= 30:
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
