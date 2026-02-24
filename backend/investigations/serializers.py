from rest_framework import serializers
from cases.models import Case, CaseSuspect, Complainant, CaseWitness
from financials.models import RewardTip
from accounts.constants import SUSPECT
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.constants import *

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
            "sergeant_comments",
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

    
class CreateCaseSuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseSuspect
        fields = ['id', 'case', 'suspect']
        read_only_fields = ['arrest_status']

    def validate_suspect(self, user):
        roles = user.groups.values_list('name', flat=True)
        if SUSPECT not in roles:
            raise serializers.ValidationError(
                "The selected user does not have the Suspect role."
            )
        return user

    def validate(self, attrs):
        request = self.context['request']
        case    = attrs['case']

        if case.assigned_detective_id != request.user.id:
            raise serializers.ValidationError(
                "You are not the assigned detective for this case."
            )

        return attrs

    def create(self, validated_data):
        validated_data['arrest_status'] = CaseSuspect.ArrestStatus.AWAITING_SERGEANT
        return super().create(validated_data)
    


class ArrestFieldsCaseSuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseSuspect
        fields = (
            "confession_transcript",
            "detective_guilt_score",
            "sergeant_guilt_score",
        )

    def validate(self, attrs):
        instance = self.instance

        if not self.context['request'].user.groups & {SERGEANT, DETECTIVE}:
            raise serializers.ValidationError(
                "Arrest details can only be submitted by detectives or sergeants."
            )

        if instance.status != CaseSuspect.ArrestStatus.ARRESTED:
            raise serializers.ValidationError(
                "Arrest details can only be submitted when suspect status is ARRESTED."
            )

        return attrs

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.status = CaseSuspect.ArrestStatus.AWAITING_CAPTAIN
        instance.save()

        return instance


class UpdateCaseSuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseSuspect
        fields = [
            'id', 'case', 'suspect',
            'arrest_status', 'sergeant_comments',
            'arrest_warrant_issued_at',
        ]
        read_only_fields = [
            'id', 'case', 'suspect',
            'arrest_warrant_issued_at',
        ]

    def validate(self, attrs):
        request       = self.context['request']
        role          = request.user.groups.values_list('name', flat=True).first()
        instance      = self.instance
        new_status    = attrs.get('arrest_status')
        comments      = attrs.get('sergeant_comments')
        current       = instance.arrest_status
        crime_level   = instance.case.crime_level

        # ── SERGEANT ──────────────────────────────────────────────────────────
        if role == SERGEANT:
            if current != CaseSuspect.ArrestStatus.AWAITING_SERGEANT:
                raise serializers.ValidationError(
                    "Sergeant can only act on suspects in AWAITING_SERGEANT state."
                )
            allowed = {
                CaseSuspect.ArrestStatus.WARRANT_ISSUED,
                CaseSuspect.ArrestStatus.FREE,
            }
            if new_status not in allowed:
                raise serializers.ValidationError(
                    "Sergeant can only move status to WARRANT_ISSUED or FREE."
                )
            if new_status == CaseSuspect.ArrestStatus.FREE and not comments:
                raise serializers.ValidationError(
                    "sergeant_comments is required when denying an arrest request."
                )

        # ── CAPTAIN ───────────────────────────────────────────────────────────
        elif role == CAPTAIN:
            if current != CaseSuspect.ArrestStatus.AWAITING_CAPTAIN:
                raise serializers.ValidationError(
                    "Captain can only act on suspects in AWAITING_CAPTAIN state."
                )
            if new_status == CaseSuspect.ArrestStatus.FREE:
                pass  # always allowed
            elif crime_level == Case.CrimeLevel.CRITICAL:
                if new_status != CaseSuspect.ArrestStatus.AWAITING_CHIEF:
                    raise serializers.ValidationError(
                        "For CRITICAL cases captain must escalate to AWAITING_CHIEF or set FREE."
                    )
            else:
                if new_status != CaseSuspect.ArrestStatus.ON_TRIAL:
                    raise serializers.ValidationError(
                        "Captain must move status to ON_TRIAL or FREE."
                    )

        # ── CHIEF ─────────────────────────────────────────────────────────────
        elif role == POLICE_CHIEF:
            if current != CaseSuspect.ArrestStatus.AWAITING_CHIEF:
                raise serializers.ValidationError(
                    "Chief can only act on suspects in AWAITING_CHIEF state."
                )
            allowed = {
                CaseSuspect.ArrestStatus.ON_TRIAL,
                CaseSuspect.ArrestStatus.FREE,
            }
            if new_status not in allowed:
                raise serializers.ValidationError(
                    "Chief can only move status to ON_TRIAL or FREE."
                )

        else:
            raise serializers.ValidationError(
                "You do not have permission to update a suspect's arrest status."
            )

        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get('arrest_status', instance.arrest_status)

        # auto-fill arrest_warrant_issued_at when warrant is issued
        if new_status == CaseSuspect.ArrestStatus.WARRANT_ISSUED:
            validated_data['arrest_warrant_issued_at'] = timezone.now()

        return super().update(instance, validated_data)