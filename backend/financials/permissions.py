# financials/permissions.py

from rest_framework.permissions import BasePermission
from accounts.constants import COP_ROLES, POLICE_OFFICER, DETECTIVE


def user_groups(user):
    """Return a set of the user's group names."""
    return set(user.groups.values_list('name', flat=True))


class IsCop(BasePermission):
    """Any sworn officer (all badge-carrying roles)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            user_groups(request.user) & COP_ROLES
        )


class IsPoliceOfficer(BasePermission):
    """Exactly the Police Officer group (for SUBMITTED → FORWARDED/REJECTED)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            POLICE_OFFICER in user_groups(request.user)
        )
