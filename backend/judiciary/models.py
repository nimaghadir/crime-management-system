from django.db import models
from django.conf import settings

# Create your models here.
class Trial(models.Model):
    """
    Represents a court trial for a case.
    The judge sees the full case file, all evidence, all involved officers,
    and every report/approval/rejection attached to the case.
    After deliberation the judge records a verdict and, if guilty, a punishment.
    """

    class Verdict(models.TextChoices):
        GUILTY    = 'guilty',    'Guilty'
        INNOCENT  = 'innocent',  'Innocent'
        PENDING   = 'pending',   'Pending'

    case = models.OneToOneField(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='trial'
    )
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='presided_trials'
    )

    verdict     = models.CharField(max_length=20, choices=Verdict.choices, default=Verdict.PENDING)
    held_at     = models.DateTimeField(null=True, blank=True)
    concluded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Trial for Case #{self.case_id} — {self.verdict}"


class Punishment(models.Model):
    """
    Recorded by the judge only when the verdict is GUILTY.
    Stores a title (e.g. "10 years imprisonment") and a full explanation.
    """
    trial       = models.OneToOneField(Trial, on_delete=models.CASCADE, related_name='punishment')
    title       = models.CharField(max_length=255)
    explanation = models.TextField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Punishment: {self.title} (Trial #{self.trial_id})"
