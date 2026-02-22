from rest_framework import serializers
from cases.models import Case, CaseSuspect, Complainant, CaseWitness
from financials.models import RewardTip

from django.contrib.auth import get_user_model

User = get_user_model()


class CaseReportSerializer(serializers.ModelSerializer):
    complainant_ids            = serializers.SerializerMethodField()
    suspect_ids                = serializers.SerializerMethodField()
    testimony_evidence_ids     = serializers.SerializerMethodField()
    biological_evidence_ids    = serializers.SerializerMethodField()
    vehicle_evidence_ids       = serializers.SerializerMethodField()
    identification_doc_ids     = serializers.SerializerMethodField()
    other_evidence_ids         = serializers.SerializerMethodField()
    tip_ids                    = serializers.SerializerMethodField()

    class Meta:
        model  = Case
        fields = [
            "id", "title", "description",
            "crime_level", "status", "creation_method",
            "location", "incident_datetime",
            "created_at", "updated_at",
            "registered_by",
            "assigned_detective",
            "assigned_sergeant",
            # related id lists
            "complainant_ids",
            "suspect_ids",
            "testimony_evidence_ids",
            "biological_evidence_ids",
            "vehicle_evidence_ids",
            "identification_doc_ids",
            "other_evidence_ids",
            "tip_ids",
        ]

    def get_complainant_ids(self, obj):
        return list(obj.complainants.values_list('id', flat=True))

    def get_suspect_ids(self, obj):
        return list(obj.suspects.values_list('id', flat=True))

    def get_testimony_evidence_ids(self, obj):
        return list(obj.testimonies.values_list('id', flat=True))

    def get_biological_evidence_ids(self, obj):
        return list(obj.biological_evidences.values_list('id', flat=True))

    def get_vehicle_evidence_ids(self, obj):
        return list(obj.vehicle_evidences.values_list('id', flat=True))

    def get_identification_doc_ids(self, obj):
        return list(obj.identification_documents.values_list('id', flat=True))

    def get_other_evidence_ids(self, obj):
        return list(obj.other_evidences.values_list('id', flat=True))

    def get_tip_ids(self, obj):
        return list(obj.tips.values_list('id', flat=True))


class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')

    class Meta:
        model  = User
        fields = [
            "id", "username", "first_name", "last_name",
            "email", "phone_number", "national_id",
            "date_of_birth", "gender",
            "date_joined",
            "groups",
        ]

# ── Complainant ───────────────────────────────────────────────────────────────

class ComplainantSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Complainant
        fields = ["id", "case", "user", "added_at"]



# ── CaseSuspect ───────────────────────────────────────────────────────────────

class CaseSuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseSuspect
        fields = [
            "id", "case", "suspect",
            "confession_transcript",
            "detective_guilt_score", "sergeant_guilt_score",
            "arrest_status", "arrest_warrant_issued_at",
        ]


# ── CaseWitness ───────────────────────────────────────────────────────────────

class CaseWitnessSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseWitness
        fields = ["id", "case", "phone_number", "national_id"]


# ── RewardTip ─────────────────────────────────────────────────────────────────

class RewardTipSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RewardTip
        fields = [
            "id", "case", "submitter",
            "content", "status",
            "reviewing_officer", "officer_reviewed_at", "officer_notes",
            "detective_reviewed_at", "detective_notes",
            "unique_code", "reward_amount",
            "claimed", "claimed_at",
            "submitted_at",
        ]