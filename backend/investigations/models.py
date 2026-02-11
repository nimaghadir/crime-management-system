from django.conf import settings
from django.db import models

from cases.models import Case


class Suspect(models.Model):
    class Status(models.TextChoices):
        SUSPECT = "suspect", "Suspect"
        CLEARED = "cleared", "Cleared"
        ARRESTED = "arrested", "Arrested"
        CONVICTED = "convicted", "Convicted"

    case = models.ForeignKey(Case, related_name="suspects", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    national_id = models.CharField(max_length=20, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUSPECT
    )
    score = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(score__gte=0) & models.Q(score__lte=10),
                name="suspect_score_range",
            )
        ]


class Note(models.Model):
    case = models.ForeignKey(Case, related_name="notes", on_delete=models.CASCADE)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="case_notes",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    text = models.TextField()
    order_index = models.IntegerField(default=0)
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class InvestigationAction(models.Model):
    case = models.ForeignKey(Case, related_name="actions", on_delete=models.CASCADE)
    action_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict, blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="investigation_actions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
