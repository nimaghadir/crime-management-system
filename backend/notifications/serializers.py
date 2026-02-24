import re

from rest_framework import serializers

from .models import Notification


CASE_LINK_RE = re.compile(r"/cases/(?P<case_id>\d+)/?")


class NotificationSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()
    related_case_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notif_type",
            "title",
            "body",
            "message",
            "is_read",
            "created_at",
            "read_at",
            "link",
            "related_case_id",
        ]

    def get_message(self, obj):
        title = (obj.title or "").strip()
        body = (obj.body or "").strip()
        if title and body:
            return f"{title}: {body}"
        return title or body

    def get_related_case_id(self, obj):
        link = (obj.link or "").strip()
        match = CASE_LINK_RE.search(link)
        if not match:
            return None
        try:
            return int(match.group("case_id"))
        except (TypeError, ValueError):
            return None
