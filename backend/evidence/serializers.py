from rest_framework import serializers
from .models import TestimonyEvidence, BiologicalEvidence, BiologicalEvidenceImage


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