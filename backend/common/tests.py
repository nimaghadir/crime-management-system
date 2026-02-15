from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from accounts.models import Role, UserProfile

from .permissions import RoleBasedPermission


class _DummyView:
    allowed_roles = None


class _CaptainOnlyPermission(RoleBasedPermission):
    allowed_roles = ("captain",)


class RoleBasedPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = RoleBasedPermission()
        self.view = _DummyView()

        self.captain_role = Role.objects.create(name="Captain")
        self.officer_role = Role.objects.create(name="Officer")

        self.captain_user = UserProfile.objects.create_user(
            username="captain-user",
            password="pass12345",
            role=self.captain_role,
        )
        self.officer_user = UserProfile.objects.create_user(
            username="officer-user",
            password="pass12345",
            role=self.officer_role,
        )

    def _build_request(self, user):
        request = self.factory.get("/api/v1/any/")
        request.user = user
        return request

    def test_unauthenticated_user_is_denied(self):
        request = self._build_request(AnonymousUser())
        self.assertFalse(self.permission.has_permission(request, self.view))

    def test_authenticated_user_is_allowed_when_no_roles_defined(self):
        request = self._build_request(self.captain_user)
        self.assertTrue(self.permission.has_permission(request, self.view))

    def test_user_with_allowed_role_is_granted(self):
        self.view.allowed_roles = ["Captain", "Chief"]
        request = self._build_request(self.captain_user)
        self.assertTrue(self.permission.has_permission(request, self.view))

    def test_user_with_disallowed_role_is_denied(self):
        self.view.allowed_roles = ["Captain", "Chief"]
        request = self._build_request(self.officer_user)
        self.assertFalse(self.permission.has_permission(request, self.view))

    def test_class_level_allowed_roles_are_applied(self):
        permission = _CaptainOnlyPermission()
        request = self._build_request(self.officer_user)
        self.assertFalse(permission.has_permission(request, self.view))
