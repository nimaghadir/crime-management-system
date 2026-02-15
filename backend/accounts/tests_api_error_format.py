from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


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
