# evidence/models.py

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class BaseEvidence(models.Model):
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='%(class)s_evidence'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='%(class)s_submissions'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"[{self.__class__.__name__}] {self.title} (Case #{self.case_id})"


class TestimonyEvidence(BaseEvidence):
    """Witness/local people statements + any media they captured."""
    transcript = models.TextField(blank=True)
    media_file = models.FileField(upload_to='evidence/testimony/', null=True, blank=True)


class TestimonyMediaFile(models.Model):
    evidence = models.ForeignKey(TestimonyEvidence, on_delete=models.CASCADE, null=False, blank=False)
    media_file = models.FileField(upload_to='evidence/testimony/', null=True, blank=True)


class BiologicalEvidence(BaseEvidence):
    """Blood, hair, fingerprints — reviewed by coroner and/or identity database."""

    class ReviewStatus(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        REJECTED  = 'rejected',  'Rejected'

    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING
    )
    # Filled by the coroner after lab analysis
    doctor_notes = models.TextField(blank=True)
    # Filled after checking the national identity database
    identity_db_notes = models.TextField(blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='biological_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)


class BiologicalEvidenceImage(models.Model):
    """One-to-many images attached to a piece of biological evidence."""
    evidence = models.ForeignKey(
        BiologicalEvidence,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='evidence/biological/')

    def __str__(self):
        return f"Image for BiologicalEvidence #{self.evidence_id}"


class VehicleEvidence(BaseEvidence):
    """Vehicle found at the crime scene. Either license plate OR serial number, never both."""
    model_name    = models.CharField(max_length=100)
    color         = models.CharField(max_length=50)
    license_plate = models.CharField(max_length=20, null=True, blank=True)
    serial_number = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                # Exactly one of the two must be non-null
                check=(
                    models.Q(license_plate__isnull=False, serial_number__isnull=True) |
                    models.Q(license_plate__isnull=True,  serial_number__isnull=False)
                ),
                name='vehicle_evidence_plate_xor_serial'
            )
        ]

    def clean(self):
        has_plate  = bool(self.license_plate)
        has_serial = bool(self.serial_number)
        if has_plate and has_serial:
            raise ValidationError("Provide either a license plate or a serial number, not both.")
        if not has_plate and not has_serial:
            raise ValidationError("Either a license plate or a serial number is required.")


class IdentificationDocument(BaseEvidence):
    """ID card, passport, etc. found at the scene. Dynamic key-value extra fields."""
    owner_name       = models.CharField(max_length=255)
    # e.g. {"issued_by": "LAPD", "issue_date": "1947-03-15"}
    # Can be an empty dict — no fixed schema required.
    document_details = models.JSONField(default=dict, blank=True)


class OtherEvidence(BaseEvidence):
    """Catch-all for anything that doesn't fit the other categories."""
    additional_notes = models.JSONField(default=dict, blank=True)
