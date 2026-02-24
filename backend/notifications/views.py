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
        return Notification.objects.filter(recipient=self.request.user).order_by("-created_at")


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

        is_read = request.data.get("is_read", True)
        notification.is_read = bool(is_read)
        notification.read_at = timezone.now() if notification.is_read else None
        notification.save(update_fields=["is_read", "read_at"])

        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
