
import uuid

from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import BASIC_USER
from accounts.models import User
from notifications.models import Notification


def _unique_id():
    return str(uuid.uuid4().int)


def create_user(username, role=BASIC_USER, password="testpass123"):
    uid = _unique_id()
    user = User.objects.create_user(
        username=username,
        password=password,
        national_id=uid[:10],
        phone_number=f"09{uid[:9]}",
        email=f"{username}-{uid[:6]}@example.com",
    )
    group, _ = Group.objects.get_or_create(name=role)
    user.groups.add(group)
    return user


class NotificationApiTests(APITestCase):
    list_url = "/api/notifications/"
    mark_all_url = "/api/notifications/mark-all-read/"

    def setUp(self):
        self.user = create_user("notif_user")
        self.other_user = create_user("notif_other")
        self.client.force_authenticate(self.user)

        self.n1 = Notification.objects.create(
            recipient=self.user,
            title="First",
            body="Body one",
            is_read=False,
            notif_type=Notification.NotifType.GENERAL,
            link="/cases/1/",
        )
        self.n2 = Notification.objects.create(
            recipient=self.user,
            title="Second",
            body="Body two",
            is_read=True,
            read_at=timezone.now(),
            notif_type=Notification.NotifType.CASE_UPDATED,
        )
        Notification.objects.create(
            recipient=self.other_user,
            title="Other User Notification",
            body="Should not appear",
            is_read=False,
        )

    def test_list_returns_only_current_user_notifications(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        ids = {item["id"] for item in response.data}
        self.assertSetEqual(ids, {self.n1.id, self.n2.id})

    def test_list_supports_unread_filter(self):
        response = self.client.get(self.list_url, {"unread": "1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.n1.id)
        self.assertFalse(response.data[0]["is_read"])

    def test_list_supports_limit(self):
        response = self.client.get(self.list_url, {"limit": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_patch_can_mark_notification_read_and_unread(self):
        detail_url = f"/api/notifications/{self.n1.id}/"
        read_response = self.client.patch(detail_url, {"is_read": True}, format="json")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)
        self.assertIsNotNone(self.n1.read_at)

        unread_response = self.client.patch(detail_url, {"is_read": False}, format="json")
        self.assertEqual(unread_response.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.assertFalse(self.n1.is_read)
        self.assertIsNone(self.n1.read_at)

    def test_mark_all_read_updates_all_user_notifications(self):
        # Make both unread first.
        Notification.objects.filter(recipient=self.user).update(is_read=False, read_at=None)
        response = self.client.post(self.mark_all_url, {"is_read": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["updated_count"], 1)
        self.assertEqual(response.data["unread_count"], 0)
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)

    def test_cannot_update_other_users_notification(self):
        other_notification = Notification.objects.filter(recipient=self.other_user).first()
        response = self.client.patch(f"/api/notifications/{other_notification.id}/", {"is_read": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
