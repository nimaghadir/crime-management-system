# evidence/models.py

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class TestimonyEvidence(models.Model):
    """Witness/local people statements + any media they captured."""

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='testimonies'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='testimony_submissions'
    )
    witness = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='witness_testimonies'
    )
    title         = models.CharField(max_length=255)
    description   = models.TextField()
    transcript    = models.TextField(blank=True)
    media_file    = models.FileField(upload_to='evidence/testimony/', null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[TestimonyEvidence] {self.title} (Case #{self.case_id})"


class BiologicalEvidence(models.Model):
    """Blood, hair, fingerprints — reviewed by coroner and/or identity database."""

    class ReviewStatus(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        REJECTED  = 'rejected',  'Rejected'

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='biological_evidences'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='biological_submissions'
    )
    title         = models.CharField(max_length=255)
    description   = models.TextField()
    registered_at = models.DateTimeField(auto_now_add=True)

    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING
    )
    doctor_notes      = models.TextField(blank=True)
    identity_db_notes = models.TextField(blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='biological_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"[BiologicalEvidence] {self.title} (Case #{self.case_id})"


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


class VehicleEvidence(models.Model):
    """Vehicle found at the crime scene. Either license plate OR serial number, never both."""

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='vehicle_evidences'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='vehicle_submissions'
    )
    title         = models.CharField(max_length=255)
    description   = models.TextField()
    registered_at = models.DateTimeField(auto_now_add=True)

    model_name    = models.CharField(max_length=100)
    color         = models.CharField(max_length=50)
    license_plate = models.CharField(max_length=20,  null=True, blank=True)
    serial_number = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
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
            raise ValidationError(
                "Provide either a license plate or a serial number, not both."
            )
        if not has_plate and not has_serial:
            raise ValidationError(
                "Either a license plate or a serial number is required."
            )

    def __str__(self):
        return f"[VehicleEvidence] {self.title} (Case #{self.case_id})"


class IdentificationDocument(models.Model):
    """ID card, passport, etc. found at the scene. Dynamic key-value extra fields."""

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='identification_documents'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='identification_submissions'
    )
    title         = models.CharField(max_length=255)
    description   = models.TextField()
    registered_at = models.DateTimeField(auto_now_add=True)

    owner_name       = models.CharField(max_length=255)
    document_details = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"[IdentificationDocument] {self.title} (Case #{self.case_id})"


class OtherEvidence(models.Model):
    """Catch-all for anything that doesn't fit the other categories."""

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='other_evidences'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='other_submissions'
    )
    title         = models.CharField(max_length=255)
    description   = models.TextField()
    registered_at = models.DateTimeField(auto_now_add=True)

    additional_notes = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"[OtherEvidence] {self.title} (Case #{self.case_id})"
