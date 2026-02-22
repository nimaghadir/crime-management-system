# notifications/models.py

from django.db import models
from django.conf import settings


class Notification(models.Model):

    recipient  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"notification for {self.recipient} ({'read' if self.is_read else 'unread'})"
