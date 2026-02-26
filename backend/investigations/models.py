from django.conf import settings
from django.db import models


class InvestigationAction(models.Model):
    """
    Operational timeline entries used by interrogation/report pages.
    Keeps a flexible JSON payload so frontend workflow events can be recorded
    without changing visible UI contracts.
    """

    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="investigation_actions",
    )
    action_type = models.CharField(max_length=120)
    payload = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="investigation_actions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["case", "created_at"]),
            models.Index(fields=["case", "action_type"]),
        ]

    def __str__(self):
        return f"InvestigationAction(case={self.case_id}, type={self.action_type})"


class DetectiveBoardNote(models.Model):
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="detective_board_notes",
    )
    text = models.TextField()
    pinned = models.BooleanField(default=False)
    order_index = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="detective_board_notes_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order_index", "id"]
        indexes = [models.Index(fields=["case", "order_index"])]

    def __str__(self):
        return f"DetectiveBoardNote(case={self.case_id}, id={self.id})"


class DetectiveBoardRelation(models.Model):
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="detective_board_relations",
    )
    source_evidence = models.PositiveIntegerField(null=True, blank=True)
    source_suspect = models.PositiveIntegerField(null=True, blank=True)
    source_note = models.ForeignKey(
        DetectiveBoardNote,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="outgoing_relations",
    )
    target_evidence = models.PositiveIntegerField(null=True, blank=True)
    target_suspect = models.PositiveIntegerField(null=True, blank=True)
    target_note = models.ForeignKey(
        DetectiveBoardNote,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="incoming_relations",
    )
    annotation = models.CharField(max_length=255, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="detective_board_relations_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        indexes = [models.Index(fields=["case", "id"])]

    def __str__(self):
        return f"DetectiveBoardRelation(case={self.case_id}, id={self.id})"


class DetectiveBoardLayout(models.Model):
    """
    Persistent layout for detective board nodes per case.
    Stores node positions keyed by node id (e-<id>, s-<id>, n-<id>).
    """

    case = models.OneToOneField(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="detective_board_layout",
    )
    node_positions = models.JSONField(default=dict, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_detective_board_layouts",
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"DetectiveBoardLayout(case={self.case_id})"
