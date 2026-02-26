from rest_framework.permissions import BasePermission
from accounts.constants import POLICE_CHIEF, CAPTAIN, JUDGE

REPORT_ROLES = {POLICE_CHIEF, CAPTAIN, JUDGE}


class CanViewCaseReport(BasePermission):
    message = "You do not have permission to view this case report."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        roles = set(request.user.groups.values_list('name', flat=True))
        return bool(roles.intersection(REPORT_ROLES))

    def has_object_permission(self, request, view, obj):
        roles = set(request.user.groups.values_list('name', flat=True))
        user_id = request.user.pk

        if JUDGE in roles and obj.assigned_judge_id == user_id:
            return True
        if CAPTAIN in roles and getattr(obj, "assigned_captain_id", None) == user_id:
            return True
        if POLICE_CHIEF in roles and getattr(obj, "assigned_chief_id", None) == user_id:
            return True

        return False
