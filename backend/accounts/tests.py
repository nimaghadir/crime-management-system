from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .constants import (
    ROLE_CODE_BASIC_USER,
    ROLE_CODE_SYSTEM_ADMIN,
    ROLE_FLAG_CODE_KEY,
)
from .jwt_utils import build_access_token
from .models import Role, RolePermission
from .serializers import RoleSerializer, UserProfileSerializer


class AccountsModelTests(TestCase):
    def test_role_string_representation(self):
        role = Role.objects.create(name="Detective")
        self.assertEqual(str(role), "Detective")

    def test_user_profile_unique_national_id_when_present(self):
        user_model = get_user_model()
        user_model.objects.create_user(username="u1", password="pass", national_id="N-100")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                user_model.objects.create_user(
                    username="u2",
                    password="pass",
                    national_id="N-100",
                )

    def test_user_profile_allows_blank_phone_for_multiple_users(self):
        user_model = get_user_model()
        user_model.objects.create_user(username="u1", password="pass", phone="")
        user_model.objects.create_user(username="u2", password="pass", phone="")
        self.assertEqual(user_model.objects.count(), 2)

    def test_role_permission_unique_pair(self):
        role = Role.objects.create(name="Officer")
        content_type = ContentType.objects.get_for_model(Role)
        permission = Permission.objects.create(
            codename="can_assign_case",
            name="Can assign case",
            content_type=content_type,
        )
        RolePermission.objects.create(role=role, permission=permission)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RolePermission.objects.create(role=role, permission=permission)

    def test_create_superuser_auto_assigns_system_admin_role(self):
        superuser = get_user_model().objects.create_superuser(
            username="auto-role-root",
            password="pass12345",
            email="auto-role-root@example.com",
        )
        superuser.refresh_from_db()

        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_staff)
        self.assertIsNotNone(superuser.role_id)
        self.assertEqual(
            superuser.role.default_flags.get(ROLE_FLAG_CODE_KEY),
            ROLE_CODE_SYSTEM_ADMIN,
        )


class AccountsSerializerTests(TestCase):
    def test_role_serializer_exposes_expected_fields(self):
        role = Role.objects.create(
            name="Detective",
            description="Investigates cases",
            default_flags={"can_view_cases": True},
        )
        data = RoleSerializer(role).data

        self.assertEqual(set(data.keys()), {"id", "name", "description", "default_flags"})
        self.assertEqual(data["name"], "Detective")
        self.assertEqual(data["default_flags"], {"can_view_cases": True})

    def test_user_profile_serializer_returns_role_name(self):
        role = Role.objects.create(name="Officer")
        user = get_user_model().objects.create_user(
            username="officer1",
            password="pass",
            role=role,
        )

        data = UserProfileSerializer(user).data
        self.assertEqual(data["username"], "officer1")
        self.assertEqual(data["role_name"], "Officer")


class BaseRoleSeedTests(TestCase):
    def test_base_roles_are_seeded(self):
        expected_roles = {
            "مدیر کل سامانه",
            "رئیس پلیس",
            "کاپیتان",
            "گروهبان",
            "کارآگاه",
            "مامور پلیس",
            "افسر گشت",
            "کارآموز",
            "شاکی",
            "شاهد",
            "متهم",
            "مجرم",
            "قاضی",
            "پزشک قانونی",
            "کاربر پایه",
        }
        seeded_roles = set(Role.objects.values_list("name", flat=True))
        self.assertTrue(expected_roles.issubset(seeded_roles))

    def test_system_admin_and_default_role_have_expected_codes(self):
        system_admin_role = Role.objects.get(name="مدیر کل سامانه")
        default_role = Role.objects.get(name="کاربر پایه")

        self.assertEqual(
            system_admin_role.default_flags.get(ROLE_FLAG_CODE_KEY),
            ROLE_CODE_SYSTEM_ADMIN,
        )
        self.assertEqual(
            default_role.default_flags.get(ROLE_FLAG_CODE_KEY),
            ROLE_CODE_BASIC_USER,
        )


