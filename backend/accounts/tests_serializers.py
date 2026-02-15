from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Role
from .serializers import RoleSerializer, UserProfileSerializer


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
