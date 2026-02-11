from django.conf import settings
from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self) -> str:
        return self.name


class Case(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Level(models.IntegerChoices):
        LEVEL_3 = 3, "Level 3"
        LEVEL_2 = 2, "Level 2"
        LEVEL_1 = 1, "Level 1"
        CRITICAL = 4, "Critical"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    level = models.PositiveSmallIntegerField(choices=Level.choices, default=Level.LEVEL_3)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases_created",
        on_delete=models.PROTECT,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    version = models.PositiveIntegerField(default=1)
    tags = models.ManyToManyField(Tag, related_name="cases", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["level"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["assigned_to"]),
        ]

    def __str__(self) -> str:
        return self.title


class Complaint(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    case = models.ForeignKey(
        Case, related_name="complaints", on_delete=models.SET_NULL, null=True, blank=True
    )
    complainant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="complaints",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CaseHistory(models.Model):
    case = models.ForeignKey(Case, related_name="history", on_delete=models.CASCADE)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="case_history_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    delta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["case", "created_at"]),
        ]
