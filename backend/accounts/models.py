from django.contrib.auth.models import AbstractUser, Permission
from django.db import models
from django.db.models import Q

from .constants import ROLE_CODE_SYSTEM_ADMIN, ROLE_FLAG_CODE_KEY


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    default_flags = models.JSONField(default=dict, blank=True)
    permissions = models.ManyToManyField(
        Permission, through="RolePermission", related_name="roles", blank=True
    )

    def __str__(self) -> str:
        return self.name


class UserProfile(AbstractUser):
    email = models.EmailField(null=True, blank=True)
    role = models.ForeignKey(
        Role, related_name="users", on_delete=models.SET_NULL, null=True, blank=True
    )
    national_id = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    phone = models.CharField(max_length=20, null=True, blank=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["national_id"],
                condition=Q(national_id__isnull=False) & ~Q(national_id=""),
                name="uniq_user_national_id",
            ),
            models.UniqueConstraint(
                fields=["phone"],
                condition=Q(phone__isnull=False) & ~Q(phone=""),
                name="uniq_user_phone",
            ),
            models.UniqueConstraint(
                fields=["email"],
                condition=Q(email__isnull=False) & ~Q(email=""),
                name="uniq_user_email",
            ),
        ]

    def _get_system_admin_role(self):
        role = Role.objects.filter(
            **{f"default_flags__{ROLE_FLAG_CODE_KEY}": ROLE_CODE_SYSTEM_ADMIN}
        ).first()
        if role is not None:
            return role
        return Role.objects.filter(default_flags__is_system_admin=True).first()

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if self.is_superuser and self.role_id is None:
            system_admin_role = self._get_system_admin_role()
            if system_admin_role is not None:
                self.role = system_admin_role
                if update_fields is not None:
                    update_fields = set(update_fields)
                    update_fields.add("role")
                    kwargs["update_fields"] = list(update_fields)
        if self.is_superuser and not self.is_staff:
            self.is_staff = True
            if update_fields is not None:
                update_fields = set(update_fields)
                update_fields.add("is_staff")
                kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)


class RolePermission(models.Model):
    role = models.ForeignKey(Role, related_name="role_permissions", on_delete=models.CASCADE)
    permission = models.ForeignKey(
        Permission, related_name="role_permissions", on_delete=models.CASCADE
    )

    class Meta:
        unique_together = ("role", "permission")

    def __str__(self) -> str:
        return f"{self.role.name}: {self.permission.codename}"
