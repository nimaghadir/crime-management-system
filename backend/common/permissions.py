from collections.abc import Iterable

from rest_framework.permissions import BasePermission

from accounts.constants import ROLE_CODE_SYSTEM_ADMIN, ROLE_FLAG_CODE_KEY


class RoleBasedPermission(BasePermission):
    message = "You do not have permission to perform this action."
    allowed_roles = None

    def _normalize_roles(self, roles) -> set[str] | None:
        if roles is None:
            return None
        if isinstance(roles, str):
            roles = [roles]
        if not isinstance(roles, Iterable):
            return None
        return {str(role).strip().lower() for role in roles if str(role).strip()}

    def _get_allowed_roles(self, view) -> set[str] | None:
        view_roles = getattr(view, "allowed_roles", None)
        if view_roles is not None:
            return self._normalize_roles(view_roles)
        return self._normalize_roles(self.allowed_roles)

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        allowed_roles = self._get_allowed_roles(view)
        if not allowed_roles:
            return True

        role = getattr(user, "role", None)
        if role is None:
            return False

        role_name = getattr(role, "name", None)
        if not role_name:
            return False
        return role_name.strip().lower() in allowed_roles

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class SystemAdminPermission(BasePermission):
    message = "Only system administrators can perform this action."

    def _is_system_admin_role(self, role) -> bool:
        if role is None:
            return False

        flags = getattr(role, "default_flags", {}) or {}
        if not isinstance(flags, dict):
            return False

        role_code = flags.get(ROLE_FLAG_CODE_KEY)
        return bool(
            role_code == ROLE_CODE_SYSTEM_ADMIN
            or flags.get("can_manage_roles")
            or flags.get("is_system_admin")
        )

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_superuser", False):
            return True

        return self._is_system_admin_role(getattr(user, "role", None))

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
