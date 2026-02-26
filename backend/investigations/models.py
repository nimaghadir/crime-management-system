from django.conf import settings
from django.db import models


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
