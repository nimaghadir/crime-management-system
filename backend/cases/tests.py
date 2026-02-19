from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import (
    ROLE_CODE_CAPTAIN,
    ROLE_CODE_COMPLAINANT,
    ROLE_CODE_INTERN,
    ROLE_CODE_POLICE_CHIEF,
    ROLE_CODE_POLICE_OFFICER,
    ROLE_FLAG_CODE_KEY,
)
from accounts.models import Role
from investigations.models import Suspect

from .models import Case, CaseComplainant, CaseHistory, Complaint, CrimeSceneReport, Tag
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
        self.assertEqual(complaint.workflow_status, Complaint.WorkflowStatus.INTERN_REVIEW)

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


class ComplaintWorkflowApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()

        complainant_role = Role.objects.create(
            name="Complainant",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_COMPLAINANT},
        )
        intern_role = Role.objects.create(
            name="Intern",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_INTERN},
        )
        officer_role = Role.objects.create(
            name="Officer",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_POLICE_OFFICER},
        )
        captain_role = Role.objects.create(
            name="Captain",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_CAPTAIN},
        )

        self.complainant = user_model.objects.create_user(
            username="complainant-user",
            password="pass12345",
            role=complainant_role,
            national_id="1000000001",
            phone="09120000001",
            first_name="Complainant",
            last_name="User",
        )
        self.intern = user_model.objects.create_user(
            username="intern-user",
            password="pass12345",
            role=intern_role,
            national_id="1000000002",
            phone="09120000002",
        )
        self.officer = user_model.objects.create_user(
            username="officer-user-case",
            password="pass12345",
            role=officer_role,
            national_id="1000000003",
            phone="09120000003",
        )
        self.other_officer = user_model.objects.create_user(
            username="other-officer-user-case",
            password="pass12345",
            role=officer_role,
            national_id="1000000005",
            phone="09120000005",
        )
        self.captain = user_model.objects.create_user(
            username="captain-user-case",
            password="pass12345",
            role=captain_role,
            national_id="1000000004",
            phone="09120000004",
        )
        self.other_complainant = user_model.objects.create_user(
            username="other-complainant-user",
            password="pass12345",
            role=complainant_role,
            national_id="1000000006",
            phone="09120000006",
        )

    def test_complainant_to_intern_to_officer_approval_flow(self):
        self.client.force_authenticate(user=self.complainant)
        complaint_response = self.client.post(
            reverse("complaints-list"),
            {"title": "Complaint A", "description": "Complaint details"},
            format="json",
        )
        self.assertEqual(complaint_response.status_code, status.HTTP_201_CREATED)
        complaint_id = complaint_response.data["id"]

        self.client.force_authenticate(user=self.intern)
        forward_response = self.client.post(
            reverse("complaints-intern-forward-to-officer", args=[complaint_id]),
            {"officer": self.officer.id, "intern_note": "Validated by intern."},
            format="json",
        )
        self.assertEqual(forward_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            forward_response.data["workflow_status"],
            Complaint.WorkflowStatus.OFFICER_REVIEW,
        )

        self.client.force_authenticate(user=self.officer)
        approve_response = self.client.post(
            reverse("complaints-officer-approve", args=[complaint_id]),
            {"assigned_to": self.officer.id, "level": Case.Level.LEVEL_2},
            format="json",
        )
        self.assertEqual(approve_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("case", approve_response.data)
        self.assertEqual(
            approve_response.data["complaint"]["workflow_status"],
            Complaint.WorkflowStatus.APPROVED,
        )

        complaint = Complaint.objects.get(pk=complaint_id)
        self.assertIsNotNone(complaint.case_id)
        self.assertEqual(complaint.status, Complaint.Status.APPROVED)

    def test_intern_correction_after_three_attempts_voids_complaint(self):
        self.client.force_authenticate(user=self.complainant)
        create_response = self.client.post(
            reverse("complaints-list"),
            {"title": "Complaint B", "description": "Needs revision"},
            format="json",
        )
        complaint_id = create_response.data["id"]

        for attempt in range(1, 4):
            self.client.force_authenticate(user=self.intern)
            correction_response = self.client.post(
                reverse("complaints-intern-request-correction", args=[complaint_id]),
                {"message": f"Fix issue #{attempt}"},
                format="json",
            )
            self.assertEqual(correction_response.status_code, status.HTTP_200_OK)
            if attempt < 3:
                self.assertEqual(
                    correction_response.data["workflow_status"],
                    Complaint.WorkflowStatus.COMPLAINANT_REVISION,
                )
                self.client.force_authenticate(user=self.complainant)
                resubmit_response = self.client.patch(
                    reverse("complaints-detail", args=[complaint_id]),
                    {"description": f"Updated description #{attempt}"},
                    format="json",
                )
                self.assertEqual(resubmit_response.status_code, status.HTTP_200_OK)
                self.assertEqual(
                    resubmit_response.data["workflow_status"],
                    Complaint.WorkflowStatus.INTERN_REVIEW,
                )

        complaint = Complaint.objects.get(pk=complaint_id)
        self.assertEqual(complaint.workflow_status, Complaint.WorkflowStatus.VOID)
        self.assertEqual(complaint.status, Complaint.Status.REJECTED)
        self.assertEqual(complaint.revision_count, 3)

    def test_officer_returns_to_intern_not_directly_to_complainant(self):
        complaint = Complaint.objects.create(
            complainant=self.complainant,
            title="Complaint C",
            description="Initial",
            workflow_status=Complaint.WorkflowStatus.OFFICER_REVIEW,
            forwarded_to=self.officer,
        )

        self.client.force_authenticate(user=self.officer)
        return_response = self.client.post(
            reverse("complaints-officer-return-to-intern", args=[complaint.id]),
            {"message": "Need deeper intern verification."},
            format="json",
        )
        self.assertEqual(return_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            return_response.data["workflow_status"],
            Complaint.WorkflowStatus.INTERN_REVIEW,
        )
        self.assertNotEqual(
            return_response.data["workflow_status"],
            Complaint.WorkflowStatus.COMPLAINANT_REVISION,
        )

    def test_non_intern_cannot_forward_complaint_to_officer(self):
        complaint = Complaint.objects.create(
            complainant=self.complainant,
            title="Complaint D",
            description="Initial",
        )
        self.client.force_authenticate(user=self.complainant)
        response = self.client.post(
            reverse("complaints-intern-forward-to-officer", args=[complaint.id]),
            {"officer": self.officer.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_complainant_roles_can_create_complaints(self):
        self.client.force_authenticate(user=self.intern)
        response = self.client.post(
            reverse("complaints-list"),
            {"title": "Invalid creator", "description": "Intern should be blocked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Complaint.objects.count(), 0)

    def test_complainant_can_edit_only_in_revision_stage(self):
        complaint = Complaint.objects.create(
            complainant=self.complainant,
            title="Complaint E",
            description="Initial content",
            workflow_status=Complaint.WorkflowStatus.INTERN_REVIEW,
        )
        self.client.force_authenticate(user=self.complainant)
        response = self.client.patch(
            reverse("complaints-detail", args=[complaint.id]),
            {"description": "Updated content"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_intern_forward_rejects_non_officer_target(self):
        complaint = Complaint.objects.create(
            complainant=self.complainant,
            title="Complaint F",
            description="Initial content",
            workflow_status=Complaint.WorkflowStatus.INTERN_REVIEW,
        )
        self.client.force_authenticate(user=self.intern)
        response = self.client.post(
            reverse("complaints-intern-forward-to-officer", args=[complaint.id]),
            {"officer": self.other_complainant.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_officer_cannot_approve_complaint_assigned_to_another_officer(self):
        complaint = Complaint.objects.create(
            complainant=self.complainant,
            title="Complaint G",
            description="Initial content",
            workflow_status=Complaint.WorkflowStatus.OFFICER_REVIEW,
            forwarded_to=self.other_officer,
        )
        self.client.force_authenticate(user=self.officer)
        response = self.client.post(
            reverse("complaints-officer-approve", args=[complaint.id]),
            {"level": Case.Level.LEVEL_2},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_complainant_list_shows_only_owned_complaints(self):
        own_complaint = Complaint.objects.create(
            complainant=self.complainant,
            title="Owned complaint",
            description="Owned",
        )
        Complaint.objects.create(
            complainant=self.other_complainant,
            title="Other complaint",
            description="Other",
        )

        self.client.force_authenticate(user=self.complainant)
        response = self.client.get(reverse("complaints-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], own_complaint.id)

    def test_intern_can_list_all_complaints(self):
        Complaint.objects.create(
            complainant=self.complainant,
            title="Owned complaint",
            description="Owned",
        )
        Complaint.objects.create(
            complainant=self.other_complainant,
            title="Other complaint",
            description="Other",
        )

        self.client.force_authenticate(user=self.intern)
        response = self.client.get(reverse("complaints-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)


class CrimeSceneReportApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        police_officer_role = Role.objects.create(
            name="Police Officer",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_POLICE_OFFICER},
        )
        captain_role = Role.objects.create(
            name="Police Captain",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_CAPTAIN},
        )
        police_chief_role = Role.objects.create(
            name="Police Chief",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_POLICE_CHIEF},
        )
        intern_role = Role.objects.create(
            name="Intern 2",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_INTERN},
        )

        self.officer = user_model.objects.create_user(
            username="scene-officer",
            password="pass12345",
            role=police_officer_role,
        )
        self.captain = user_model.objects.create_user(
            username="scene-captain",
            password="pass12345",
            role=captain_role,
        )
        self.chief = user_model.objects.create_user(
            username="scene-chief",
            password="pass12345",
            role=police_chief_role,
        )
        self.intern = user_model.objects.create_user(
            username="scene-intern",
            password="pass12345",
            role=intern_role,
        )
        complainant_role = Role.objects.create(
            name="Scene Complainant",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_COMPLAINANT},
        )
        self.complainant = user_model.objects.create_user(
            username="scene-complainant",
            password="pass12345",
            role=complainant_role,
        )

    def test_police_officer_report_requires_superior_approval(self):
        self.client.force_authenticate(user=self.officer)
        create_response = self.client.post(
            reverse("crime-scene-reports-list"),
            {
                "title": "Street Robbery",
                "description": "Observed by patrol unit.",
                "location": "District 7",
                "observed_at": "2026-02-19T12:00:00Z",
                "witnesses": [
                    {
                        "full_name": "Witness One",
                        "national_id": "3000000001",
                        "phone": "09121110001",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        report_id = create_response.data["id"]
        self.assertEqual(
            create_response.data["status"],
            CrimeSceneReport.Status.PENDING_SUPERIOR_REVIEW,
        )

        self.client.force_authenticate(user=self.captain)
        approve_response = self.client.post(
            reverse("crime-scene-reports-approve", args=[report_id]),
            {"note": "Approved by superior rank."},
            format="json",
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_response.data["status"], CrimeSceneReport.Status.APPROVED)
        self.assertIsNotNone(approve_response.data["case"])

    def test_police_chief_report_is_auto_approved(self):
        self.client.force_authenticate(user=self.chief)
        response = self.client.post(
            reverse("crime-scene-reports-list"),
            {
                "title": "Chief Report",
                "description": "Directly reported by chief.",
                "location": "Headquarter",
                "observed_at": "2026-02-19T12:30:00Z",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], CrimeSceneReport.Status.APPROVED)
        self.assertIsNotNone(response.data["case"])

    def test_intern_cannot_create_crime_scene_report(self):
        self.client.force_authenticate(user=self.intern)
        response = self.client.post(
            reverse("crime-scene-reports-list"),
            {
                "title": "Invalid Intern Report",
                "description": "Should fail.",
                "location": "District 1",
                "observed_at": "2026-02-19T13:00:00Z",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reporter_cannot_approve_own_report(self):
        report = CrimeSceneReport.objects.create(
            title="Self approval test",
            description="",
            location="District 2",
            observed_at="2026-02-19T14:00:00Z",
            reported_by=self.officer,
            status=CrimeSceneReport.Status.PENDING_SUPERIOR_REVIEW,
        )
        self.client.force_authenticate(user=self.officer)
        response = self.client.post(
            reverse("crime-scene-reports-approve", args=[report.id]),
            {"note": "Trying to self approve"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_duplicate_witness_national_id_is_rejected(self):
        self.client.force_authenticate(user=self.officer)
        response = self.client.post(
            reverse("crime-scene-reports-list"),
            {
                "title": "Duplicate witness test",
                "description": "Duplicate national ids",
                "location": "District 9",
                "observed_at": "2026-02-19T15:00:00Z",
                "witnesses": [
                    {
                        "full_name": "Witness One",
                        "national_id": "9000000001",
                        "phone": "09123330001",
                    },
                    {
                        "full_name": "Witness Two",
                        "national_id": "9000000001",
                        "phone": "09123330002",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_non_police_user_sees_only_own_scene_reports(self):
        CrimeSceneReport.objects.create(
            title="Police report",
            description="",
            location="District 10",
            observed_at="2026-02-19T16:00:00Z",
            reported_by=self.officer,
            status=CrimeSceneReport.Status.PENDING_SUPERIOR_REVIEW,
        )
        self.client.force_authenticate(user=self.complainant)
        response = self.client.get(reverse("crime-scene-reports-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_scene_report_approval_records_case_history(self):
        report = CrimeSceneReport.objects.create(
            title="Approval history report",
            description="",
            location="District 11",
            observed_at="2026-02-19T17:00:00Z",
            reported_by=self.officer,
            status=CrimeSceneReport.Status.PENDING_SUPERIOR_REVIEW,
        )
        self.client.force_authenticate(user=self.captain)
        response = self.client.post(
            reverse("crime-scene-reports-approve", args=[report.id]),
            {"note": "Approved with details"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertIsNotNone(report.case_id)
        self.assertTrue(
            CaseHistory.objects.filter(
                case_id=report.case_id,
                action="crime_scene_report_approved",
            ).exists()
        )


class CaseComplainantApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        intern_role = Role.objects.create(
            name="Intern Case Compl",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_INTERN},
        )
        complainant_role = Role.objects.create(
            name="Complainant Case Compl",
            default_flags={ROLE_FLAG_CODE_KEY: ROLE_CODE_COMPLAINANT},
        )
        self.intern = user_model.objects.create_user(
            username="case-compl-intern",
            password="pass12345",
            role=intern_role,
        )
        self.complainant = user_model.objects.create_user(
            username="case-compl-user",
            password="pass12345",
            role=complainant_role,
        )
        self.case = Case.objects.create(
            title="Case with extra complainants",
            description="",
            created_by=self.intern,
        )

    def test_intern_can_approve_case_complainant(self):
        self.client.force_authenticate(user=self.complainant)
        create_response = self.client.post(
            reverse("case-complainants-list"),
            {
                "case": self.case.id,
                "full_name": "New Complainant",
                "national_id": "4000000001",
                "phone": "09122220001",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        record_id = create_response.data["id"]

        self.client.force_authenticate(user=self.intern)
        approve_response = self.client.post(
            reverse("case-complainants-intern-approve", args=[record_id]),
            {"note": "Approved by intern."},
            format="json",
        )
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            approve_response.data["review_status"],
            CaseComplainant.ReviewStatus.APPROVED,
        )

    def test_non_intern_cannot_review_case_complainant(self):
        record = CaseComplainant.objects.create(
            case=self.case,
            full_name="Record",
            national_id="4000000002",
            phone="09122220002",
            submitted_by=self.complainant,
        )
        self.client.force_authenticate(user=self.complainant)
        response = self.client.post(
            reverse("case-complainants-intern-reject", args=[record.id]),
            {"note": "Not allowed."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_national_id_for_same_case_is_rejected(self):
        CaseComplainant.objects.create(
            case=self.case,
            full_name="Existing",
            national_id="4000000003",
            phone="09122220003",
            submitted_by=self.complainant,
        )
        self.client.force_authenticate(user=self.complainant)
        response = self.client.post(
            reverse("case-complainants-list"),
            {
                "case": self.case.id,
                "full_name": "Duplicate",
                "national_id": "4000000003",
                "phone": "09122220004",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_case_filter_limits_case_complainant_list(self):
        other_case = Case.objects.create(
            title="Another case",
            description="",
            created_by=self.intern,
        )
        target = CaseComplainant.objects.create(
            case=self.case,
            full_name="Target",
            national_id="4000000005",
            phone="09122220005",
            submitted_by=self.complainant,
        )
        CaseComplainant.objects.create(
            case=other_case,
            full_name="Not target",
            national_id="4000000006",
            phone="09122220006",
            submitted_by=self.complainant,
        )
        self.client.force_authenticate(user=self.intern)
        response = self.client.get(
            reverse("case-complainants-list"),
            {"case": self.case.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], target.id)
