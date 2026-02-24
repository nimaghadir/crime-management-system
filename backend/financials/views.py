from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.constants import BASIC_USER, COP_ROLES, DETECTIVE, POLICE_OFFICER
from cases.models import Case
from notifications.models import Notification
from .models import RewardTip
from .serializers import (
    RewardLookupSerializer,
    RewardTipFrontendSerializer,
    TipReviewSerializer,
    TipSubmitSerializer,
    encode_tip_content,
)

User = get_user_model()


def user_role_names(user):
    return set(user.groups.values_list("name", flat=True))


def has_role(user, role_name):
    return role_name in user_role_names(user)


def ensure_role(request, role_name, message):
    if not has_role(request.user, role_name):
        return Response({"detail": message}, status=status.HTTP_403_FORBIDDEN)
    return None


def ensure_police_rank(request):
    if not user_role_names(request.user).intersection(COP_ROLES):
        return Response({"detail": "Only police ranks can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
    return None


def create_notification(recipient, title, body, notif_type=Notification.NotifType.GENERAL, case_id=None):
    if not recipient:
        return None
    link = f"/cases/{case_id}/" if case_id else ""
    return Notification.objects.create(
        recipient=recipient,
        notif_type=notif_type,
        title=title,
        body=body,
        link=link,
    )


def build_reward_code():
    # Short readable code; unique enough and protected by unique DB constraint.
    return f"RW-{timezone.now():%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"


def front_status_queryset(status_value):
    return RewardTip.objects.filter(status=status_value).select_related("submitter", "case", "case__assigned_detective", "case__assigned_police_officer")


class TipCreateView(APIView):
    """
    POST /api/financials/tips/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        denied = ensure_role(request, BASIC_USER, "Only Basic User can submit tips.")
        if denied:
            return denied

        serializer = TipSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        case_obj = data.get("case_obj")

        payload_for_storage = {
            "version": 1,
            "subject_type": data.get("subject_type", "case"),
            "case_id": case_obj.id if case_obj else data.get("case_id"),
            "suspect_id": data.get("suspect_id"),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "suspect_hint": data.get("suspect_hint", ""),
            "attachments": data.get("attachments", []),
        }

        tip = RewardTip.objects.create(
            submitter=request.user,
            case=case_obj,
            content=encode_tip_content(payload_for_storage),
            status=RewardTip.Status.SUBMITTED,
        )

        officer = getattr(case_obj, "assigned_police_officer", None) if case_obj else None
        if officer:
            tip.reviewing_officer = officer
            tip.save(update_fields=["reviewing_officer"])
            create_notification(
                officer,
                "New tip submitted",
                f"Tip #{tip.id} is waiting for officer review.",
                notif_type=Notification.NotifType.TIP_FORWARDED,
                case_id=case_obj.id if case_obj else None,
            )

        create_notification(
            request.user,
            "Tip submitted",
            f"Tip #{tip.id} was submitted successfully and is waiting for officer review.",
            notif_type=Notification.NotifType.GENERAL,
            case_id=case_obj.id if case_obj else None,
        )

        return Response(RewardTipFrontendSerializer(tip).data, status=status.HTTP_201_CREATED)


class MyTipListView(generics.ListAPIView):
    """
    GET /api/financials/tips/my/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = RewardTipFrontendSerializer

    def get_queryset(self):
        return (
            RewardTip.objects.filter(submitter=self.request.user)
            .select_related("submitter", "case")
            .order_by("-submitted_at")
        )


class OfficerTipQueueView(generics.ListAPIView):
    """
    GET /api/financials/tips/officer-queue/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = RewardTipFrontendSerializer

    def list(self, request, *args, **kwargs):
        denied = ensure_role(request, POLICE_OFFICER, "Only Police Officer can access officer tip queue.")
        if denied:
            return denied
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        return (
            front_status_queryset(RewardTip.Status.SUBMITTED)
            .filter(
                Q(case__isnull=True)
                | Q(case__assigned_police_officer__isnull=True)
                | Q(case__assigned_police_officer=user)
            )
            .distinct()
            .order_by("-submitted_at")
        )


class OfficerTipReviewView(APIView):
    """
    POST /api/financials/tips/<id>/officer-review/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        denied = ensure_role(request, POLICE_OFFICER, "Only Police Officer can perform officer tip review.")
        if denied:
            return denied

        tip = RewardTip.objects.select_related("submitter", "case", "case__assigned_police_officer", "case__assigned_detective").filter(pk=pk).first()
        if not tip:
            return Response({"detail": "Tip not found."}, status=status.HTTP_404_NOT_FOUND)
        if tip.status != RewardTip.Status.SUBMITTED:
            return Response({"detail": "Tip is not pending officer review."}, status=status.HTTP_400_BAD_REQUEST)

        if tip.case_id and tip.case and tip.case.assigned_police_officer_id and tip.case.assigned_police_officer_id != request.user.id:
            return Response({"detail": "This tip belongs to another officer's case."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TipReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = str(serializer.validated_data.get("action") or "").strip().lower()
        note = str(serializer.validated_data.get("note") or "").strip()

        tip.reviewing_officer = request.user
        tip.officer_reviewed_at = timezone.now()
        tip.officer_notes = note

        if action == "reject":
            tip.status = RewardTip.Status.REJECTED
            tip.save(update_fields=["reviewing_officer", "officer_reviewed_at", "officer_notes", "status"])
            create_notification(
                tip.submitter,
                "Tip rejected in officer review",
                f"Tip #{tip.id} was rejected during officer review.",
                notif_type=Notification.NotifType.TIP_REJECTED,
                case_id=tip.case_id,
            )
        elif action == "forward":
            if tip.case_id and not getattr(tip.case, "assigned_detective_id", None):
                return Response({"detail": "Case has no detective assigned yet."}, status=status.HTTP_400_BAD_REQUEST)
            tip.status = RewardTip.Status.FORWARDED
            tip.save(update_fields=["reviewing_officer", "officer_reviewed_at", "officer_notes", "status"])
            detective = getattr(tip.case, "assigned_detective", None) if tip.case_id else None
            if detective:
                create_notification(
                    detective,
                    "Tip forwarded to detective",
                    f"Tip #{tip.id} needs detective review.",
                    notif_type=Notification.NotifType.TIP_FORWARDED,
                    case_id=tip.case_id,
                )
            create_notification(
                tip.submitter,
                "Tip passed officer review",
                f"Tip #{tip.id} was forwarded to detective review.",
                notif_type=Notification.NotifType.GENERAL,
                case_id=tip.case_id,
            )
        else:
            return Response({"detail": "action must be 'forward' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

        tip.refresh_from_db()
        return Response(RewardTipFrontendSerializer(tip).data, status=status.HTTP_200_OK)


class DetectiveTipQueueView(generics.ListAPIView):
    """
    GET /api/financials/tips/detective-queue/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = RewardTipFrontendSerializer

    def list(self, request, *args, **kwargs):
        denied = ensure_role(request, DETECTIVE, "Only Detective can access detective tip queue.")
        if denied:
            return denied
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        return (
            front_status_queryset(RewardTip.Status.FORWARDED)
            .filter(Q(case__assigned_detective=user) | Q(case__isnull=True))
            .distinct()
            .order_by("-submitted_at")
        )


class DetectiveTipReviewView(APIView):
    """
    POST /api/financials/tips/<id>/detective-review/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        denied = ensure_role(request, DETECTIVE, "Only detective users can review forwarded tips.")
        if denied:
            return denied

        tip = RewardTip.objects.select_related("submitter", "case", "case__assigned_detective").filter(pk=pk).first()
        if not tip:
            return Response({"detail": "Tip not found."}, status=status.HTTP_404_NOT_FOUND)
        if tip.status != RewardTip.Status.FORWARDED:
            return Response({"detail": "Tip is not pending detective review."}, status=status.HTTP_400_BAD_REQUEST)
        if tip.case_id and tip.case and tip.case.assigned_detective_id and tip.case.assigned_detective_id != request.user.id:
            return Response({"detail": "This tip belongs to another detective."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TipReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = str(serializer.validated_data.get("action") or "").strip().lower()
        note = str(serializer.validated_data.get("note") or "").strip()

        tip.detective_reviewed_at = timezone.now()
        tip.detective_notes = note

        if action == "reject":
            tip.status = RewardTip.Status.REJECTED
            tip.save(update_fields=["detective_reviewed_at", "detective_notes", "status"])
            create_notification(
                tip.submitter,
                "Tip rejected by detective",
                f"Tip #{tip.id} was reviewed and rejected.",
                notif_type=Notification.NotifType.TIP_REJECTED,
                case_id=tip.case_id,
            )
        elif action == "approve":
            amount = serializer.validated_data.get("reward_amount")
            if amount is None:
                return Response({"detail": "reward_amount is required for approve action."}, status=status.HTTP_400_BAD_REQUEST)
            if Decimal(amount) <= 0:
                return Response({"detail": "reward_amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)

            tip.status = RewardTip.Status.CONFIRMED
            tip.reward_amount = amount
            if not tip.unique_code:
                tip.unique_code = build_reward_code()
            tip.save(update_fields=["detective_reviewed_at", "detective_notes", "status", "reward_amount", "unique_code"])
            create_notification(
                tip.submitter,
                "Tip approved — reward issued",
                f"Tip #{tip.id} was approved. Reward code: {tip.unique_code}",
                notif_type=Notification.NotifType.TIP_CONFIRMED,
                case_id=tip.case_id,
            )
        else:
            return Response({"detail": "action must be 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

        tip.refresh_from_db()
        return Response(RewardTipFrontendSerializer(tip).data, status=status.HTTP_200_OK)


class RewardLookupView(APIView):
    """
    POST /api/payments/rewards/lookup/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        denied = ensure_police_rank(request)
        if denied:
            return denied

        serializer = RewardLookupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        national_id = serializer.validated_data["national_id"].strip()
        reward_code = serializer.validated_data["reward_code"].strip()

        tip = (
            RewardTip.objects.select_related("submitter", "case")
            .filter(
                submitter__national_id=national_id,
                unique_code__iexact=reward_code,
                status=RewardTip.Status.CONFIRMED,
            )
            .first()
        )
        if not tip:
            return Response({"detail": "No reward record found for provided national ID and code."}, status=status.HTTP_404_NOT_FOUND)

        tip_payload = RewardTipFrontendSerializer(tip).data
        user = tip.submitter
        payment = {
            "code": tip.unique_code,
            "amount": tip.reward_amount,
            "status": "claimed" if tip.claimed else "approved_unclaimed",
            "created_at": tip.detective_reviewed_at or tip.submitted_at,
            "subject_type": tip_payload.get("subject_type"),
            "case_id": tip.case_id,
            "tip_id": tip.id,
            "suspect_id": tip_payload.get("suspect_id"),
        }
        user_payload = {
            "id": user.id,
            "username": user.username,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "national_id": getattr(user, "national_id", ""),
            "phone_number": getattr(user, "phone_number", ""),
            "phone": getattr(user, "phone_number", ""),
            "email": getattr(user, "email", ""),
        }

        return Response(
            {
                "payment": payment,
                "user": user_payload,
                "tip": tip_payload,
                "suspect": None,
                "suspect_tracking_formula": None,
            },
            status=status.HTTP_200_OK,
        )


class PaymentRecordListView(APIView):
    """
    GET /api/payments/records/
    Minimal reward/payment records feed for profile page.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = user_role_names(request.user)
        qs = RewardTip.objects.filter(
            status=RewardTip.Status.CONFIRMED,
            unique_code__isnull=False,
        ).select_related("submitter", "case").order_by("-detective_reviewed_at", "-submitted_at")

        # Police ranks can inspect a broader payment list; other users only see their own rewards.
        if not roles.intersection(COP_ROLES):
            qs = qs.filter(submitter=request.user)

        rows = []
        for tip in qs[:100]:
            rows.append(
                {
                    "id": tip.id,
                    "type": "reward",
                    "amount": tip.reward_amount,
                    "status": "claimed" if tip.claimed else "approved_unclaimed",
                    "code": tip.unique_code,
                    "tip_id": tip.id,
                    "case_id": tip.case_id,
                    "created_at": tip.detective_reviewed_at or tip.submitted_at,
                    "user_id": tip.submitter_id,
                }
            )
        return Response(rows, status=status.HTTP_200_OK)
