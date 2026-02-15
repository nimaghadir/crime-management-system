from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role


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
