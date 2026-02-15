from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Notification


class NotificationModelTests(TestCase):
    def test_notification_defaults(self):
        user = get_user_model().objects.create_user(username="recipient", password="pass")
        notification = Notification.objects.create(recipient=user)

        self.assertFalse(notification.read)
        self.assertEqual(notification.payload, {})

    def test_notification_deleted_on_recipient_delete(self):
        user = get_user_model().objects.create_user(username="recipient2", password="pass")
        Notification.objects.create(recipient=user, payload={"message": "hello"})

        user.delete()
        self.assertEqual(Notification.objects.count(), 0)
