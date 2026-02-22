from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView

from cases.models import Case, Complainant, CaseWitness, CaseSuspect
from financials.models import RewardTip
from .permissions import CanViewCaseReport
from django.contrib.auth import get_user_model
from accounts.constants import DETECTIVE

from .serializers import (
    CaseReportSerializer,
    ComplainantSerializer,
    CaseSuspectSerializer,
    CaseWitnessSerializer,
    RewardTipSerializer,
    UserSerializer
)


User = get_user_model()


class AssignedCasesListView(ListAPIView):
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
    

class UserDetailView(RetrieveAPIView):
    """GET /api/investigations/users/<pk>/"""
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return User.objects.prefetch_related('groups')



def check_case_permission(request, case):
    """
    Reuse the object-level permission check against the parent case.
    Raises PermissionDenied if the user cannot access it.
    """
    permission = CanViewCaseReport()
    if not permission.has_object_permission(request, None, case):
        raise PermissionDenied()
    

class CaseReportView(RetrieveAPIView):
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

class ComplainantDetailView(RetrieveAPIView):
    serializer_class   = ComplainantSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return Complainant.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj


# ── CaseSuspect ───────────────────────────────────────────────────────────────

class CaseSuspectDetailView(RetrieveAPIView):
    serializer_class   = CaseSuspectSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return CaseSuspect.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj


# ── CaseWitness ───────────────────────────────────────────────────────────────

class CaseWitnessDetailView(RetrieveAPIView):
    serializer_class   = CaseWitnessSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return CaseWitness.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj


# ── RewardTip ─────────────────────────────────────────────────────────────────

class RewardTipDetailView(RetrieveAPIView):
    serializer_class   = RewardTipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RewardTip.objects.select_related('case')

    def get_object(self):
        obj = super().get_object()
        check_case_permission(self.request, obj.case)
        return obj
    
class UserDetailView(RetrieveAPIView):
    """GET /api/investigations/users/<pk>/"""
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated, CanViewCaseReport]

    def get_queryset(self):
        return User.objects.prefetch_related('groups')