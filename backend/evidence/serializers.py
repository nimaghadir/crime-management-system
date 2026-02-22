from rest_framework import serializers
from .models import TestimonyEvidence


class TestimonyEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestimonyEvidence
        fields = '__all__'
        read_only_fields = ['submitter', 'registered_at']
