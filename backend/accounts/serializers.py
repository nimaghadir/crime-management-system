# accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'phone_number', 'national_id']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone_number=validated_data['phone_number'],
            national_id=validated_data['national_id']
        )
        return user

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        help_text="Can be Username, Email, Phone Number, or National ID"
    )
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        identifier = data.get('identifier')
        password = data.get('password')

        user = User.objects.filter(
            Q(username=identifier) |
            Q(email=identifier) |
            Q(phone_number=identifier) |
            Q(national_id=identifier)
        ).first()

        if user and user.check_password(password):
            if not user.is_active:
                raise serializers.ValidationError("This account has been disabled.")
            
            data['user'] = user
            return data
            
        raise serializers.ValidationError("Invalid login credentials.")
