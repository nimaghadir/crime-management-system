from rest_framework.permissions import BasePermission
from accounts.constants import SYSTEM_ADMINISTRATOR

def user_is_admin(user):
    return user.groups.filter(name__in=[SYSTEM_ADMINISTRATOR]).exists()

class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and user_is_admin(request.user))
