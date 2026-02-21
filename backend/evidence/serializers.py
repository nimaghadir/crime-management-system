from rest_framework import serializers

from .models import Evidence, EvidenceAttachment


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = (
            "id",
            "case",
            "title",
            "description",
            "type",
            "metadata",
            "recorded_at",
            "forensic_result",
            "identity_bank_result",
            "status",
            "uploaded_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "uploaded_by",
            "forensic_result",
            "identity_bank_result",
            "created_at",
            "updated_at",
        )

    def validate_title(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Title cannot be empty.")
        return cleaned

    def validate_description(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Description cannot be empty.")
        return cleaned

    def validate_metadata(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be an object.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)

        evidence_type = attrs.get("type")
        if evidence_type is None and self.instance is not None:
            evidence_type = self.instance.type

        metadata = attrs.get("metadata")
        if metadata is None:
            metadata = self.instance.metadata if self.instance is not None else {}

        if evidence_type == Evidence.EvidenceType.VEHICLE:
            self._validate_vehicle_metadata(metadata)
        elif evidence_type == Evidence.EvidenceType.IDENTITY:
            self._validate_identity_metadata(metadata)

        return attrs

    @staticmethod
    def _normalized_text(value):
        if value is None:
            return ""
        return str(value).strip()

    def _validate_vehicle_metadata(self, metadata):
        model_name = self._normalized_text(metadata.get("model"))
        color = self._normalized_text(metadata.get("color"))
        plate_number = self._normalized_text(
            metadata.get("plate_number") or metadata.get("plate")
        )
        serial_number = self._normalized_text(metadata.get("serial_number"))

        errors = {}
        if not model_name:
            errors["model"] = "Vehicle model is required."
        if not color:
            errors["color"] = "Vehicle color is required."
        if bool(plate_number) == bool(serial_number):
            errors["plate_or_serial"] = (
                "Provide exactly one of plate_number or serial_number."
            )

        if errors:
            raise serializers.ValidationError({"metadata": errors})

    def _validate_identity_metadata(self, metadata):
        owner_full_name = self._normalized_text(metadata.get("owner_full_name"))
        if not owner_full_name:
            raise serializers.ValidationError(
                {"metadata": {"owner_full_name": "Owner full name is required."}}
            )

        attributes = metadata.get("attributes")
        if attributes is not None and not isinstance(attributes, dict):
            raise serializers.ValidationError(
                {"metadata": {"attributes": "Attributes must be an object if provided."}}
            )


class EvidenceBioMedicalFollowUpSerializer(serializers.Serializer):
    forensic_result = serializers.CharField(required=False)
    identity_bank_result = serializers.CharField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "At least one follow-up field must be provided."
            )

        cleaned_attrs = {}
        for field_name, value in attrs.items():
            cleaned_value = value.strip()
            if not cleaned_value:
                raise serializers.ValidationError(
                    {field_name: "This field cannot be empty."}
                )
            cleaned_attrs[field_name] = cleaned_value
        return cleaned_attrs


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
        file_url = (attrs.get("file_url") or "").strip()
        file_path = (attrs.get("file_path") or "").strip()
        if not file_url and not file_path:
            raise serializers.ValidationError(
                {"file_url": "Provide file_url or file_path."}
            )
        attrs["file_url"] = file_url
        attrs["file_path"] = file_path
        return attrs
