from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from cases.models import Case, Complainant, CaseWitness, CaseSuspect
from financials.models import RewardTip
from .permissions import CanViewCaseReport
from accounts.constants import DETECTIVE
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


class CaseSuspectCreateUpdateView(generics.GenericAPIView):
    """
    POST   /api/investigations/suspects/          → detective creates CaseSuspect
    PATCH  /api/investigations/suspects/<pk>/     → sergeant / captain / chief update
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            suspect = self.get_object()

            if suspect.status == CaseSuspect.ArrestStatus.ARRESTED:
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
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── PATCH ─────────────────────────────────────────────────────────────────
    def patch(self, request, *args, **kwargs):
        instance   = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


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
