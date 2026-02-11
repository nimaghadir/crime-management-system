from django.contrib.auth.models import AbstractUser, Permission
from django.db import models
from django.db.models import Q


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


class RolePermission(models.Model):
    role = models.ForeignKey(Role, related_name="role_permissions", on_delete=models.CASCADE)
    permission = models.ForeignKey(
        Permission, related_name="role_permissions", on_delete=models.CASCADE
    )

    class Meta:
        unique_together = ("role", "permission")

    def __str__(self) -> str:
        return f"{self.role.name}: {self.permission.codename}"
