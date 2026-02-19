from django.contrib.auth import get_user_model
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import SystemAdminPermission

from .constants import ROLE_CODE_SYSTEM_ADMIN, ROLE_FLAG_CODE_KEY
from .jwt_utils import build_access_token
from .models import Role
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    RoleSerializer,
    UserRoleAssignSerializer,
    UserRoleManagementSerializer,
    UserProfileSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "access_token": build_access_token(user),
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        return Response(
            {
                "access_token": build_access_token(user),
                "user": UserProfileSerializer(user).data,
            }
        )


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    queryset = Role.objects.order_by("name", "id")
    permission_classes = [SystemAdminPermission]


class UserManagementViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = UserRoleManagementSerializer
    queryset = get_user_model().objects.select_related("role").order_by("id")
    permission_classes = [SystemAdminPermission]

    @action(detail=True, methods=["post"], url_path="assign-role")
    def assign_role(self, request, pk=None):
        user = self.get_object()
        serializer = UserRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data["role"]
        update_fields = ["role"]
        user.role = role

        flags = role.default_flags if isinstance(role.default_flags, dict) else {}
        is_system_admin_role = flags.get(ROLE_FLAG_CODE_KEY) == ROLE_CODE_SYSTEM_ADMIN
        if is_system_admin_role and not user.is_staff:
            user.is_staff = True
            update_fields.append("is_staff")

        user.save(update_fields=update_fields)
        return Response(UserRoleManagementSerializer(user).data, status=status.HTTP_200_OK)
