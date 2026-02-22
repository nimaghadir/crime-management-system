from rest_framework.permissions import BasePermission
from accounts.constants import POLICE_CHIEF, CAPTAIN, DETECTIVE, SERGEANT, JUDGE

FULL_ACCESS_ROLES = {POLICE_CHIEF, CAPTAIN, JUDGE}
ASSIGNED_ROLES    = {DETECTIVE, SERGEANT}


class CanViewCaseReport(BasePermission):
    message = "You do not have permission to view this case report."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = request.user.groups.values_list('name', flat=True).first()
        return role in (FULL_ACCESS_ROLES | ASSIGNED_ROLES)

    def has_object_permission(self, request, view, obj):
        role = request.user.groups.values_list('name', flat=True).first()

        if role in FULL_ACCESS_ROLES:
            return True

        if role == DETECTIVE and obj.assigned_detective_id == request.user.pk:
            return True

        if role == SERGEANT and obj.assigned_sergeant_id == request.user.pk:
            return True

        return False
