from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import generics, status
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from cases.models import Case, Complainant, CaseWitness, CaseSuspect
from financials.models import RewardTip
from .permissions import CanViewCaseReport
from accounts.constants import DETECTIVE

from .serializers import (
    CaseReportSerializer,
    ComplainantSerializer,
    CaseSuspectSerializer,
    CaseWitnessSerializer,
    RewardTipSerializer,
    UserSerializer,
    CreateCaseSuspectSerializer,
    UpdateCaseSuspectSerializer
)


User = get_user_model()


class CaseSuspectCreateUpdateView(generics.GenericAPIView):
    """
    POST   /api/investigations/suspects/          → detective creates CaseSuspect
    PATCH  /api/investigations/suspects/<pk>/     → sergeant / captain / chief update
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
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