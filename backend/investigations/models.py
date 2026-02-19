from django.conf import settings
from django.db import models
from django.db.models import F, Value
from django.db.models.functions import Greatest, Least

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

    SCORE_DELTA_BY_ACTION_TYPE = {
        "start_interrogation": 2,
        "alibi_verified": -2,
        "evidence_linked": 1,
    }

    def _suspect_ids_from_payload(self) -> list[int]:
        if not isinstance(self.payload, dict):
            return []

        suspect_ids: list[int] = []
        suspect_id = self.payload.get("suspect_id")
        if isinstance(suspect_id, int):
            suspect_ids.append(suspect_id)

        raw_suspect_ids = self.payload.get("suspect_ids")
        if isinstance(raw_suspect_ids, list):
            suspect_ids.extend(sid for sid in raw_suspect_ids if isinstance(sid, int))

        # Preserve order and remove duplicates.
        return list(dict.fromkeys(suspect_ids))

    def apply_suspect_scoring_hook(self):
        delta = self.SCORE_DELTA_BY_ACTION_TYPE.get(self.action_type, 0)
        if delta == 0:
            return

        suspect_ids = self._suspect_ids_from_payload()
        if not suspect_ids:
            return

        Suspect.objects.filter(case=self.case, id__in=suspect_ids).update(
            score=Least(Value(10), Greatest(Value(0), F("score") + Value(delta))),
        )

    def save(self, *args, **kwargs):
        is_create = self._state.adding
        super().save(*args, **kwargs)
        if is_create:
            self.apply_suspect_scoring_hook()
