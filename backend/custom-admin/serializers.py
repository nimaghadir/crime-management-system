from rest_framework import serializers
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from accounts import constants

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
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "national_id",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "role_id",
            "role_name",
        ]
        read_only_fields = [
            "id",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "role_id",
            "role_name",
        ]

    def get_role_id(self, obj):
        role_names = list(obj.groups.values_list("name", flat=True))
        primary_role_name = constants.select_primary_role_name(role_names)
        if not primary_role_name:
            return None
        group = obj.groups.filter(name=primary_role_name).first()
        return group.id if group else None

    def get_role_name(self, obj):
        return constants.select_primary_role_name(obj.groups.values_list("name", flat=True))


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "national_id",
            "is_active",
            "password",
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

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
            "assigned_chief",
            "assigned_detective",
            "assigned_coroner",
            "assigned_judge",
            "updated_at",
        ]

    def get_created_by_role(self, obj):
        if not obj.registered_by:
            return None
        return constants.select_primary_role_name(
            obj.registered_by.groups.values_list("name", flat=True)
        )
