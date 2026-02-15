from rest_framework import serializers

from .models import Evidence


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
