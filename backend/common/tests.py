from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from accounts.constants import ROLE_CODE_SYSTEM_ADMIN, ROLE_FLAG_CODE_KEY
from accounts.models import Role, UserProfile

from .permissions import RoleBasedPermission, SystemAdminPermission


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
        request = self.factory.get("/api/any/")
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


class SystemAdminPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = SystemAdminPermission()
        self.view = _DummyView()

        self.system_admin_role, _ = Role.objects.get_or_create(
            name="مدیر کل سامانه",
            defaults={"default_flags": {"can_manage_roles": True}},
        )
        self.system_admin_role.default_flags = {
            **(self.system_admin_role.default_flags or {}),
            "can_manage_roles": True,
            ROLE_FLAG_CODE_KEY: ROLE_CODE_SYSTEM_ADMIN,
        }
        self.system_admin_role.save(update_fields=["default_flags"])
        self.officer_role = Role.objects.create(name="Officer", default_flags={})
        self.system_admin_user = UserProfile.objects.create_user(
            username="sys-admin",
            password="pass12345",
            role=self.system_admin_role,
        )
        self.officer_user = UserProfile.objects.create_user(
            username="officer-regular",
            password="pass12345",
            role=self.officer_role,
        )

    def _build_request(self, user):
        request = self.factory.get("/api/roles/")
        request.user = user
        return request

    def test_system_admin_role_is_allowed(self):
        request = self._build_request(self.system_admin_user)
        self.assertTrue(self.permission.has_permission(request, self.view))

    def test_non_system_admin_role_is_denied(self):
        request = self._build_request(self.officer_user)
        self.assertFalse(self.permission.has_permission(request, self.view))
