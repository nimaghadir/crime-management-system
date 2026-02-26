from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CustomAdminSmokeTests(APITestCase):
    """
    Smoke tests for custom-admin app.
    These tests only verify that main admin endpoints work and permissions are enforced.
    """

    # ---------- helpers ----------

    @staticmethod
    def _unique_phone():
        # phone_number is UNIQUE in accounts_user
        return "09" + str(uuid4().int)[:9]

    @staticmethod
    def _unique_national_id():
        # national_id is usually UNIQUE as well
        return str(uuid4().int)[:10]

    def _create_user(self, **kwargs):
        """
        Safe user factory compatible with custom User models.
        """
        User = get_user_model()

        username = kwargs.pop("username", f"user_{uuid4().hex[:6]}")
        password = kwargs.pop("password", "TestPass123!")
        phone_number = kwargs.pop("phone_number", self._unique_phone())
        national_id = kwargs.pop("national_id", self._unique_national_id())

        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                phone_number=phone_number,
                national_id=national_id,
                **kwargs,
            )
        except TypeError:
            # fallback for custom create_user signatures
            user = User(
                username=username,
                phone_number=phone_number,
                national_id=national_id,
                **kwargs,
            )
            user.set_password(password)
            user.save()

        return user

    def _make_system_admin(self, user):
        """
        Make user pass IsSystemAdmin permission (best-effort).
        """
        for field in ("is_active", "is_staff", "is_superuser"):
            if hasattr(user, field):
                setattr(user, field, True)

        if hasattr(user, "is_system_admin"):
            user.is_system_admin = True

        user.save()
        return user

    # ---------- setup ----------

    def setUp(self):
        self.normal_user = self._create_user()
        self.admin_user = self._make_system_admin(
            self._create_user(username=f"admin_{uuid4().hex[:6]}")
        )

    # ---------- tests ----------

    # 1️⃣ permission check
    def test_console_summary_forbidden_for_non_admin(self):
        self.client.force_authenticate(user=self.normal_user)

        response = self.client.get("/custom-admin/console-summary/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    # 2️⃣ admin access
    def test_console_summary_ok_for_admin(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/custom-admin/console-summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

    # 3️⃣ role create + list
    def test_roles_create_and_list(self):
        self.client.force_authenticate(user=self.admin_user)

        role_name = f"role_{uuid4().hex[:6]}"

        create_resp = self.client.post(
            "/custom-admin/roles/",
            data={"name": role_name},
            format="json",
        )
        self.assertIn(
            create_resp.status_code,
            (status.HTTP_200_OK, status.HTTP_201_CREATED),
        )

        list_resp = self.client.get("/custom-admin/roles/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)

        data = list_resp.data
        roles = data.get("results", data) if isinstance(data, dict) else data

        self.assertTrue(
            any(r.get("name") == role_name for r in roles),
            "Created role not found in roles list",
        )

    # 4️⃣ assign role to user
    def test_assign_role_to_user(self):
        self.client.force_authenticate(user=self.admin_user)

        role_name = f"role_{uuid4().hex[:6]}"
        role_resp = self.client.post(
            "/custom-admin/roles/",
            data={"name": role_name},
            format="json",
        )
        self.assertIn(
            role_resp.status_code,
            (status.HTTP_200_OK, status.HTTP_201_CREATED),
        )

        role_id = role_resp.data.get("id") or role_resp.data.get("pk")
        self.assertIsNotNone(role_id)

        assign_resp = self.client.post(
            f"/custom-admin/users/{self.normal_user.id}/assign-role/",
            data={"role_id": role_id},
            format="json",
        )

        self.assertIn(
            assign_resp.status_code,
            (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT),
        )

    # 5️⃣ patch + delete user
    def test_user_patch_and_delete(self):
        self.client.force_authenticate(user=self.admin_user)

        patch_data = {}
        if hasattr(self.normal_user, "email"):
            patch_data["email"] = f"user_{uuid4().hex[:6]}@example.com"

        if patch_data:
            patch_resp = self.client.patch(
                f"/custom-admin/users/{self.normal_user.id}/",
                data=patch_data,
                format="json",
            )
            self.assertIn(
                patch_resp.status_code,
                (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT),
            )

        delete_resp = self.client.delete(
            f"/custom-admin/users/{self.normal_user.id}/"
        )
        self.assertIn(
            delete_resp.status_code,
            (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT),
        )

