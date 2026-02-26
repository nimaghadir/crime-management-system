from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).order_by("-created_at")

        unread = self.request.query_params.get("unread")
        if unread is not None:
            normalized = str(unread).strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                qs = qs.filter(is_read=False)
            elif normalized in {"0", "false", "no", "off"}:
                qs = qs.filter(is_read=True)

        limit_raw = self.request.query_params.get("limit")
        if limit_raw not in (None, ""):
            try:
                limit = int(limit_raw)
            except (TypeError, ValueError):
                limit = 0
            if limit > 0:
                qs = qs[: min(limit, 200)]

        return qs


def _parse_bool(value, default=True):
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


class NotificationDetailView(APIView):
    """
    PATCH /api/notifications/<id>/
    Supported action: mark read (default behavior)
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = Notification.objects.filter(pk=pk, recipient=request.user).first()
        if not notification:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = _parse_bool(request.data.get("is_read", True), default=True)
        notification.read_at = timezone.now() if notification.is_read else None
        notification.save(update_fields=["is_read", "read_at"])

        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Body (optional): {"is_read": true|false}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        is_read = _parse_bool(request.data.get("is_read", True), default=True)
        qs = Notification.objects.filter(recipient=request.user)
        now = timezone.now() if is_read else None
        updated = qs.exclude(is_read=is_read).update(is_read=is_read, read_at=now)
        unread_count = qs.filter(is_read=False).count()
        return Response(
            {"updated_count": updated, "is_read": is_read, "unread_count": unread_count},
            status=status.HTTP_200_OK,
        )
