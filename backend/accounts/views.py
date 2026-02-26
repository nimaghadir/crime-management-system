# accounts/views.py

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from .serializers import RegisterSerializer, LoginSerializer


def build_auth_response_payload(user, token_key=None, message=None):
    roles = list(user.groups.values_list('name', flat=True))
    role_name = roles[0] if roles else None
    payload = {
        "user_id": user.id,
        "username": user.username,
        "roles": roles,
        "role_name": role_name,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone_number": getattr(user, "phone_number", "") or "",
            "national_id": getattr(user, "national_id", "") or "",
            "role_name": role_name,
            "roles": roles,
        },
    }
    if token_key:
        payload["token"] = token_key
    if message:
        payload["message"] = message
    return payload

@extend_schema_view(
    post=extend_schema(
        tags=["Auth"],
        summary="Register user",
        description="Create a new user account and return an authentication token with role information.",
        request=RegisterSerializer,
        responses={201: dict},
        examples=[
            OpenApiExample(
                "Register request",
                value={
                    "username": "new_user_1",
                    "password": "StrongPass123!",
                    "email": "new_user_1@example.com",
                    "phone_number": "09120000000",
                    "national_id": "0012345678",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Register success response",
                value={
                    "user_id": 101,
                    "username": "new_user_1",
                    "roles": ["Basic User"],
                    "role_name": "Basic User",
                    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    "message": "Registration successful.",
                },
                response_only=True,
            ),
        ],
    )
)
class RegisterView(generics.CreateAPIView):
    """
    Registers a new user into the LAPD system.
    Roles are NOT assigned at this stage.
    """
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token, _ = Token.objects.get_or_create(user=user)
        payload = build_auth_response_payload(user, token_key=token.key, message="Registration successful.")

        return Response(payload, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Authenticates a user using Password + (Username OR Email OR Phone OR National ID).
    Returns an auth token and the user's current roles.
    """
    serializer_class = LoginSerializer

    @extend_schema(
        tags=["Auth"],
        summary="Login user",
        description="Authenticate using username/email/phone/national_id and password. Returns token and role information.",
        request=LoginSerializer,
        responses={200: dict},
        examples=[
            OpenApiExample(
                "Login request",
                value={
                    "identifier": "new_user_1",
                    "password": "StrongPass123!",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Login success response",
                value={
                    "user_id": 101,
                    "username": "new_user_1",
                    "roles": ["Basic User"],
                    "role_name": "Basic User",
                    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    "message": "Login successful.",
                },
                response_only=True,
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        token, created = Token.objects.get_or_create(user=user)
        
        return Response(
            build_auth_response_payload(user, token_key=token.key, message="Login successful."),
            status=status.HTTP_200_OK,
        )
