from __future__ import annotations

import uuid
from django.contrib.auth import get_user_model
from django.urls import get_resolver, URLPattern, URLResolver
from rest_framework import status
from rest_framework.test import APITestCase, APIClient


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
