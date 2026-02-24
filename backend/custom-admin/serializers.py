from rest_framework import serializers
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model

from cases.models import Case

User = get_user_model()

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]

class UserSerializer(serializers.ModelSerializer):
    role_id   = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role_id", "role_name"]

    def get_role_id(self, obj):
        group = obj.groups.first()
        return group.id if group else None

    def get_role_name(self, obj):
        group = obj.groups.first()
        return group.name if group else None

class AdminCaseSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="registered_by.username", read_only=True)
    created_by_role = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            "id",
            "title",
            "status",
            "crime_level",
            "created_by",
            "created_by_role",
            "assigned_cadet",
            "assigned_police_officer",
            "assigned_sergeant",
            "assigned_captain",
            "assigned_detective",
            "assigned_judge",
            "updated_at",
        ]

    def get_created_by_role(self, obj):
        group = obj.registered_by.groups.first()
        return group.name if group else None
