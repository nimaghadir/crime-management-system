# notifications/models.py

from django.db import models
from django.conf import settings


class Notification(models.Model):

    class NotifType(models.TextChoices):
        TIP_FORWARDED  = 'tip_forwarded',  'Tip Forwarded to Detective'
        TIP_CONFIRMED  = 'tip_confirmed',  'Tip Confirmed — Reward Issued'
        TIP_REJECTED   = 'tip_rejected',   'Tip Rejected'
        BOUNTY_PAID    = 'bounty_paid',    'Bounty Paid'
        BOUNTY_REVOKED = 'bounty_revoked', 'Bounty Revoked'
        CASE_UPDATED   = 'case_updated',   'Case Updated'
        TRIAL_VERDICT  = 'trial_verdict',  'Trial Verdict Recorded'
        GENERAL        = 'general',        'General'

    recipient  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notif_type = models.CharField(max_length=30, choices=NotifType.choices, default=NotifType.GENERAL)
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at    = models.DateTimeField(null=True, blank=True)

    # Optional generic link to the object that triggered the notification
    link       = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notif_type}] → {self.recipient} ({'read' if self.is_read else 'unread'})"
