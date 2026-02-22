from rest_framework import serializers
from .models import TestimonyEvidence, BiologicalEvidence, BiologicalEvidenceImage, VehicleEvidence, IdentificationDocument, OtherEvidence


class TestimonyEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestimonyEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']


#################### Biological Evidence

class BiologicalEvidenceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiologicalEvidenceImage
        fields = ['id', 'image']


class BiologicalEvidenceSerializer(serializers.ModelSerializer):
    images = BiologicalEvidenceImageSerializer(many=True, read_only=True)
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


class BiologicalEvidenceReviewSerializer(serializers.ModelSerializer):
    """Only for coroner PATCH — review fields only."""
    class Meta:
        model = BiologicalEvidence
        fields = ['review_status', 'doctor_notes', 'identity_db_notes', 'reviewed_by', 'reviewed_at']
        read_only_fields = ['reviewed_by', 'reviewed_at']


class VehicleEvidenceSerializer(serializers.ModelSerializer):
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
    


class IdentificationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentificationDocument
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']


class OtherEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OtherEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']

