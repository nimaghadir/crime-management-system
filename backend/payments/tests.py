from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from cases.models import Case
from .models import PaymentRecord, Reward


class PaymentsModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="cashier", password="pass")
        self.case = Case.objects.create(title="Case P", created_by=self.user)

    def test_reward_code_is_unique(self):
        Reward.objects.create(code="RWD-1", amount=1000, case=self.case, assigned_to=self.user)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Reward.objects.create(
                    code="RWD-1",
                    amount=1500,
                    case=self.case,
                    assigned_to=self.user,
                )

    def test_payment_record_default_status(self):
        payment = PaymentRecord.objects.create(
            case=self.case,
            amount=2000,
            method=PaymentRecord.Method.GATEWAY,
            paid_by=self.user,
        )
        self.assertEqual(payment.status, PaymentRecord.Status.PENDING)
