# financials/views.py

import secrets
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from accounts.constants import DETECTIVE, POLICE_OFFICER
from .models import RewardTip
from .serializers import TipCreateSerializer, TipDetailSerializer, TipStatusUpdateSerializer, TipLookupSerializer
from .permissions import IsCop, user_groups, IsPoliceOfficer
from accounts.constants import COP_ROLES
from notifications.models import Notification


# Valid transitions: (current_status, new_status) → required role check (callable)
# Officer can move SUBMITTED → FORWARDED or REJECTED
# Detective (of the case) can move FORWARDED → CONFIRMED or REJECTED

OFFICER_ROLES = {POLICE_OFFICER}  # extend if sergeants/captains should also do this


def _is_officer(groups):
    return bool(groups & OFFICER_ROLES)


def _is_detective(groups):
    return DETECTIVE in groups


def _is_case_detective(user, tip):
    case = tip.case
    return case is not None and getattr(case, 'detective_id', None) == user.pk


class TipListCreateView(generics.ListCreateAPIView):
    """
    GET  — cops see all tips; civilians see only their own.
    POST — any authenticated user submits a tip.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return TipCreateSerializer if self.request.method == 'POST' else TipDetailSerializer

    def get_queryset(self):
        user = self.request.user
        qs = RewardTip.objects.select_related('submitter', 'case', 'reviewing_officer')
        if user_groups(user) & COP_ROLES:
            return qs.order_by('-submitted_at')
        return qs.filter(submitter=user).order_by('-submitted_at')

    def perform_create(self, serializer):
        serializer.save(submitter=self.request.user, status=RewardTip.Status.SUBMITTED)


class TipDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   — owner or cop.
    PATCH — update tip status. The allowed transition depends on the
            caller's role and the tip's current status:

            SUBMITTED  → FORWARDED | REJECTED   (Police Officer only)
            FORWARDED  → CONFIRMED | REJECTED   (Detective of the case only)

    No action verbs in the URL. The resource is the tip; PATCH updates its state.
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = RewardTip.objects.select_related('submitter', 'case', 'case__assigned_detective')

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return TipStatusUpdateSerializer
        return TipDetailSerializer

    def get_object(self):
        tip = super().get_object()
        user = self.request.user
        if self.request.method == 'GET':
            if tip.submitter != user and not (user_groups(user) & COP_ROLES):
                raise PermissionDenied("You do not have access to this tip.")
        return tip

    def partial_update(self, request, *args, **kwargs):
        tip = super().get_object()
        groups = user_groups(request.user)

        serializer = TipStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')
        reward_amount = serializer.validated_data.get('reward_amount')

        if tip.status == RewardTip.Status.SUBMITTED:
            if not _is_officer(groups):
                raise PermissionDenied("Only a Police Officer can review submitted tips.")
            if new_status not in (RewardTip.Status.FORWARDED, RewardTip.Status.REJECTED):
                raise ValidationError(
                    f"From SUBMITTED, status can only move to FORWARDED or REJECTED, not '{new_status}'."
                )
            tip.reviewing_officer = request.user
            tip.officer_reviewed_at = timezone.now()
            tip.officer_notes = notes
            tip.status = new_status
            tip.save()

        elif tip.status == RewardTip.Status.FORWARDED:
            if not _is_detective(groups):
                raise PermissionDenied("Only a Detective can review forwarded tips.")
            if not _is_case_detective(request.user, tip):
                raise PermissionDenied("You are not the detective assigned to this tip's case.")
            if new_status not in (RewardTip.Status.CONFIRMED, RewardTip.Status.REJECTED):
                raise ValidationError(
                    f"From FORWARDED, status can only move to CONFIRMED or REJECTED, not '{new_status}'."
                )
            tip.detective_reviewed_at = timezone.now()
            tip.detective_notes = notes
            tip.status = new_status

            if new_status == RewardTip.Status.CONFIRMED:
                tip.unique_code = secrets.token_urlsafe(32)
                tip.reward_amount = reward_amount
                tip.save()
                _notify_submitter_confirmed(tip)
            else:
                tip.save()

        else:
            raise ValidationError(f"Tips in status '{tip.status}' cannot be updated.")

        return Response(TipDetailSerializer(tip).data)


# ── GET /api/v1/financials/tips/lookup/ ──────────────────────────────────────
class TipLookupView(generics.ListAPIView):
    """
    GET /api/v1/financials/tips/lookup/?national_id=X&unique_code=Y
    Returns confirmed tip details (including submitter data and reward amount).
    Cop-only — used at the station counter before paying out the reward.
    """
    serializer_class = TipLookupSerializer
    permission_classes = [IsCop]

    def get_queryset(self):
        national_id = self.request.query_params.get('national_id', '').strip()
        unique_code = self.request.query_params.get('unique_code', '').strip()
        if not national_id or not unique_code:
            raise ValidationError("Both 'national_id' and 'unique_code' query params are required.")
        return RewardTip.objects.filter(
            unique_code=unique_code,
            submitter__national_id=national_id,
            status=RewardTip.Status.CONFIRMED,
        ).select_related('submitter', 'case')


# ── Internal helper ───────────────────────────────────────────────────────────
def _notify_submitter_confirmed(tip: RewardTip):
    Notification.objects.create(
        recipient=tip.submitter,
        title="Tip Confirmed!",
        message=(
            f"Your tip #{tip.pk} has been confirmed. "
            f"Present this code at the station to claim your reward: {tip.unique_code}"
        ),
    )
