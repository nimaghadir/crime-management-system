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

    class WorkflowStatus(models.TextChoices):
        INTERN_REVIEW = "intern_review", "Intern review"
        COMPLAINANT_REVISION = "complainant_revision", "Complainant revision"
        OFFICER_REVIEW = "officer_review", "Officer review"
        APPROVED = "approved", "Approved"
        VOID = "void", "Void"

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
    workflow_status = models.CharField(
        max_length=30,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.INTERN_REVIEW,
        db_index=True,
    )
    revision_count = models.PositiveSmallIntegerField(default=0)
    intern_feedback = models.TextField(blank=True)
    officer_feedback = models.TextField(blank=True)
    forwarded_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="complaints_forwarded_to",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reviewed_by_intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="complaints_reviewed_as_intern",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reviewed_by_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="complaints_reviewed_as_officer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CaseComplainant(models.Model):
    class ReviewStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    case = models.ForeignKey(Case, related_name="complainants", on_delete=models.CASCADE)
    full_name = models.CharField(max_length=200)
    national_id = models.CharField(max_length=20)
    phone = models.CharField(max_length=20)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="case_complainants_submitted",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
    )
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="case_complainants_reviewed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["case", "national_id"],
                name="uniq_case_complainant_national_id",
            )
        ]


class CrimeSceneReport(models.Model):
    class Status(models.TextChoices):
        PENDING_SUPERIOR_REVIEW = "pending_superior_review", "Pending superior review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    observed_at = models.DateTimeField()
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crime_scene_reports",
        on_delete=models.PROTECT,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_SUPERIOR_REVIEW,
        db_index=True,
    )
    reviewer_note = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crime_scene_reports_approved",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    case = models.OneToOneField(
        Case,
        related_name="crime_scene_report",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CrimeSceneWitness(models.Model):
    report = models.ForeignKey(
        CrimeSceneReport,
        related_name="witnesses",
        on_delete=models.CASCADE,
    )
    full_name = models.CharField(max_length=200)
    national_id = models.CharField(max_length=20)
    phone = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["report", "national_id"],
                name="uniq_crimescene_witness_national_id",
            )
        ]


class CaseHistory(models.Model):
    case = models.ForeignKey(Case, related_name="history", on_delete=models.CASCADE)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="case_history_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=100, blank=True)
    delta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["case", "created_at"]),
        ]
