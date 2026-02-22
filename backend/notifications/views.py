# notifications/views.py

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/
    Returns all notifications for the authenticated user.
    Query param: ?unread=true to filter only unread.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).order_by("-created_at")
        if self.request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        return qs


class NotificationDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/v1/notifications/{id}/
    DELETE /api/v1/notifications/{id}/
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class MarkNotificationReadView(generics.UpdateAPIView):
    """
    PATCH /api/v1/notifications/{id}/read/
    Marks a single notification as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"detail": "Marked as read."}, status=status.HTTP_200_OK)
