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
