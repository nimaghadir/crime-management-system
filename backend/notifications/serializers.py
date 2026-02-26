import re
from urllib.parse import parse_qs, urlparse

from rest_framework import serializers

from .models import Notification


CASE_LINK_RE = re.compile(r"/cases/(?P<case_id>\d+)/?")


class NotificationSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()
    related_case_id = serializers.SerializerMethodField()
    has_link = serializers.SerializerMethodField()
    target_path = serializers.SerializerMethodField()

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
            "has_link",
            "target_path",
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
        if match:
            try:
                return int(match.group("case_id"))
            except (TypeError, ValueError):
                return None
        try:
            parsed = urlparse(link)
            query = parse_qs(parsed.query or "")
            case_ids = query.get("caseId") or query.get("case_id") or []
            if not case_ids:
                return None
            return int(case_ids[0])
        except (TypeError, ValueError):
            return None

    def get_has_link(self, obj):
        return bool((obj.link or "").strip())

    def get_target_path(self, obj):
        return (obj.link or "").strip() or None
