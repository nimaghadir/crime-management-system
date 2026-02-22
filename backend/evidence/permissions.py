from rest_framework.permissions import BasePermission
from accounts.constants import COP_ROLES, JUDGE, SYSTEM_ADMINISTRATOR, CORONER


def user_has_any_role(user, roles):
    return user.groups.filter(name__in=roles).exists()


class IsCopOrJudgeOrAdmin(BasePermission):
    """Read: COP + Judge + System Admin. Used for evidence."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        allowed = COP_ROLES | {JUDGE, SYSTEM_ADMINISTRATOR}
        return user_has_any_role(request.user, allowed)


class IsCop(BasePermission):
    """Write: COP only."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return user_has_any_role(request.user, COP_ROLES)


class IsCoroner(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return user_has_any_role(request.user, {CORONER})