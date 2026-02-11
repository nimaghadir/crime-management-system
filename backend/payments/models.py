from django.conf import settings
from django.db import models

from cases.models import Case


class Reward(models.Model):
    code = models.CharField(max_length=50, unique=True)
    amount = models.PositiveBigIntegerField()
    case = models.ForeignKey(
        Case, related_name="rewards", on_delete=models.SET_NULL, null=True, blank=True
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="rewards_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    issued = models.BooleanField(default=False)
    issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentRecord(models.Model):
    class Method(models.TextChoices):
        GATEWAY = "gateway", "Gateway"
        CASH = "cash", "Cash"
        TRANSFER = "transfer", "Transfer"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    case = models.ForeignKey(
        Case, related_name="payments", on_delete=models.SET_NULL, null=True, blank=True
    )
    amount = models.PositiveBigIntegerField()
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    external_txn_id = models.CharField(max_length=100, blank=True, db_index=True)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="payments_made",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
