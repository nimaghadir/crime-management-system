from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from .models import Role, UserProfile


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "description", "default_flags")


class UserProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    class Meta:
        model = UserProfile
        fields = ("id", "username", "role_name")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = UserProfile
        fields = ("username", "password", "email", "phone", "national_id")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = get_user_model().objects.create_user(password=password, **validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["identifier"]
        password = attrs["password"]

        user = (
            get_user_model()
            .objects.select_related("role")
            .filter(
                Q(username=identifier)
                | Q(email=identifier)
                | Q(phone=identifier)
                | Q(national_id=identifier)
            )
            .first()
        )
        if user is None or not user.check_password(password):
            raise serializers.ValidationError({"identifier": ["Invalid credentials."]})
        if not user.is_active:
            raise serializers.ValidationError({"identifier": ["User is inactive."]})

        attrs["user"] = user
        return attrs
