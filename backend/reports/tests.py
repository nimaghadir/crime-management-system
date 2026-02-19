from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from evidence.models import Evidence


class DetectiveBoardSummaryApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="report-user", password="pass12345")
        self.other_user = user_model.objects.create_user(
            username="report-user-2",
            password="pass12345",
        )
        self.client.force_authenticate(user=self.user)

    def test_detective_board_summary_returns_assigned_counts(self):
        active_critical_case = Case.objects.create(
            title="Critical Case",
            created_by=self.user,
            assigned_to=self.user,
            status=Case.Status.OPEN,
            level=Case.Level.CRITICAL,
        )
        Case.objects.create(
            title="In Progress",
            created_by=self.user,
            assigned_to=self.user,
            status=Case.Status.IN_PROGRESS,
            level=Case.Level.LEVEL_2,
        )
        Case.objects.create(
            title="Closed Case",
            created_by=self.user,
            assigned_to=self.user,
            status=Case.Status.CLOSED,
            level=Case.Level.CRITICAL,
        )
        other_case = Case.objects.create(
            title="Other Detective Case",
            created_by=self.other_user,
            assigned_to=self.other_user,
            status=Case.Status.OPEN,
            level=Case.Level.CRITICAL,
        )

        Evidence.objects.create(
            case=active_critical_case,
            type=Evidence.EvidenceType.OTHER,
            status=Evidence.Status.PENDING,
            uploaded_by=self.user,
        )
        Evidence.objects.create(
            case=active_critical_case,
            type=Evidence.EvidenceType.VEHICLE,
            status=Evidence.Status.VERIFIED,
            uploaded_by=self.user,
        )
        Evidence.objects.create(
            case=other_case,
            type=Evidence.EvidenceType.IDENTITY,
            status=Evidence.Status.PENDING,
            uploaded_by=self.other_user,
        )

        response = self.client.get(reverse("reports-detective-board-summary"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["open_assigned_cases"], 2)
        self.assertEqual(response.data["urgent_cases"], 1)
        self.assertEqual(response.data["pending_evidence"], 1)
