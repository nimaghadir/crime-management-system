from django.contrib.auth import get_user_model
from rest_framework import serializers

from investigations.models import Suspect

from .models import Case, CaseComplainant, Complaint, CrimeSceneReport, CrimeSceneWitness, Tag


class CaseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = (
            "id",
            "title",
            "status",
            "level",
            "assigned_to",
            "updated_at",
        )
        read_only_fields = fields


class TagSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name")
        read_only_fields = fields


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name")


class UserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    role_name = serializers.SerializerMethodField()

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None


class SuspectSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Suspect
        fields = ("id", "name", "status", "score")
        read_only_fields = fields


class CaseDetailSerializer(serializers.ModelSerializer):
    tags = TagSummarySerializer(many=True, read_only=True)
    assigned_to = UserSummarySerializer(read_only=True)
    suspects = SuspectSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = (
            "id",
            "title",
            "description",
            "status",
            "level",
            "version",
            "assigned_to",
            "tags",
            "suspects",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class CaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ("id", "title", "description", "level", "assigned_to", "status")
        read_only_fields = ("id", "status")

    def validate_title(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Title cannot be empty.")
        return cleaned


class CasePartialUpdateSerializer(serializers.ModelSerializer):
    STATUS_TRANSITIONS = {
        Case.Status.OPEN: {Case.Status.IN_PROGRESS, Case.Status.CLOSED},
        Case.Status.IN_PROGRESS: {Case.Status.RESOLVED, Case.Status.CLOSED},
        Case.Status.RESOLVED: {Case.Status.CLOSED},
        Case.Status.CLOSED: set(),
    }
    LEVEL_ORDER = [Case.Level.LEVEL_3, Case.Level.LEVEL_2, Case.Level.LEVEL_1, Case.Level.CRITICAL]

    class Meta:
        model = Case
        fields = ("status", "level")

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")

        instance = self.instance
        if instance is None:
            return attrs

        new_status = attrs.get("status")
        if new_status and new_status != instance.status:
            allowed = self.STATUS_TRANSITIONS.get(instance.status, set())
            if new_status not in allowed:
                raise serializers.ValidationError(
                    {"status": "Invalid status transition."}
                )

        new_level = attrs.get("level")
        if new_level and new_level != instance.level:
            old_index = self.LEVEL_ORDER.index(instance.level)
            new_index = self.LEVEL_ORDER.index(new_level)
            if abs(new_index - old_index) > 1:
                raise serializers.ValidationError(
                    {"level": "Invalid level transition."}
                )

        return attrs


class ComplaintToCaseConversionSerializer(serializers.Serializer):
    level = serializers.ChoiceField(
        choices=Case.Level.choices,
        default=Case.Level.LEVEL_3,
        required=False,
    )
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all(),
        required=False,
        allow_null=True,
    )


class ComplaintSerializer(serializers.ModelSerializer):
    complainant = UserSummarySerializer(read_only=True)
    forwarded_to = UserSummarySerializer(read_only=True)

    class Meta:
        model = Complaint
        fields = (
            "id",
            "complainant",
            "title",
            "description",
            "status",
            "workflow_status",
            "revision_count",
            "intern_feedback",
            "officer_feedback",
            "forwarded_to",
            "case",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "complainant",
            "status",
            "workflow_status",
            "revision_count",
            "intern_feedback",
            "officer_feedback",
            "forwarded_to",
            "case",
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


class ComplaintFeedbackSerializer(serializers.Serializer):
    message = serializers.CharField()

    def validate_message(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Message cannot be empty.")
        return cleaned


class ComplaintForwardSerializer(serializers.Serializer):
    officer = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.select_related("role").all()
    )
    intern_note = serializers.CharField(required=False, allow_blank=True, default="")


class ComplaintOfficerApproveSerializer(ComplaintToCaseConversionSerializer):
    approval_note = serializers.CharField(required=False, allow_blank=True, default="")


class CaseComplainantSerializer(serializers.ModelSerializer):
    submitted_by = UserSummarySerializer(read_only=True)
    reviewed_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = CaseComplainant
        fields = (
            "id",
            "case",
            "full_name",
            "national_id",
            "phone",
            "submitted_by",
            "review_status",
            "review_note",
            "reviewed_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "submitted_by",
            "review_status",
            "review_note",
            "reviewed_by",
            "created_at",
            "updated_at",
        )

    def validate_full_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Full name cannot be empty.")
        return cleaned


class CaseComplainantReviewSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")


class CrimeSceneWitnessSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrimeSceneWitness
        fields = (
            "id",
            "full_name",
            "national_id",
            "phone",
            "note",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_full_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Full name cannot be empty.")
        return cleaned

    def validate_national_id(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("National ID cannot be empty.")
        return cleaned

    def validate_phone(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Phone cannot be empty.")
        return cleaned


class CrimeSceneReportSerializer(serializers.ModelSerializer):
    reported_by = UserSummarySerializer(read_only=True)
    approved_by = UserSummarySerializer(read_only=True)
    witnesses = CrimeSceneWitnessSerializer(many=True, required=False)

    class Meta:
        model = CrimeSceneReport
        fields = (
            "id",
            "title",
            "description",
            "location",
            "observed_at",
            "reported_by",
            "status",
            "reviewer_note",
            "approved_by",
            "approved_at",
            "case",
            "witnesses",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reported_by",
            "status",
            "reviewer_note",
            "approved_by",
            "approved_at",
            "case",
            "created_at",
            "updated_at",
        )

    def validate_title(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Title cannot be empty.")
        return cleaned

    def validate(self, attrs):
        witnesses = attrs.get("witnesses", [])
        witness_national_ids = [item.get("national_id") for item in witnesses if item.get("national_id")]
        if len(set(witness_national_ids)) != len(witness_national_ids):
            raise serializers.ValidationError({"witnesses": "Witness national IDs must be unique."})
        return attrs

    def create(self, validated_data):
        witnesses_data = validated_data.pop("witnesses", [])
        report = CrimeSceneReport.objects.create(**validated_data)
        for witness_data in witnesses_data:
            CrimeSceneWitness.objects.create(report=report, **witness_data)
        return report


class CrimeSceneReportApproveSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")
