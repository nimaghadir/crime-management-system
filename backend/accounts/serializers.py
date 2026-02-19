from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from .constants import DEFAULT_ROLE_CODE, ROLE_FLAG_CODE_KEY
from .models import Role, UserProfile


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "description", "default_flags")

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Role name cannot be empty.")
        return cleaned

    def validate_default_flags(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("default_flags must be an object.")
        return value


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
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=True, max_length=20)
    national_id = serializers.CharField(required=True, max_length=20)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)

    class Meta:
        model = UserProfile
        fields = (
            "username",
            "password",
            "email",
            "phone",
            "first_name",
            "last_name",
            "national_id",
        )

    def _validate_non_empty(self, value, field_name):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError(f"{field_name} cannot be empty.")
        return cleaned

    def _validate_unique_field(self, field_name, value, label, case_insensitive=False):
        cleaned = self._validate_non_empty(value, label)
        lookup = f"{field_name}__iexact" if case_insensitive else field_name
        if UserProfile.objects.filter(**{lookup: cleaned}).exists():
            raise serializers.ValidationError(f"{label} is already in use.")
        return cleaned

    def validate_username(self, value):
        return self._validate_unique_field(
            field_name="username",
            value=value,
            label="Username",
            case_insensitive=True,
        )

    def validate_email(self, value):
        return self._validate_unique_field(
            field_name="email",
            value=value,
            label="Email",
            case_insensitive=True,
        )

    def validate_phone(self, value):
        return self._validate_unique_field(
            field_name="phone",
            value=value,
            label="Phone",
        )

    def validate_national_id(self, value):
        return self._validate_unique_field(
            field_name="national_id",
            value=value,
            label="National ID",
        )

    def validate_first_name(self, value):
        return self._validate_non_empty(value, "First name")

    def validate_last_name(self, value):
        return self._validate_non_empty(value, "Last name")

    def create(self, validated_data):
        password = validated_data.pop("password")
        default_role = Role.objects.filter(
            **{f"default_flags__{ROLE_FLAG_CODE_KEY}": DEFAULT_ROLE_CODE}
        ).only("id").first()
        if default_role is None:
            default_role = (
                Role.objects.filter(default_flags__is_default_role=True)
                .only("id")
                .order_by("id")
                .first()
            )
        if default_role is not None:
            validated_data["role"] = default_role
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


class UserRoleManagementSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    class Meta:
        model = UserProfile
        fields = (
            "id",
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "national_id",
            "role",
            "role_name",
            "is_active",
        )
        read_only_fields = (
            "id",
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "national_id",
            "role_name",
            "is_active",
        )


class UserRoleAssignSerializer(serializers.Serializer):
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())
