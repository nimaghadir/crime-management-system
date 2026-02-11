from django.conf import settings
from django.db import models

from cases.models import Case


class Evidence(models.Model):
    class EvidenceType(models.TextChoices):
        TESTIMONY = "testimony", "Testimony"
        BIO_MEDICAL = "bio_medical", "Biological/Medical"
        VEHICLE = "vehicle", "Vehicle"
        IDENTITY = "identity", "Identity Document"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    case = models.ForeignKey(Case, related_name="evidence", on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=EvidenceType.choices)
    metadata = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="evidence_uploaded",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)


class EvidenceAttachment(models.Model):
    evidence = models.ForeignKey(
        Evidence, related_name="attachments", on_delete=models.CASCADE
    )
    file_url = models.CharField(max_length=500, blank=True)
    file_path = models.CharField(max_length=500, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="evidence_attachments_uploaded",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
