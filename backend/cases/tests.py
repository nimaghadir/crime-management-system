from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Case, CaseHistory, Complaint, Tag


class CasesModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="owner", password="pass")

    def test_case_defaults(self):
        case = Case.objects.create(title="Case A", created_by=self.user)
        self.assertEqual(case.status, Case.Status.OPEN)
        self.assertEqual(case.level, Case.Level.LEVEL_3)
        self.assertEqual(case.version, 1)

    def test_case_tag_many_to_many(self):
        case = Case.objects.create(title="Case B", created_by=self.user)
        tag = Tag.objects.create(name="urgent")
        case.tags.add(tag)
        self.assertEqual(case.tags.count(), 1)

    def test_complaint_can_be_created_without_case(self):
        complaint = Complaint.objects.create(
            complainant=self.user,
            title="Missing docs",
            description="Some details",
        )
        self.assertIsNone(complaint.case)
        self.assertEqual(complaint.status, Complaint.Status.PENDING)

    def test_case_history_defaults(self):
        case = Case.objects.create(title="Case C", created_by=self.user)
        history = CaseHistory.objects.create(case=case, actor=self.user)
        self.assertEqual(history.action, "")
        self.assertEqual(history.delta, {})
