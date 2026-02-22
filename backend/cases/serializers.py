# cases/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from .models import Case, CaseReviewAction, Complainant, CaseWitness, CaseSuspect, SuspectReviewAction

User = get_user_model()
class CaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            'id', 'title', 'crime_level', 'status', 'creation_method',
            'location', 'incident_datetime', 'assigned_detective',
            'assigned_sergeant', 'created_at', 'registered_by'
        ]
        read_only_fields = ['id', 'created_at', 'assigned_sergeant', 'assigned_detective', 'status', 'registered_by']

class CaseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            'id',
            'title',
            'description',
            'crime_level',
            'status',
            'creation_method',
            'location',
            'incident_datetime',
            'registered_by',
            'assigned_detective',
            'assigned_sergeant',
            'created_at',
            'updated_at',
        ]

class CaseValidationReviewListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseValidationReview
        fields = [
            "id",
            "case",
            "source",
            "destination",
            "message",
            "validated",
            "resolved",
            "created_at",
        ]

class CaseValidationReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseValidationReview
        fields = [
            "id",
            "case",
            "destination",
            "message",
            "validated",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        validated_data["source"] = self.context["request"].user
        return super().create(validated_data)

class CaseWitnessCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseWitness
        fields = [
            "case",
            "phone_number",
            "national_id",
            "evidence",
        ]
