# cases/serializers.py

from rest_framework import serializers
from accounts import constants
from django.contrib.auth import get_user_model
from .models import Case, CaseValidationReview, CaseWitness

User = get_user_model()
class CaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            'id', 'title', 'crime_level', 'status', 'creation_method',
            'location', 'incident_datetime', 'assigned_detective',
            'assigned_sergeant', 'created_at', 'registered_by'
        ]
        read_only_fields = ['id', 'created_at', 'assigned_sergeant', 'assigned_detective', 'status', 'registered_by']

class CaseListSerializer(serializers.ModelSerializer):
    created_by_role = serializers.SerializerMethodField()
    complainant_ids = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id',
            'title',
            'description',
            'crime_level',
            'status',
            'creation_method',
            'location',
            'incident_datetime',
            'registered_by',
            'created_by_role',
            'complainant_ids',
            'assigned_cadet',
            'assigned_police_officer',
            'assigned_captain',
            'assigned_chief',
            'assigned_detective',
            'assigned_coroner',
            'assigned_sergeant',
            'assigned_judge',
            'created_at',
            'updated_at',
        ]

    def get_created_by_role(self, obj):
        user = getattr(obj, "registered_by", None)
        if not user:
            return None
        group = user.groups.first()
        return group.name if group else None

    def get_complainant_ids(self, obj):
        return list(obj.complainants.values_list("user_id", flat=True))


class CasePartialUpdateSerializer(serializers.ModelSerializer):
    # Frontend often sends numeric level; map it to crime_level.
    level = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "title",
            "description",
            "crime_level",
            "level",
            "status",
            "creation_method",
            "location",
            "incident_datetime",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "creation_method", "updated_at"]

    def validate(self, attrs):
        level = attrs.pop("level", None)
        if level is not None and "crime_level" not in attrs:
            try:
                numeric = int(level)
            except (TypeError, ValueError):
                raise serializers.ValidationError({"level": "Invalid level value."})

            if numeric == 4:
                attrs["crime_level"] = Case.CrimeLevel.CRITICAL
            elif numeric == 1:
                attrs["crime_level"] = Case.CrimeLevel.LEVEL_1
            elif numeric == 2:
                attrs["crime_level"] = Case.CrimeLevel.LEVEL_2
            else:
                attrs["crime_level"] = Case.CrimeLevel.LEVEL_3
        return attrs

class CaseValidationReviewListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseValidationReview
        fields = [
            "id",
            "case",
            "source",
            "destination",
            "message",
            "validated",
            "resolved",
            "created_at",
        ]

class CaseValidationReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseValidationReview
        fields = [
            "id",
            "case",
            "destination",
            "message",
            "validated",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        validated_data["source"] = self.context["request"].user
        return super().create(validated_data)

class CaseWitnessCreateSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(write_only=True, required=False)
    witness_user = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CaseWitness
        fields = [
            "id",
            "case",
            "user",
            "user_id",
            "witness_user",
            "phone_number",
            "national_id",
        ]
        read_only_fields = ["id", "user", "witness_user", "phone_number", "national_id"]

    def get_witness_user(self, obj):
        user = getattr(obj, "user", None)
        if not user:
            return None
        role_name = user.groups.values_list("name", flat=True).first() or None
        full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
        return {
            "id": user.id,
            "username": user.username,
            "full_name": full_name or user.username,
            "phone_number": getattr(user, "phone_number", "") or "",
            "national_id": getattr(user, "national_id", "") or "",
            "role_name": role_name,
        }

    def validate_user_id(self, value):
        try:
            user = User.objects.prefetch_related("groups").get(id=int(value))
        except (User.DoesNotExist, TypeError, ValueError):
            raise serializers.ValidationError("Witness user not found.")

        role_names = set(user.groups.values_list("name", flat=True))
        if constants.COMPLAINANT in role_names:
            raise serializers.ValidationError(
                "Complainant users cannot be added as witnesses."
            )
        if constants.WITNESS not in role_names:
            raise serializers.ValidationError(
                "Selected user must have the Witness role."
            )
        self.context["witness_user"] = user
        return value

    def create(self, validated_data):
        witness_user = self.context.get("witness_user")
        user_id = validated_data.pop("user_id", None)
        if witness_user is None and user_id:
            witness_user = User.objects.prefetch_related("groups").filter(id=user_id).first()

        request = self.context.get("request")
        if witness_user is None and request and request.user and request.user.is_authenticated:
            # self-join endpoint can pass no user_id and rely on current user
            witness_user = request.user

        if witness_user is None:
            raise serializers.ValidationError({"user_id": "Witness user id is required."})

        case_obj = validated_data["case"]
        existing = CaseWitness.objects.filter(case=case_obj, user=witness_user).first()
        if existing:
            return existing

        validated_data["user"] = witness_user
        validated_data["phone_number"] = getattr(witness_user, "phone_number", "") or ""
        validated_data["national_id"] = getattr(witness_user, "national_id", "") or ""
        return super().create(validated_data)


class WitnessCandidateSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "first_name",
            "last_name",
            "phone_number",
            "national_id",
            "role_name",
        ]

    def get_role_name(self, obj):
        return obj.groups.values_list("name", flat=True).first() or None

    def get_full_name(self, obj):
        value = f"{(obj.first_name or '').strip()} {(obj.last_name or '').strip()}".strip()
        return value or obj.username
