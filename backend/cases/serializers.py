from django.contrib.auth import get_user_model
from rest_framework import serializers

from investigations.models import Suspect

from .models import Case, Tag


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
