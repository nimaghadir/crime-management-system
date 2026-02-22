# cases/permissions.py

from rest_framework.permissions import BasePermission

def is_in_group(user, group_name):
    return user.groups.filter(name=group_name).exists()


class IsDetective(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and is_in_group(request.user, 'detective')


class IsSergeant(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and is_in_group(request.user, 'sergeant')


class IsJudge(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and is_in_group(request.user, 'judge')


class IsDetectiveOrSergeant(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            is_in_group(request.user, 'detective') or
            is_in_group(request.user, 'sergeant')
        )


class IsDetectiveOrSergeantOrJudge(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            is_in_group(request.user, 'detective') or
            is_in_group(request.user, 'sergeant') or
            is_in_group(request.user, 'judge')
        )

class CanAddWitness(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            is_in_group(request.user, 'detective') or
            is_in_group(request.user, 'sergeant') or
            is_in_group(request.user, 'judge')
        )
