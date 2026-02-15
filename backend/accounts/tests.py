from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

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


class AuthEndpointTests(APITestCase):
    def test_register_returns_access_token_and_minimal_user_data(self):
        payload = {
            "username": "newuser",
            "password": "securepass123",
            "email": "new@example.com",
        }
        response = self.client.post(reverse("auth-register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access_token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(set(response.data["user"].keys()), {"id", "username", "role_name"})
        self.assertEqual(response.data["user"]["username"], "newuser")
        self.assertIsNone(response.data["user"]["role_name"])

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
