from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Role, RolePermission, UserProfile


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission")
    list_filter = ("role",)


@admin.register(UserProfile)
class UserProfileAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("role", "national_id", "phone")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Profile", {"fields": ("role", "national_id", "phone")}),
    )
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email", "national_id", "phone")

# Register your models here.
