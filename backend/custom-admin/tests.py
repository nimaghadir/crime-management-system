from __future__ import annotations

import uuid
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from django.urls import get_resolver, URLPattern, URLResolver
from rest_framework.test import APITestCase, APIClient
from accounts.constants import SYSTEM_ADMINISTRATOR
from cases.models import Case, CaseSuspect
from evidence.models import TestimonyEvidence
from investigations.models import InvestigationAction


# -------------------------
# URL discovery (anti-404)
# -------------------------

def _walk_urls(patterns, prefix=""):
    for p in patterns:
        if isinstance(p, URLResolver):
            route = getattr(p.pattern, "_route", str(p.pattern))
            yield from _walk_urls(p.url_patterns, prefix + route)
        elif isinstance(p, URLPattern):
            route = getattr(p.pattern, "_route", str(p.pattern))
            yield "/" + (prefix + route).lstrip("/")


def find_url(ending: str) -> str:
    ending = ending.lstrip("/")
    for path in _walk_urls(get_resolver().url_patterns):
        if path.endswith(ending):
            return path
    raise AssertionError(f"URL not found: *{ending}")


# -------------------------
# Tests
# -------------------------

class CustomAdminAPITests(APITestCase):

    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        def create_unique_user(**extra):
            uid = uuid.uuid4().hex[:10]
            return User.objects.create_user(
                username=f"user_{uid}",
                password="Pass12345!",
                email=f"{uid}@example.com",
                national_id=f"{uid}NI",
                phone_number=f"09{uid[:9]}",
                **extra,
            )

        cls.admin = create_unique_user(is_staff=True, is_superuser=True)
        cls.user = create_unique_user()
        admin_group, _ = Group.objects.get_or_create(name=SYSTEM_ADMINISTRATOR)
        cls.admin.groups.add(admin_group)

    def setUp(self):
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.user_client = APIClient()
        self.user_client.force_authenticate(self.user)

    # -------------------------
    # URLs
    # -------------------------

    @property
    def console_summary_url(self):
        return find_url("console-summary/")

    @property
    def roles_url(self):
        return find_url("roles/")

    @property
    def users_url(self):
        return find_url("users/")

    def user_detail_url(self, user_id):
        return find_url("users/<int:user_id>/").replace("<int:user_id>", str(user_id))

    def assign_role_url(self, user_id):
        return find_url("assign-role/").replace("<int:user_id>", str(user_id))

    def test_console_summary_forbidden_for_non_admin(self):
        res = self.user_client.get(self.console_summary_url)
        self.assertIn(res.status_code, (401, 403))

    def test_console_summary_includes_evidence_suspects_and_actions_counts(self):
        suspect_user = get_user_model().objects.create_user(
            username=f"suspect_{uuid.uuid4().hex[:8]}",
            password="Pass12345!",
            email=f"suspect_{uuid.uuid4().hex[:8]}@example.com",
            national_id=f"{uuid.uuid4().hex[:10]}",
            phone_number=f"09{uuid.uuid4().hex[:9]}",
        )
        witness_user = get_user_model().objects.create_user(
            username=f"witness_{uuid.uuid4().hex[:8]}",
            password="Pass12345!",
            email=f"witness_{uuid.uuid4().hex[:8]}@example.com",
            national_id=f"{uuid.uuid4().hex[:10]}",
            phone_number=f"09{uuid.uuid4().hex[:9]}",
        )

        case = Case.objects.create(
            title="Summary Case",
            description="Summary Case Description",
            crime_level=Case.CrimeLevel.LEVEL_1,
            creation_method=Case.CreationMethod.COMPLAINT,
            status=Case.Status.OPEN,
            registered_by=self.admin,
        )
        CaseSuspect.objects.create(case=case, suspect=suspect_user)
        InvestigationAction.objects.create(case=case, action_type="test_action", created_by=self.admin, payload={})
        TestimonyEvidence.objects.create(
            case=case,
            submitter=self.admin,
            witness=witness_user,
            title="Testimony",
            description="Witness testimony",
        )

        res = self.admin_client.get(self.console_summary_url)
        self.assertEqual(res.status_code, 200)
        summary = res.data.get("summary", {})
        self.assertGreaterEqual(summary.get("evidence", 0), 1)
        self.assertGreaterEqual(summary.get("suspects", 0), 1)
        self.assertGreaterEqual(summary.get("actions", 0), 1)
