from rest_framework import serializers
from cases.models import Case, CaseSuspect, Complainant, CaseWitness
from financials.models import RewardTip
from accounts.constants import SUSPECT
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.constants import *

User = get_user_model()


class CaseReportSerializer(serializers.ModelSerializer):
    created_by_role             = serializers.SerializerMethodField()
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
            "created_by_role",
            "assigned_cadet",
            "assigned_police_officer",
            "assigned_captain",
            "assigned_chief",
            "assigned_detective",
            "assigned_coroner",
            "assigned_sergeant",
            "assigned_judge",
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

    def get_created_by_role(self, obj):
        user = getattr(obj, "registered_by", None)
        if not user:
            return None
        group = user.groups.first()
        return group.name if group else None

    def get_complainant_ids(self, obj):
        return list(obj.complainants.values_list('user_id', flat=True))

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
    name = serializers.SerializerMethodField()
    suspect_name = serializers.SerializerMethodField()
    suspect_national_id = serializers.SerializerMethodField()
    national_id = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    tracking_started_at = serializers.SerializerMethodField()
    identified_at = serializers.SerializerMethodField()
    case_title = serializers.SerializerMethodField()
    case_status = serializers.SerializerMethodField()
    case_level = serializers.SerializerMethodField()
    case_person_type = serializers.SerializerMethodField()

    class Meta:
        model  = CaseSuspect
        fields = [
            "id", "case", "suspect",
            "name", "suspect_name",
            "national_id", "suspect_national_id",
            "status",
            "tracking_started_at", "identified_at",
            "arrested_at", "under_pursuit_ended_at",
            "case_title", "case_status", "case_level",
            "case_person_type",
            "confession_transcript",
            "detective_guilt_score", "sergeant_guilt_score",
            "arrest_status", "arrest_warrant_issued_at",
            "bail_amount", "bail_notes", "bail_set_at", "bail_set_by", "bail_paid_at",
            "bail_payment_initiated_at", "bail_payment_authority", "bail_payment_ref_id",
            "released_on_bail",
            "judicial_outcome", "judicial_decided_at",
        ]

    def get_name(self, obj):
        user = getattr(obj, "suspect", None)
        if not user:
            return ""
        full_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        return full_name or getattr(user, "username", "")

    def get_suspect_name(self, obj):
        return self.get_name(obj)

    def get_suspect_national_id(self, obj):
        return getattr(getattr(obj, "suspect", None), "national_id", None)

    def get_national_id(self, obj):
        return self.get_suspect_national_id(obj)

    def get_status(self, obj):
        return obj.arrest_status

    def get_tracking_started_at(self, obj):
        return getattr(obj, "identified_at", None) or getattr(obj.case, "created_at", None)

    def get_identified_at(self, obj):
        return getattr(obj, "identified_at", None) or getattr(obj.case, "created_at", None)

    def get_case_title(self, obj):
        return getattr(obj.case, "title", None)

    def get_case_status(self, obj):
        return getattr(obj.case, "status", None)

    def get_case_level(self, obj):
        return getattr(obj.case, "crime_level", None)

    def get_case_person_type(self, obj):
        outcome = str(getattr(obj, "judicial_outcome", "") or "").strip().lower()
        return "convict" if outcome == "convicted" else "suspect"


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
        suspect_user = attrs['suspect']

        if case.assigned_detective_id != request.user.id:
            raise serializers.ValidationError(
                "You are not the assigned detective for this case."
            )

        if CaseSuspect.objects.filter(case=case, suspect=suspect_user).exists():
            raise serializers.ValidationError(
                "This suspect is already linked to the case."
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
        role_names = set(self.context['request'].user.groups.values_list('name', flat=True))
        if not ({SERGEANT, DETECTIVE} & role_names):
            raise serializers.ValidationError(
                "Arrest details can only be submitted by detectives or sergeants."
            )

        if instance.arrest_status != CaseSuspect.ArrestStatus.ARRESTED:
            raise serializers.ValidationError(
                "Arrest details can only be submitted when suspect status is ARRESTED."
            )

        return attrs

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.arrest_status = CaseSuspect.ArrestStatus.AWAITING_CAPTAIN
        instance.save()

        return instance


class UpdateCaseSuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CaseSuspect
        fields = [
            'id', 'case', 'suspect',
            'arrest_status', 'sergeant_comments',
            'identified_at', 'arrest_warrant_issued_at', 'arrested_at', 'under_pursuit_ended_at',
            'judicial_outcome', 'judicial_decided_at',
        ]
        read_only_fields = [
            'id', 'case', 'suspect',
            'identified_at', 'arrest_warrant_issued_at', 'arrested_at', 'under_pursuit_ended_at',
            'judicial_decided_at',
        ]

    def validate(self, attrs):
        request       = self.context['request']
        role          = request.user.groups.values_list('name', flat=True).first()
        instance      = self.instance
        new_status    = attrs.get('arrest_status')
        comments      = attrs.get('sergeant_comments')
        new_judicial_outcome = attrs.get('judicial_outcome')
        current       = instance.arrest_status
        crime_level   = instance.case.crime_level

        if new_judicial_outcome is not None:
            if role != JUDGE:
                raise serializers.ValidationError(
                    "Only judge can record judicial outcome for a suspect."
                )
            if current != CaseSuspect.ArrestStatus.ON_TRIAL:
                raise serializers.ValidationError(
                    "Judicial outcome can only be recorded when suspect is ON_TRIAL."
                )
            if new_judicial_outcome not in {
                CaseSuspect.JudicialOutcome.PENDING,
                CaseSuspect.JudicialOutcome.CONVICTED,
                CaseSuspect.JudicialOutcome.ACQUITTED,
            }:
                raise serializers.ValidationError("Invalid judicial_outcome.")
            # Judge may update only judicial outcome without changing arrest_status.
            if "arrest_status" not in attrs:
                return attrs

        # ── DETECTIVE ─────────────────────────────────────────────────────────
        if role == DETECTIVE:
            if current != CaseSuspect.ArrestStatus.WARRANT_ISSUED:
                raise serializers.ValidationError(
                    "Detective can only mark suspects as ARRESTED after warrant issuance."
                )
            if new_status != CaseSuspect.ArrestStatus.ARRESTED:
                raise serializers.ValidationError(
                    "Detective can only move status to ARRESTED."
                )

        # ── SERGEANT ──────────────────────────────────────────────────────────
        elif role == SERGEANT:
            if current == CaseSuspect.ArrestStatus.AWAITING_SERGEANT:
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
            elif current == CaseSuspect.ArrestStatus.WARRANT_ISSUED:
                if new_status != CaseSuspect.ArrestStatus.ARRESTED:
                    raise serializers.ValidationError(
                        "Sergeant can only move status to ARRESTED after warrant issuance."
                    )
            else:
                raise serializers.ValidationError(
                    "Sergeant can only act on suspects in AWAITING_SERGEANT or WARRANT_ISSUED state."
                )

        # ── CAPTAIN ───────────────────────────────────────────────────────────
        elif role == CAPTAIN:
            if current not in {
                CaseSuspect.ArrestStatus.AWAITING_CAPTAIN,
                CaseSuspect.ArrestStatus.ARRESTED,
            }:
                raise serializers.ValidationError(
                    "Captain can only act on suspects in AWAITING_CAPTAIN or ARRESTED state."
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
        previous_status = instance.arrest_status
        new_status = validated_data.get('arrest_status', instance.arrest_status)
        new_judicial_outcome = validated_data.get('judicial_outcome', instance.judicial_outcome)
        now = timezone.now()

        # auto-fill arrest_warrant_issued_at when warrant is issued
        if new_status == CaseSuspect.ArrestStatus.WARRANT_ISSUED:
            validated_data['arrest_warrant_issued_at'] = now

        if previous_status != CaseSuspect.ArrestStatus.ARRESTED and new_status == CaseSuspect.ArrestStatus.ARRESTED:
            validated_data["arrested_at"] = now

        under_pursuit_statuses = {
            CaseSuspect.ArrestStatus.AWAITING_SERGEANT,
            CaseSuspect.ArrestStatus.WARRANT_ISSUED,
        }
        was_under_pursuit = previous_status in under_pursuit_statuses
        will_be_under_pursuit = new_status in under_pursuit_statuses
        if was_under_pursuit and not will_be_under_pursuit and not getattr(instance, "under_pursuit_ended_at", None):
            validated_data["under_pursuit_ended_at"] = validated_data.get("arrested_at") or now
        elif not was_under_pursuit and will_be_under_pursuit:
            # Re-opened pursuit on an existing suspect row (rare, but keep timestamps coherent).
            validated_data["under_pursuit_ended_at"] = None

        if (
            new_judicial_outcome != getattr(instance, "judicial_outcome", None)
            and new_judicial_outcome in {
                CaseSuspect.JudicialOutcome.CONVICTED,
                CaseSuspect.JudicialOutcome.ACQUITTED,
            }
        ):
            validated_data["judicial_decided_at"] = now

        return super().update(instance, validated_data)
