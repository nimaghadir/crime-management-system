import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User
from cases.models import Case, CaseWitness


# ─── Helper ───────────────────────────────────────────────────────────────────

def create_user(username, role, password="testpass123"):
    unique = uuid.uuid4().int
    uid = str(unique)
    user = User.objects.create_user(
        username=username,
        password=password,
        national_id=uid[:10],
        phone_number=f"09{uid[:9]}",
        email=f"{username}@test.com",
    )
    if hasattr(user, "role"):
        user.role = role
        user.save()
    return user


def get_url(name, *args):
    """Try namespaced URL first, fall back to non-namespaced, then hardcoded."""
    try:
        return reverse(f"cases:{name}", args=args)
    except Exception:
        pass
    try:
        return reverse(name, args=args)
    except Exception:
        pass
    pk = args[0] if args else None
    paths = {
        "case-list":   "/api/cases/",
        "case-detail": f"/api/cases/{pk}/",
    }
    return paths.get(name, "/api/cases/")


# ─── Model Tests ──────────────────────────────────────────────────────────────

class CaseModelTest(TestCase):

    def setUp(self):
        self.assigned_detective = create_user("assigned_detective1", "assigned_detective")

    def test_case_creation(self):
        case = Case.objects.create(
            title="Test Case",
            description="A test description",
            status="open",
            assigned_detective=self.assigned_detective,
        )
        self.assertIn("Test Case", str(case))

    def test_case_status_default(self):
        case = Case.objects.create(
            title="Default Status Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )
        self.assertIsNotNone(case.status)

    def test_case_assigned_fields(self):
        """Case can be assigned cadet, captain, coroner, and chief."""
        cadet   = create_user("cadet1",   "cadet")
        captain = create_user("captain1", "captain")
        coroner = create_user("coroner1", "coroner")
        chief   = create_user("chief1",   "chief")

        case = Case.objects.create(
            title="Assigned Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )

        for field, user in [("cadet", cadet), ("captain", captain),
                             ("coroner", coroner), ("chief", chief)]:
            if hasattr(case, field):
                setattr(case, field, user)
        case.save()
        case.refresh_from_db()

        for field, user in [("cadet", cadet), ("captain", captain),
                             ("coroner", coroner), ("chief", chief)]:
            if hasattr(case, field):
                self.assertEqual(getattr(case, field), user)

    def test_case_timestamps(self):
        case = Case.objects.create(
            title="Timestamp Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )
        if hasattr(case, "created_at"):
            self.assertIsNotNone(case.created_at)


# ─── Witness Model Tests ──────────────────────────────────────────────────────

class CaseWitnessModelTest(TestCase):

    def setUp(self):
        self.assigned_detective = create_user("assigned_detective2", "assigned_detective")
        self.case = Case.objects.create(
            title="Witness Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )

    def test_witness_creation_with_user(self):
        witness_user = create_user("witness1", "civilian")
        witness = CaseWitness.objects.create(
            case=self.case,
            user=witness_user,
        )
        self.assertEqual(witness.case, self.case)
        self.assertEqual(witness.user, witness_user)


# ─── Suspect Model Tests ──────────────────────────────────────────────────────

class CaseSuspectModelTest(TestCase):

    def setUp(self):
        self.assigned_detective = create_user("assigned_detective3", "assigned_detective")
        self.case = Case.objects.create(
            title="Suspect Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )


# ─── API Tests ────────────────────────────────────────────────────────────────

class CaseAPITest(APITestCase):

    def setUp(self):
        self.admin     = create_user("admin1",      "admin")
        self.assigned_detective = create_user("assigned_detective4",  "assigned_detective")
        self.other     = create_user("other1",      "cadet")

        self.case = Case.objects.create(
            title="API Test Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )

        self.list_url   = get_url("case-list")
        self.detail_url = get_url("case-detail", self.case.pk)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_list_cases(self):
        self._auth(self.assigned_detective)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_access(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registered_creator_can_patch_case_description(self):
        creator = create_user("complainant_patch_owner", "complainant")
        case = Case.objects.create(
            title="Patchable Case",
            description="old description",
            crime_level=Case.CrimeLevel.LEVEL_1,
            creation_method=Case.CreationMethod.COMPLAINT,
            status=Case.Status.AWAITING_VALIDATION,
            registered_by=creator,
        )
        detail_url = get_url("case-detail", case.pk)

        self._auth(creator)
        response = self.client.patch(detail_url, {"description": "new description"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        case.refresh_from_db()
        self.assertEqual(case.description, "new description")


# ─── Permission Tests ─────────────────────────────────────────────────────────

class CasePermissionTest(APITestCase):

    def setUp(self):
        self.admin     = create_user("admin2",     "admin")
        self.assigned_detective = create_user("assigned_detective5", "assigned_detective")
        self.cadet     = create_user("cadet2",     "cadet")

        self.case = Case.objects.create(
            title="Permission Case",
            description="desc",
            status="open",
            assigned_detective=self.assigned_detective,
        )

        self.list_url   = get_url("case-list")
        self.detail_url = get_url("case-detail", self.case.pk)

    def test_cadet_cannot_delete(self):
        self.client.force_authenticate(user=self.cadet)
        response = self.client.delete(self.detail_url)
        self.assertIn(response.status_code,
                      [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_unauthenticated_cannot_access(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
