from rest_framework import serializers

from cases.models import Case

from .models import InvestigationAction, Note, Suspect


class SuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suspect
        fields = (
            "id",
            "case",
            "name",
            "national_id",
            "status",
            "score",
            "created_at",
        )
        read_only_fields = ("id", "score", "created_at")

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Name cannot be empty.")
        return cleaned


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = (
            "id",
            "case",
            "author",
            "text",
            "order_index",
            "pinned",
            "created_at",
        )
        read_only_fields = ("id", "author", "created_at")

    def validate_text(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Text cannot be empty.")
        return cleaned

    def validate(self, attrs):
        if self.instance is not None and "case" in attrs and attrs["case"] != self.instance.case:
            raise serializers.ValidationError({"case": "Case cannot be changed."})
        return attrs


class NoteReorderSerializer(serializers.Serializer):
    case = serializers.PrimaryKeyRelatedField(queryset=Case.objects.all())
    note_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )

    def validate_note_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate note IDs are not allowed.")
        return value


class InvestigationActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestigationAction
        fields = (
            "id",
            "case",
            "action_type",
            "payload",
            "performed_by",
            "created_at",
        )
        read_only_fields = ("id", "performed_by", "created_at")

    def validate_action_type(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Action type cannot be empty.")
        return cleaned

    def validate_payload(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Payload must be an object.")
        return value


class StartInterrogationSerializer(serializers.Serializer):
    case = serializers.PrimaryKeyRelatedField(queryset=Case.objects.all())
    suspect_id = serializers.IntegerField(min_value=1)
    note = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)

    def validate(self, attrs):
        suspect = Suspect.objects.filter(
            id=attrs["suspect_id"],
            case=attrs["case"],
        ).first()
        if suspect is None:
            raise serializers.ValidationError(
                {"suspect_id": "Suspect does not belong to the selected case."}
            )
        attrs["suspect"] = suspect
        return attrs