class RoleManagementApiTests(APITestCase):
    def setUp(self):
        system_admin_role, _ = Role.objects.get_or_create(
            name="مدیر کل سامانه",
            defaults={
                "description": "System admin role",
                "default_flags": {"is_system_admin": True, "can_manage_roles": True},
            },
        )
        system_admin_role.default_flags = {
            **(system_admin_role.default_flags or {}),
            "is_system_admin": True,
            "can_manage_roles": True,
            ROLE_FLAG_CODE_KEY: ROLE_CODE_SYSTEM_ADMIN,
        }
        system_admin_role.save(update_fields=["default_flags"])

        officer_role, _ = Role.objects.get_or_create(name="گروهبان")
        self.system_admin_user = get_user_model().objects.create_user(
            username="system-admin",
            password="pass12345",
            role=system_admin_role,
        )
        self.officer_user = get_user_model().objects.create_user(
            username="officer-user",
            password="pass12345",
            role=officer_role,
        )

    def test_system_admin_can_create_role(self):
        self.client.force_authenticate(user=self.system_admin_user)
        payload = {
            "name": "تحلیل گر",
            "description": "Report-only access role",
            "default_flags": {"can_view_reports": True},
        }

        response = self.client.post(reverse("roles-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Role.objects.get(pk=response.data["id"])
        self.assertEqual(created.name, "تحلیل گر")
        self.assertEqual(created.default_flags, {"can_view_reports": True})

    def test_system_admin_can_update_role(self):
        role = Role.objects.create(
            name="کارشناس",
            description="Old description",
            default_flags={"x": 1},
        )
        self.client.force_authenticate(user=self.system_admin_user)

        response = self.client.patch(
            reverse("roles-detail", args=[role.id]),
            {"description": "Updated description", "default_flags": {"can_review": True}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        role.refresh_from_db()
        self.assertEqual(role.description, "Updated description")
        self.assertEqual(role.default_flags, {"can_review": True})

    def test_system_admin_can_delete_role(self):
        role = Role.objects.create(name="موقت")
        self.client.force_authenticate(user=self.system_admin_user)

        response = self.client.delete(reverse("roles-detail", args=[role.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Role.objects.filter(id=role.id).exists())

    def test_system_admin_can_delete_seeded_role(self):
        self.client.force_authenticate(user=self.system_admin_user)
        seeded_role = Role.objects.get(name="پزشک قانونی")

        response = self.client.delete(reverse("roles-detail", args=[seeded_role.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Role.objects.filter(id=seeded_role.id).exists())

    def test_non_system_admin_cannot_manage_roles(self):
        self.client.force_authenticate(user=self.officer_user)

        response = self.client.get(reverse("roles-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "permission_denied")

    def test_superuser_can_manage_roles_without_role_assignment(self):
        superuser = get_user_model().objects.create_superuser(
            username="root-admin",
            password="pass12345",
            email="root@example.com",
        )
        self.client.force_authenticate(user=superuser)

        response = self.client.get(reverse("roles-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_system_admin_can_list_users(self):
        self.client.force_authenticate(user=self.system_admin_user)

        response = self.client.get(reverse("users-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = {item["username"] for item in response.data["results"]}
        self.assertIn(self.system_admin_user.username, usernames)
        self.assertIn(self.officer_user.username, usernames)

    def test_non_system_admin_cannot_list_users(self):
        self.client.force_authenticate(user=self.officer_user)

        response = self.client.get(reverse("users-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "permission_denied")

    def test_system_admin_can_assign_role_to_user(self):
        self.client.force_authenticate(user=self.system_admin_user)
        target_user = get_user_model().objects.create_user(
            username="target-user",
            password="pass12345",
            role=self.officer_user.role,
        )
        detective_role = Role.objects.get(name="کارآگاه")

        response = self.client.post(
            reverse("users-assign-role", args=[target_user.id]),
            {"role": detective_role.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target_user.refresh_from_db()
        self.assertEqual(target_user.role_id, detective_role.id)
        self.assertEqual(response.data["role_name"], "کارآگاه")

    def test_non_system_admin_cannot_assign_role_to_user(self):
        self.client.force_authenticate(user=self.officer_user)
        target_user = get_user_model().objects.create_user(
            username="target-user-2",
            password="pass12345",
            role=self.officer_user.role,
        )
        detective_role = Role.objects.get(name="کارآگاه")

        response = self.client.post(
            reverse("users-assign-role", args=[target_user.id]),
            {"role": detective_role.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "permission_denied")


class AuthEndpointTests(APITestCase):
    def test_register_returns_access_token_and_minimal_user_data(self):
        payload = {
            "username": "newuser",
            "password": "securepass123",
            "email": "new@example.com",
            "phone": "09120000001",
            "first_name": "New",
            "last_name": "User",
            "national_id": "100000001",
        }
        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access_token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(set(response.data["user"].keys()), {"id", "username", "role_name"})
        self.assertEqual(response.data["user"]["username"], "newuser")
        self.assertEqual(response.data["user"]["role_name"], "کاربر پایه")

    def test_register_requires_contact_and_identity_fields(self):
        payload = {
            "username": "newuser2",
            "password": "securepass123",
            "email": "new2@example.com",
        }
        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_register_rejects_duplicate_identity_fields(self):
        get_user_model().objects.create_user(
            username="existing-user",
            password="securepass123",
            email="existing@example.com",
            phone="09123334455",
            first_name="Old",
            last_name="User",
            national_id="5555555555",
        )
        payload = {
            "username": "newuser3",
            "password": "securepass123",
            "email": "existing@example.com",
            "phone": "09123334455",
            "first_name": "New",
            "last_name": "User",
            "national_id": "5555555555",
        }

        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
        self.assertIn("email", response.data["error"]["details"])

    def test_login_with_username_returns_token_and_role_name(self):
        role = Role.objects.create(name="Officer")
        user = get_user_model().objects.create_user(
            username="officer1",
            password="securepass123",
            role=role,
        )
        payload = {"identifier": user.username, "password": "securepass123"}

        response = self.client.post(reverse("auth-login"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertEqual(response.data["user"]["username"], "officer1")
        self.assertEqual(response.data["user"]["role_name"], "Officer")

    def test_login_with_phone_works(self):
        user = get_user_model().objects.create_user(
            username="phoneuser",
            password="securepass123",
            phone="09120001122",
        )
        payload = {"identifier": user.phone, "password": "securepass123"}

        response = self.client.post(reverse("auth-login"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertEqual(response.data["user"]["username"], "phoneuser")

    def test_login_invalid_credentials_returns_validation_error(self):
        get_user_model().objects.create_user(username="u1", password="rightpass123")
        payload = {"identifier": "u1", "password": "wrongpass123"}

        response = self.client.post(reverse("auth-login"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_bearer_token_auth_can_access_protected_endpoint(self):
        user = get_user_model().objects.create_user(username="jwt-user", password="rightpass123")
        token = build_access_token(user)

        response = self.client.get(
            reverse("api-v1-protected"),
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "protected")


class ApiErrorFormatTests(APITestCase):
    def test_unauthorized_response_uses_consistent_error_format(self):
        response = self.client.get(reverse("api-v1-protected"))
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertIn("error", response.data)
        self.assertIn("code", response.data["error"])
        self.assertIn("message", response.data["error"])
        self.assertIn("details", response.data["error"])
