# accounts/views.py

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from drf_spectacular.utils import extend_schema
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

    @extend_schema(request=LoginSerializer, responses={200: dict})
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        token, created = Token.objects.get_or_create(user=user)
        
        return Response(
            build_auth_response_payload(user, token_key=token.key, message="Login successful."),
            status=status.HTTP_200_OK,
        )
