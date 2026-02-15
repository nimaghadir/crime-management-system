from rest_framework import serializers

from .models import Evidence, EvidenceAttachment


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = (
            "id",
            "case",
            "type",
            "metadata",
            "status",
            "uploaded_by",
            "created_at",
        )
        read_only_fields = ("id", "status", "uploaded_by", "created_at")

    def validate_metadata(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be an object.")
        return value


class EvidenceAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceAttachment
        fields = (
            "id",
            "evidence",
            "file_url",
            "file_path",
            "mime_type",
            "file_size",
            "original_name",
            "uploaded_by",
            "created_at",
        )
        read_only_fields = ("id", "uploaded_by", "created_at")

    def validate(self, attrs):
        file_url = attrs.get("file_url", "")
        file_path = attrs.get("file_path", "")
        if not file_url and not file_path:
            raise serializers.ValidationError(
                {"file_url": "Provide file_url or file_path."}
            )
        return attrs
