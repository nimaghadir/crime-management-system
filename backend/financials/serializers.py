import json

from django.contrib.auth import get_user_model
from rest_framework import serializers

from cases.models import Case
from .models import RewardTip

User = get_user_model()


def parse_tip_content(raw_content):
    text = (raw_content or "").strip()
    if not text:
        return {}
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    return {"title": "", "description": text}


def encode_tip_content(payload):
    return json.dumps(payload, ensure_ascii=False)


def map_tip_status_for_frontend(tip):
    status = tip.status
    if status == RewardTip.Status.SUBMITTED:
        return "pending_officer"
    if status == RewardTip.Status.FORWARDED:
        return "pending_detective"
    if status == RewardTip.Status.CONFIRMED:
        return "approved_rewarded"
    if status == RewardTip.Status.REJECTED:
        return "rejected_by_detective" if tip.detective_reviewed_at else "rejected_by_officer"
    return str(status or "").lower()


class TipSubmitSerializer(serializers.Serializer):
    subject_type = serializers.ChoiceField(choices=["case", "suspect"], default="case")
    case_id = serializers.IntegerField(required=False, allow_null=True)
    suspect_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    suspect_hint = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    attachments = serializers.ListField(child=serializers.DictField(), required=False)

    def validate(self, attrs):
        subject_type = attrs.get("subject_type")
        case_id = attrs.get("case_id")
        suspect_id = attrs.get("suspect_id")

        if subject_type == "case" and not case_id:
            raise serializers.ValidationError({"case_id": "case_id is required for case tips."})
        if subject_type == "suspect" and not suspect_id:
            raise serializers.ValidationError({"suspect_id": "suspect_id is required for suspect tips."})

        if case_id:
            case = Case.objects.filter(pk=case_id).first()
            if not case:
                raise serializers.ValidationError({"case_id": "Case not found."})
            attrs["case_obj"] = case
        else:
            attrs["case_obj"] = None

        attachments = []
        for item in attrs.get("attachments", []):
            if not isinstance(item, dict):
                continue
            attachments.append(
                {
                    "file_url": str(item.get("file_url") or "").strip(),
                    "mime_type": str(item.get("mime_type") or "").strip(),
                    "original_name": str(item.get("original_name") or "").strip(),
                }
            )
        attrs["attachments"] = attachments
        return attrs


class TipReviewSerializer(serializers.Serializer):
    action = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reward_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        allow_null=True,
    )


class RewardLookupSerializer(serializers.Serializer):
    national_id = serializers.CharField()
    reward_code = serializers.CharField()


class RewardTipFrontendSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    subject_type = serializers.SerializerMethodField()
    case_id = serializers.SerializerMethodField()
    case_title = serializers.SerializerMethodField()
    subject_label = serializers.SerializerMethodField()
    suspect_id = serializers.SerializerMethodField()
    suspect_hint = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    submitter_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="submitted_at", read_only=True)
    updated_at = serializers.SerializerMethodField()
    officer_note = serializers.CharField(source="officer_notes", read_only=True)
    detective_note = serializers.CharField(source="detective_notes", read_only=True)
    reward_code = serializers.CharField(source="unique_code", read_only=True, allow_null=True)

    class Meta:
        model = RewardTip
        fields = [
            "id",
            "title",
            "description",
            "subject_type",
            "case_id",
            "case_title",
            "subject_label",
            "suspect_id",
            "suspect_hint",
            "attachments",
            "status",
            "submitter_name",
            "created_at",
            "updated_at",
            "officer_note",
            "detective_note",
            "reward_code",
            "reward_amount",
            "claimed",
            "claimed_at",
        ]

    def _payload(self, obj):
        return parse_tip_content(obj.content)

    def get_title(self, obj):
        payload = self._payload(obj)
        return str(payload.get("title") or "").strip() or f"Tip #{obj.pk}"

    def get_description(self, obj):
        payload = self._payload(obj)
        if "description" in payload:
            return str(payload.get("description") or "").strip()
        return str(obj.content or "").strip()

    def get_subject_type(self, obj):
        payload = self._payload(obj)
        subject_type = str(payload.get("subject_type") or "case").strip().lower()
        return "suspect" if subject_type == "suspect" else "case"

    def get_case_id(self, obj):
        if obj.case_id:
            return obj.case_id
        payload = self._payload(obj)
        try:
            return int(payload.get("case_id")) if payload.get("case_id") is not None else None
        except (TypeError, ValueError):
            return None

    def get_case_title(self, obj):
        return getattr(obj.case, "title", None)

    def get_subject_label(self, obj):
        subject_type = self.get_subject_type(obj)
        case_id = self.get_case_id(obj)
        case_title = self.get_case_title(obj)
        suspect_id = self.get_suspect_id(obj)
        if subject_type == "suspect":
            return f"Suspect #{suspect_id or '-'}" + (f" (Case #{case_id})" if case_id else "")
        if case_id and case_title:
            return f"Case #{case_id} - {case_title}"
        if case_id:
            return f"Case #{case_id}"
        return "Case"

    def get_suspect_id(self, obj):
        payload = self._payload(obj)
        try:
            return int(payload.get("suspect_id")) if payload.get("suspect_id") is not None else None
        except (TypeError, ValueError):
            return None

    def get_suspect_hint(self, obj):
        payload = self._payload(obj)
        return str(payload.get("suspect_hint") or "").strip()

    def get_attachments(self, obj):
        payload = self._payload(obj)
        items = payload.get("attachments")
        if not isinstance(items, list):
            return []
        sanitized = []
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                continue
            sanitized.append(
                {
                    "id": index,
                    "file_url": str(item.get("file_url") or "").strip(),
                    "mime_type": str(item.get("mime_type") or "").strip(),
                    "original_name": str(item.get("original_name") or "").strip(),
                }
            )
        return sanitized

    def get_status(self, obj):
        return map_tip_status_for_frontend(obj)

    def get_submitter_name(self, obj):
        user = obj.submitter
        if not user:
            return ""
        full_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        return full_name or getattr(user, "username", "")

    def get_updated_at(self, obj):
        return obj.detective_reviewed_at or obj.officer_reviewed_at or obj.submitted_at


class RewardLookupResponseSerializer(serializers.Serializer):
    # Kept as plain Serializer for documentation/readability; response is built manually in the view.
    payment = serializers.DictField()
    user = serializers.DictField(allow_null=True)
    tip = serializers.DictField(allow_null=True)
    suspect = serializers.DictField(allow_null=True, required=False)
    suspect_tracking_formula = serializers.DictField(allow_null=True, required=False)
