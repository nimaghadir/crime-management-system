# cases/models.py
from django.contrib.auth.models import Group

from django.db import models
from django.conf import settings


class Case(models.Model):
    class CrimeLevel(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        LEVEL_1 = 'level_1', 'Level 1'
        LEVEL_2 = 'level_2', 'Level 2'
        LEVEL_3 = 'level_3', 'Level 3'

    class Status(models.TextChoices):
        AWAITING_VALIDATION = "awaiting_validation", "Awaiting Validation"
        INVALIDATED = 'invalidated', 'Invalidated'
        OPEN = 'open', 'Open'
        UNDER_INVESTIGATION = 'under_investigation', 'Under Investigation'
        AWAITING_TRIAL = 'awaiting_trial', 'Awaiting Trial'
        CLOSED = 'closed', 'Closed'

    class CreationMethod(models.TextChoices):
        COMPLAINT = 'complaint', 'Complaint'
        CRIME_SCENE = 'crime_scene', 'Crime Scene'

    title = models.CharField(max_length=255)
    description = models.TextField()
    crime_level = models.CharField(max_length=20, choices=CrimeLevel.choices)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.OPEN)
    creation_method = models.CharField(max_length=20, choices=CreationMethod.choices)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    incident_datetime = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=512, blank=True)

    # The officer/rank who registered the case (for crime scene cases)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='registered_cases'
    )

    # Detective assigned to the case
    assigned_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='detective_cases'
    )

    # Sergeant assigned to the case
    assigned_sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sergeant_cases'
    )

    def __str__(self):
        return f"[{self.crime_level.upper()}] {self.title} ({self.status})"

class CaseValidationReview(models.Model):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="validation_reviews"
    )

    source = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="case_review_actions_initiated"
    )

    destination = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="case_review_actions_received"
    )

    message = models.TextField(null=True, blank=True)
    validated = models.BooleanField(null=True, blank=True)
    resolved = models.BooleanField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

class Complainant(models.Model):
    """
    Links a user (complainant role) to a case.
    """
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='complainants')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='complaints'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('case', 'user')

    def __str__(self):
        return f"{self.user.username} on Case #{self.case.id} ({self.status})"


class CaseWitness(models.Model):
    """
    Witnesses registered for crime-scene cases (phone + national_id for follow-up).
    May or may not be a registered system user.
    """
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='witnesses')
    phone_number = models.CharField(max_length=15)
    national_id = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.full_name} (witness for Case #{self.case.id})"


class CaseSuspect(models.Model):
    """
    Links a suspect (system user) to a case, with scoring by detective and sergeant.
    """
    class ArrestStatus(models.TextChoices):
        FREE = 'free', 'Free'
        AWAITING_SERGEANT = 'awaiting_sergeant'
        WARRANT_ISSUED = 'warrant_issued', 'Warrant Issued'
        ARRESTED = 'arrested', 'Arrested'
        AWAITING_CAPTAIN = 'awaiting_captain', 'Awaiting Captain'
        AWAITING_CHIEF = 'awaiting_chief', 'Awaiting Chief'
        ON_TRIAL = 'on_trial', 'On Trial'
        RELEASED = 'released', 'Released'

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='suspects')
    suspect = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='suspect_in_cases'
    )

    sergeant_comments = models.TextField(null=True, blank=True)

    confession_transcript = models.TextField(null=True, blank=True)

    detective_guilt_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Score 1-10 assigned by detective"
    )
    sergeant_guilt_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Score 1-10 assigned by sergeant"
    )

    arrest_status = models.CharField(
        max_length=20,
        choices=ArrestStatus.choices,
        default=ArrestStatus.FREE
    )
    arrest_warrant_issued_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('case', 'suspect')

    def __str__(self):
        return f"Suspect {self.suspect.username} in Case #{self.case.id}"
