from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

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


class CasesApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="api-owner", password="pass12345")
        self.assignee = user_model.objects.create_user(
            username="api-assignee",
            password="pass12345",
        )
        self.client.force_authenticate(user=self.user)

    def test_case_list_endpoint_returns_minimal_fields(self):
        case = Case.objects.create(
            title="API List Case",
            created_by=self.user,
            assigned_to=self.assignee,
            status=Case.Status.IN_PROGRESS,
            level=Case.Level.LEVEL_2,
        )

        response = self.client.get(reverse("cases-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

        row = response.data["results"][0]
        self.assertEqual(row["id"], case.id)
        self.assertEqual(
            set(row.keys()),
            {"id", "title", "status", "level", "assigned_to", "updated_at"},
        )

    def test_case_retrieve_endpoint_returns_nested_detail(self):
        case = Case.objects.create(
            title="API Detail Case",
            description="Desc",
            created_by=self.user,
            assigned_to=self.assignee,
            level=Case.Level.LEVEL_1,
        )
        tag = Tag.objects.create(name="api-tag")
        case.tags.add(tag)
        Suspect.objects.create(case=case, name="Suspect A", score=5)

        response = self.client.get(reverse("cases-detail", args=[case.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], case.id)
        self.assertEqual(response.data["assigned_to"]["username"], "api-assignee")
        self.assertEqual(len(response.data["tags"]), 1)
        self.assertEqual(len(response.data["suspects"]), 1)

    def test_case_create_sets_created_by_and_default_status(self):
        payload = {
            "title": "New API Case",
            "description": "From API",
            "level": Case.Level.LEVEL_3,
            "assigned_to": self.assignee.id,
        }
        response = self.client.post(reverse("cases-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Case.objects.get(title="New API Case")
        self.assertEqual(created.created_by_id, self.user.id)
        self.assertEqual(created.status, Case.Status.OPEN)

    def test_case_partial_update_applies_valid_transition_and_creates_history(self):
        case = Case.objects.create(
            title="Patchable Case",
            created_by=self.user,
            status=Case.Status.OPEN,
            level=Case.Level.LEVEL_3,
        )

        payload = {
            "status": Case.Status.IN_PROGRESS,
            "level": Case.Level.LEVEL_2,
        }
        response = self.client.patch(reverse("cases-detail", args=[case.id]), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        case.refresh_from_db()
        self.assertEqual(case.status, Case.Status.IN_PROGRESS)
        self.assertEqual(case.level, Case.Level.LEVEL_2)
        self.assertEqual(case.version, 2)

        history = CaseHistory.objects.get(case=case)
        self.assertEqual(history.action, "partial_update")
        self.assertEqual(history.delta["status"]["from"], Case.Status.OPEN)
        self.assertEqual(history.delta["status"]["to"], Case.Status.IN_PROGRESS)

    def test_case_partial_update_rejects_invalid_status_transition(self):
        case = Case.objects.create(
            title="Invalid Status Transition",
            created_by=self.user,
            status=Case.Status.OPEN,
            level=Case.Level.LEVEL_3,
        )

        response = self.client.patch(
            reverse("cases-detail", args=[case.id]),
            {"status": Case.Status.RESOLVED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
        case.refresh_from_db()
        self.assertEqual(case.status, Case.Status.OPEN)
        self.assertEqual(CaseHistory.objects.filter(case=case).count(), 0)

    def test_case_partial_update_rejects_invalid_level_transition(self):
        case = Case.objects.create(
            title="Invalid Level Transition",
            created_by=self.user,
            status=Case.Status.OPEN,
            level=Case.Level.LEVEL_3,
        )

        response = self.client.patch(
            reverse("cases-detail", args=[case.id]),
            {"level": Case.Level.LEVEL_1},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
        case.refresh_from_db()
        self.assertEqual(case.level, Case.Level.LEVEL_3)
        self.assertEqual(CaseHistory.objects.filter(case=case).count(), 0)

    def test_complaint_to_case_conversion_creates_case_and_history(self):
        complaint = Complaint.objects.create(
            complainant=self.assignee,
            title="Complaint Title",
            description="Complaint Description",
        )
        payload = {
            "level": Case.Level.LEVEL_2,
            "assigned_to": self.assignee.id,
        }

        response = self.client.post(
            reverse("cases-complaint-convert", args=[complaint.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint.refresh_from_db()
        self.assertIsNotNone(complaint.case_id)
        self.assertEqual(complaint.status, Complaint.Status.APPROVED)

        created_case = Case.objects.get(pk=complaint.case_id)
        self.assertEqual(created_case.title, "Complaint Title")
        self.assertEqual(created_case.description, "Complaint Description")
        self.assertEqual(created_case.level, Case.Level.LEVEL_2)
        self.assertEqual(created_case.created_by_id, self.user.id)
        self.assertEqual(created_case.assigned_to_id, self.assignee.id)

        history = CaseHistory.objects.get(case=created_case, action="complaint_conversion")
        self.assertEqual(history.delta["complaint_id"], complaint.id)

    def test_complaint_to_case_conversion_rejects_already_converted_complaint(self):
        existing_case = Case.objects.create(
            title="Existing Case",
            created_by=self.user,
            level=Case.Level.LEVEL_3,
        )
        complaint = Complaint.objects.create(
            complainant=self.assignee,
            title="Converted",
            description="Already linked",
            case=existing_case,
        )

        response = self.client.post(
            reverse("cases-complaint-convert", args=[complaint.id]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_tag_create_and_list_endpoints(self):
        create_response = self.client.post(
            reverse("tags-list"),
            {"name": "urgent"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["name"], "urgent")

        list_response = self.client.get(reverse("tags-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["results"]), 1)
        self.assertEqual(list_response.data["results"][0]["name"], "urgent")

    def test_case_list_filters_by_status_level_and_tag(self):
        case_open = Case.objects.create(
            title="Open Fraud",
            created_by=self.user,
            status=Case.Status.OPEN,
            level=Case.Level.LEVEL_3,
        )
        case_progress = Case.objects.create(
            title="In Progress Theft",
            created_by=self.user,
            status=Case.Status.IN_PROGRESS,
            level=Case.Level.LEVEL_2,
        )
        tag = Tag.objects.create(name="fraud")
        case_open.tags.add(tag)

        response = self.client.get(
            reverse("cases-list"),
            {"status": Case.Status.OPEN, "level": Case.Level.LEVEL_3, "tag": "fraud"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], case_open.id)
        self.assertNotEqual(response.data["results"][0]["id"], case_progress.id)

    def test_case_list_filter_with_invalid_level_returns_validation_error(self):
        Case.objects.create(title="Any Case", created_by=self.user, level=Case.Level.LEVEL_3)
        response = self.client.get(reverse("cases-list"), {"level": "invalid"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
