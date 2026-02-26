from rest_framework import serializers
from .models import (
    TestimonyEvidence,
    BiologicalEvidence,
    BiologicalEvidenceImage,
    VehicleEvidence,
    IdentificationDocument,
    OtherEvidence,
    EvidenceAttachment,
)


def _attachment_public_url(obj, request):
    if getattr(obj, "file", None):
        try:
            url = obj.file.url
        except Exception:
            url = ""
        if url:
            return request.build_absolute_uri(url) if request else url
    return obj.file_url or ""


class EvidenceAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False, allow_null=True)
    resolved_file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EvidenceAttachment
        fields = [
            "id",
            "evidence_type",
            "evidence_id",
            "file",
            "file_url",
            "file_path",
            "mime_type",
            "original_name",
            "created_at",
            "resolved_file_url",
        ]
        read_only_fields = ["id", "created_at", "resolved_file_url"]

    def get_resolved_file_url(self, obj):
        request = self.context.get("request")
        return _attachment_public_url(obj, request)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Keep frontend contract simple: expose final URL in file_url
        final_url = data.get("resolved_file_url") or data.get("file_url") or ""
        data["file_url"] = final_url
        data.pop("resolved_file_url", None)
        if not data.get("file_path") and getattr(instance, "file", None):
            data["file_path"] = getattr(instance.file, "name", "") or ""
        if not data.get("original_name") and getattr(instance, "file", None):
            data["original_name"] = getattr(instance.file, "name", "").split("/")[-1]
        if not data.get("mime_type"):
            file_obj = getattr(instance, "file", None)
            data["mime_type"] = getattr(file_obj, "file", None) and getattr(file_obj.file, "content_type", "") or data.get("mime_type", "")
        return data


def _serialize_attachments_for(evidence_type, evidence_id, context):
    if not evidence_id:
        return []
    rows = EvidenceAttachment.objects.filter(
        evidence_type=evidence_type,
        evidence_id=evidence_id,
    ).order_by("id")
    return EvidenceAttachmentSerializer(rows, many=True, context=context).data


class TestimonyEvidenceSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TestimonyEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']

    def get_attachments(self, obj):
        return _serialize_attachments_for(EvidenceAttachment.EvidenceType.TESTIMONY, obj.id, self.context)


#################### Biological Evidence

class BiologicalEvidenceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiologicalEvidenceImage
        fields = ['id', 'image']


class BiologicalEvidenceSerializer(serializers.ModelSerializer):
    images = BiologicalEvidenceImageSerializer(many=True, read_only=True)
    attachments = serializers.SerializerMethodField(read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = BiologicalEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at', 'reviewed_by', 'reviewed_at',
                            'review_status', 'doctor_notes', 'identity_db_notes']

    def create(self, validated_data):
        images = validated_data.pop('uploaded_images', [])
        instance = super().create(validated_data)
        for img in images:
            BiologicalEvidenceImage.objects.create(evidence=instance, image=img)
        return instance

    def get_attachments(self, obj):
        return _serialize_attachments_for(EvidenceAttachment.EvidenceType.BIO_MEDICAL, obj.id, self.context)


class BiologicalEvidenceReviewSerializer(serializers.ModelSerializer):
    """Only for coroner PATCH — review fields only."""
    class Meta:
        model = BiologicalEvidence
        fields = ['review_status', 'doctor_notes', 'identity_db_notes', 'reviewed_by', 'reviewed_at']
        read_only_fields = ['reviewed_by', 'reviewed_at']


class VehicleEvidenceSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = VehicleEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']

    def validate(self, data):
        serial = data.get('serial_number')
        plate = data.get('license_plate')

        if serial and plate:
            raise serializers.ValidationError(
                "Only one of serial number or license plate can be provided, not both."
            )
        if not serial and not plate:
            raise serializers.ValidationError(
                "At least one of serial number or license plate must be provided."
            )
        return data

    def get_attachments(self, obj):
        return _serialize_attachments_for(EvidenceAttachment.EvidenceType.VEHICLE, obj.id, self.context)
    


class IdentificationDocumentSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = IdentificationDocument
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']

    def get_attachments(self, obj):
        return _serialize_attachments_for(EvidenceAttachment.EvidenceType.IDENTITY, obj.id, self.context)


class OtherEvidenceSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = OtherEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']

    def get_attachments(self, obj):
        return _serialize_attachments_for(EvidenceAttachment.EvidenceType.OTHER, obj.id, self.context)
