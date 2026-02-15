from django.contrib.auth import get_user_model
from django.test import TestCase

from investigations.models import Suspect

from .models import Case, CaseHistory, Complaint, Tag
from .serializers import CaseDetailSerializer, CaseListSerializer


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


class CasesSerializerTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="owner2", password="pass")
        self.assignee = user_model.objects.create_user(username="assignee", password="pass")

    def test_case_list_serializer_includes_minimal_fields(self):
        case = Case.objects.create(
            title="Case List Item",
            created_by=self.owner,
            assigned_to=self.assignee,
            status=Case.Status.IN_PROGRESS,
            level=Case.Level.LEVEL_2,
        )

        data = CaseListSerializer(case).data
        self.assertEqual(
            set(data.keys()),
            {"id", "title", "status", "level", "assigned_to", "updated_at"},
        )
        self.assertEqual(data["title"], "Case List Item")
        self.assertEqual(data["status"], Case.Status.IN_PROGRESS)
        self.assertEqual(data["level"], Case.Level.LEVEL_2)
        self.assertEqual(data["assigned_to"], self.assignee.id)

    def test_case_detail_serializer_includes_nested_summaries(self):
        case = Case.objects.create(
            title="Case Detail",
            description="Detail body",
            created_by=self.owner,
            assigned_to=self.assignee,
            status=Case.Status.OPEN,
            level=Case.Level.LEVEL_1,
        )
        tag = Tag.objects.create(name="forensic")
        case.tags.add(tag)
        suspect = Suspect.objects.create(
            case=case,
            name="John Doe",
            status=Suspect.Status.SUSPECT,
            score=7,
        )

        data = CaseDetailSerializer(case).data
        self.assertIn("assigned_to", data)
        self.assertEqual(data["assigned_to"]["id"], self.assignee.id)
        self.assertEqual(data["assigned_to"]["username"], "assignee")
        self.assertIn("role_name", data["assigned_to"])

        self.assertEqual(len(data["tags"]), 1)
        self.assertEqual(data["tags"][0]["id"], tag.id)
        self.assertEqual(data["tags"][0]["name"], "forensic")

        self.assertEqual(len(data["suspects"]), 1)
        self.assertEqual(data["suspects"][0]["id"], suspect.id)
        self.assertEqual(data["suspects"][0]["name"], "John Doe")
        self.assertEqual(data["suspects"][0]["score"], 7)
