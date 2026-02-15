from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import Role, RolePermission


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
