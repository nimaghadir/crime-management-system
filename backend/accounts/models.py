from django.contrib.auth.models import Permission
from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    default_flags = models.JSONField(default=dict, blank=True)
    permissions = models.ManyToManyField(
        Permission, through="RolePermission", related_name="roles", blank=True
    )

    def __str__(self) -> str:
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(Role, related_name="role_permissions", on_delete=models.CASCADE)
    permission = models.ForeignKey(
        Permission, related_name="role_permissions", on_delete=models.CASCADE
    )

    class Meta:
        unique_together = ("role", "permission")

    def __str__(self) -> str:
        return f"{self.role.name}: {self.permission.codename}"
