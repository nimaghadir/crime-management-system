from django.db import models
from django.conf import settings

# Create your models here.
class RewardTip(models.Model):
    """
    An ordinary (civilian) user submits a tip about a case or suspect.

    Flow:
        SUBMITTED  → officer reviews →
            REJECTED   (completely invalid)
            FORWARDED  → detective reviews →
                CONFIRMED  → unique_code generated, user notified
                REJECTED   (detective rejects)

    Once CONFIRMED, the civilian visits the police station and claims
    the reward using their national_id + unique_code.
    Any police rank can look up the reward amount via those two fields.
    """

    class Status(models.TextChoices):
        SUBMITTED  = 'submitted',  'Submitted'
        FORWARDED  = 'forwarded',  'Forwarded to Detective'
        CONFIRMED  = 'confirmed',  'Confirmed — Reward Issued'
        REJECTED   = 'rejected',   'Rejected'

    # -- Who submitted the tip --
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_tips'
    )

    # -- What the tip is about --
    case = models.ForeignKey(
        'cases.Case',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='tips'
    )
    content = models.TextField()

    # -- Review chain --
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)

    reviewing_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='officer_reviewed_tips'
    )
    officer_reviewed_at = models.DateTimeField(null=True, blank=True)
    officer_notes       = models.TextField(blank=True)

    detective_reviewed_at = models.DateTimeField(null=True, blank=True)
    detective_notes       = models.TextField(blank=True)

    # -- Reward --
    # Populated only when status == CONFIRMED
    unique_code   = models.CharField(max_length=64, unique=True, null=True, blank=True)
    reward_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)  # in Rials
    claimed       = models.BooleanField(default=False)
    claimed_at    = models.DateTimeField(null=True, blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tip #{self.pk} by {self.submitter} [{self.status}]"


class RewardTipAttachment(models.Model):
    tip = models.ForeignKey(
        RewardTip,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="tips/attachments/", null=True, blank=True)
    file_url = models.CharField(max_length=1000, blank=True)
    mime_type = models.CharField(max_length=255, blank=True)
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tip_attachments_uploaded",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"TipAttachment #{self.pk} (Tip #{self.tip_id})"
