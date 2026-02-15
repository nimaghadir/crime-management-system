from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from cases.models import Case
from .models import InvestigationAction, Note, Suspect


class InvestigationsModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="officer", password="pass")
        self.case = Case.objects.create(title="Case I", created_by=self.user)

    def test_suspect_score_constraint(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Suspect.objects.create(case=self.case, name="Bad Score", score=11)

    def test_note_defaults(self):
        note = Note.objects.create(case=self.case, author=self.user, text="Follow the lead")
        self.assertFalse(note.pinned)
        self.assertEqual(note.order_index, 0)

    def test_investigation_action_default_payload(self):
        action = InvestigationAction.objects.create(
            case=self.case,
            action_type="link_evidence",
            performed_by=self.user,
        )
        self.assertEqual(action.payload, {})
