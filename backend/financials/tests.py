
import uuid
from decimal import Decimal

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import BASIC_USER, CADET, DETECTIVE, POLICE_OFFICER
from accounts.models import User
from cases.models import Case
from financials.models import RewardTip


def _unique_id():
    return str(uuid.uuid4().int)


def create_user(username, role, password="testpass123"):
    uid = _unique_id()
    user = User.objects.create_user(
        username=username,
        password=password,
        national_id=uid[:10],
        phone_number=f"09{uid[:9]}",
        email=f"{username}-{uid[:6]}@example.com",
    )
    group, _ = Group.objects.get_or_create(name=role)
    user.groups.add(group)
    return user


def create_case(title, officer=None, detective=None):
    return Case.objects.create(
        title=title,
        description=f"{title} description",
        crime_level=Case.CrimeLevel.LEVEL_1,
        status=Case.Status.OPEN,
        creation_method=Case.CreationMethod.COMPLAINT,
        assigned_police_officer=officer,
        assigned_detective=detective,
    )


def create_tip(submitter, case=None, status_value=RewardTip.Status.SUBMITTED):
    return RewardTip.objects.create(
        submitter=submitter,
        case=case,
        content='{"subject_type":"case","title":"T","description":"D"}',
        status=status_value,
    )


class FinancialsTipApiTests(APITestCase):
    def setUp(self):
        self.basic_user = create_user("basic_tip", BASIC_USER)
        self.cadet = create_user("cadet_tip", CADET)
        self.officer = create_user("officer_tip", POLICE_OFFICER)
        self.other_officer = create_user("other_officer_tip", POLICE_OFFICER)
        self.detective = create_user("detective_tip", DETECTIVE)
        self.other_detective = create_user("other_detective_tip", DETECTIVE)

        self.case_for_officer = create_case("Officer Case", officer=self.officer, detective=self.detective)
        self.case_for_other_officer = create_case("Other Officer Case", officer=self.other_officer, detective=self.other_detective)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_basic_user_can_submit_tip_for_case(self):
        self._auth(self.basic_user)
        response = self.client.post(
            "/api/financials/tips/",
            {
                "subject_type": "case",
                "case_id": self.case_for_officer.id,
                "title": "Possible lead",
                "description": "I saw a suspicious vehicle.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RewardTip.objects.count(), 1)
        tip = RewardTip.objects.first()
        self.assertEqual(tip.submitter_id, self.basic_user.id)
        self.assertEqual(tip.case_id, self.case_for_officer.id)
        self.assertEqual(tip.reviewing_officer_id, self.officer.id)

    def test_non_basic_user_or_suspect_cannot_submit_tip(self):
        self._auth(self.cadet)
        response = self.client.post(
            "/api/financials/tips/",
            {
                "subject_type": "case",
                "case_id": self.case_for_officer.id,
                "title": "Invalid",
                "description": "Cadet should not submit tip here.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_officer_queue_requires_police_officer_role(self):
        self._auth(self.basic_user)
        response = self.client.get("/api/financials/tips/officer-queue/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_officer_queue_is_scoped_to_assigned_officer(self):
        create_tip(self.basic_user, case=self.case_for_officer, status_value=RewardTip.Status.SUBMITTED)
        create_tip(self.basic_user, case=self.case_for_other_officer, status_value=RewardTip.Status.SUBMITTED)

        self._auth(self.officer)
        response = self.client.get("/api/financials/tips/officer-queue/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row["case_id"] for row in response.data}
        self.assertIn(self.case_for_officer.id, returned_ids)
        self.assertNotIn(self.case_for_other_officer.id, returned_ids)

    def test_officer_can_forward_tip_and_detective_queue_receives_it(self):
        tip = create_tip(self.basic_user, case=self.case_for_officer, status_value=RewardTip.Status.SUBMITTED)

        self._auth(self.officer)
        review_response = self.client.post(
            f"/api/financials/tips/{tip.id}/officer-review/",
            {"action": "forward", "note": "Forwarding to detective"},
            format="json",
        )
        self.assertEqual(review_response.status_code, status.HTTP_200_OK)
        tip.refresh_from_db()
        self.assertEqual(tip.status, RewardTip.Status.FORWARDED)
        self.assertEqual(tip.reviewing_officer_id, self.officer.id)

        self._auth(self.detective)
        queue_response = self.client.get("/api/financials/tips/detective-queue/")
        self.assertEqual(queue_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == tip.id for item in queue_response.data))

    def test_submitter_can_upload_attachment_and_officer_can_list_it(self):
        tip = create_tip(self.basic_user, case=self.case_for_officer, status_value=RewardTip.Status.SUBMITTED)
        upload = SimpleUploadedFile("tip-photo.png", b"fake-image-content", content_type="image/png")

        self._auth(self.basic_user)
        upload_response = self.client.post(
            f"/api/financials/tips/{tip.id}/attachments/",
            {"file": upload, "mime_type": "image/png", "original_name": "tip-photo.png"},
            format="multipart",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)

        self._auth(self.officer)
        list_response = self.client.get(f"/api/financials/tips/{tip.id}/attachments/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["original_name"], "tip-photo.png")

    def test_detective_approve_tip_requires_reward_amount_and_sets_code(self):
        tip = create_tip(self.basic_user, case=self.case_for_officer, status_value=RewardTip.Status.FORWARDED)

        self._auth(self.detective)
        bad_response = self.client.post(
            f"/api/financials/tips/{tip.id}/detective-review/",
            {"action": "approve", "note": "missing amount"},
            format="json",
        )
        self.assertEqual(bad_response.status_code, status.HTTP_400_BAD_REQUEST)

        ok_response = self.client.post(
            f"/api/financials/tips/{tip.id}/detective-review/",
            {"action": "approve", "note": "valid", "reward_amount": "2500000.00"},
            format="json",
        )
        self.assertEqual(ok_response.status_code, status.HTTP_200_OK)
        tip.refresh_from_db()
        self.assertEqual(tip.status, RewardTip.Status.CONFIRMED)
        self.assertEqual(tip.reward_amount, Decimal("2500000.00"))
        self.assertTrue(bool(tip.unique_code))
