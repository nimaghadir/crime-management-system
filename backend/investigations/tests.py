
import uuid

from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import BASIC_USER, DETECTIVE, SERGEANT, SUSPECT
from accounts.models import User
from cases.models import Case, CaseSuspect
from investigations.models import DetectiveBoardLayout, InvestigationAction


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


def create_case(title, detective=None, sergeant=None):
    return Case.objects.create(
        title=title,
        description=f"{title} description",
        crime_level=Case.CrimeLevel.LEVEL_1,
        status=Case.Status.OPEN,
        creation_method=Case.CreationMethod.COMPLAINT,
        assigned_detective=detective,
        assigned_sergeant=sergeant,
    )


class SuspectCandidateApiTests(APITestCase):
    def setUp(self):
        self.detective = create_user("det_candidates", DETECTIVE)
        self.other_detective = create_user("det_candidates_other", DETECTIVE)
        self.basic_user = create_user("basic_candidates", BASIC_USER)
        self.case = create_case("Candidates Case", detective=self.detective)
        self.other_case = create_case("Other Candidates Case", detective=self.other_detective)
        self.suspect_a = create_user("suspect_a", SUSPECT)
        self.suspect_b = create_user("suspect_b", SUSPECT)
        self.non_suspect = create_user("not_suspect", BASIC_USER)

        CaseSuspect.objects.create(case=self.case, suspect=self.suspect_a)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_requires_detective_or_admin(self):
        self._auth(self.basic_user)
        response = self.client.get("/api/investigations/suspect-candidates/", {"case": self.case.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_only_suspects_and_excludes_linked_case_suspects(self):
        self._auth(self.detective)
        response = self.client.get("/api/investigations/suspect-candidates/", {"case": self.case.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row["id"] for row in response.data}
        self.assertIn(self.suspect_b.id, returned_ids)
        self.assertNotIn(self.suspect_a.id, returned_ids)  # already linked to this case
        self.assertNotIn(self.non_suspect.id, returned_ids)  # wrong role

    def test_detective_cannot_query_unassigned_case_candidates(self):
        self._auth(self.detective)
        response = self.client.get("/api/investigations/suspect-candidates/", {"case": self.other_case.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DetectiveBoardLayoutApiTests(APITestCase):
    def setUp(self):
        self.detective = create_user("det_board", DETECTIVE)
        self.sergeant = create_user("sgt_board", SERGEANT)
        self.other_detective = create_user("det_board_other", DETECTIVE)
        self.case = create_case("Board Case", detective=self.detective, sergeant=self.sergeant)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_assigned_detective_can_get_default_and_patch_layout(self):
        self._auth(self.detective)
        url = f"/api/investigations/board-layout/{self.case.id}/"

        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data["node_positions"], {})

        patch_response = self.client.patch(
            url,
            {
                "node_positions": {
                    "s-1": {"x": 12.3456, "y": 78.9012},
                    "bad-key": {"x": 1, "y": 2},  # should be ignored
                }
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["node_positions"], {"s-1": {"x": 12.35, "y": 78.9}})

        layout = DetectiveBoardLayout.objects.get(case=self.case)
        self.assertEqual(layout.updated_by_id, self.detective.id)
        self.assertEqual(layout.node_positions, {"s-1": {"x": 12.35, "y": 78.9}})

    def test_assigned_sergeant_can_view_but_cannot_edit_layout(self):
        self._auth(self.sergeant)
        url = f"/api/investigations/board-layout/{self.case.id}/"

        get_response = self.client.get(url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)

        patch_response = self.client.patch(url, {"node_positions": {"s-1": {"x": 1, "y": 2}}}, format="json")
        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_detective_cannot_access_layout(self):
        self._auth(self.other_detective)
        url = f"/api/investigations/board-layout/{self.case.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class InvestigationActionApiTests(APITestCase):
    def setUp(self):
        self.detective = create_user("det_actions", DETECTIVE)
        self.other_detective = create_user("det_actions_other", DETECTIVE)
        self.case = create_case("Actions Case", detective=self.detective)
        self.other_case = create_case("Other Actions Case", detective=self.other_detective)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_assigned_detective_can_create_list_and_delete_actions(self):
        self._auth(self.detective)
        actions_url = "/api/investigations/actions/"

        create_response = self.client.post(
            actions_url,
            {
                "case": self.case.id,
                "action_type": "referral_submitted",
                "payload": {"suspect_id": 99, "note": "sent to sergeant"},
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        action_id = create_response.data["id"]
        self.assertTrue(InvestigationAction.objects.filter(id=action_id, case=self.case).exists())

        list_response = self.client.get(actions_url, {"case": self.case.id})
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == action_id for item in list_response.data))

        delete_response = self.client.delete(f"{actions_url}?case={self.case.id}&suspect=99")
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(delete_response.data["deleted_count"], 1)
        self.assertFalse(InvestigationAction.objects.filter(id=action_id).exists())

    def test_unassigned_detective_cannot_access_actions_for_other_case(self):
        self._auth(self.detective)
        actions_url = "/api/investigations/actions/"
        get_response = self.client.get(actions_url, {"case": self.other_case.id})
        self.assertEqual(get_response.status_code, status.HTTP_403_FORBIDDEN)

        post_response = self.client.post(
            actions_url,
            {"case": self.other_case.id, "action_type": "x", "payload": {}},
            format="json",
        )
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)
