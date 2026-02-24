from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from notifications.models import Notification
from cases.models import Case
from accounts.constants import ALL_ROLES
from .permissions import IsSystemAdmin
from .serializers import RoleSerializer, UserSerializer, AdminCaseSerializer
from django.db.models import Count

User = get_user_model()


class AdminConsoleSummaryView(APIView):
    """
    GET /custom-admin/console-summary/
    """
    permission_classes = [IsSystemAdmin]

    def get(self, request):
        users_count = User.objects.count()
        roles_count = Group.objects.count()
        cases_count = Case.objects.count()
        open_cases = Case.objects.filter(status="open").count()
        resolved_cases = Case.objects.filter(status="resolved").count()
        evidence_count = sum([app.models.count() for app in []])  # put evidence model counts if needed
        notifications_count = Notification.objects.count()
        unread_notify = Notification.objects.filter(is_read=False).count()

        recent_cases = Case.objects.order_by("-updated_at")[:5].values("id", "title", "status", "updated_at")
        recent_users = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role_name": u.groups.first().name if u.groups.exists() else None
            }
            for u in User.objects.order_by("-date_joined")[:5]
        ]
        role_dist = Group.objects.annotate(user_count=Count("user")).values("id", "name", "user_count")

        return Response({
            "summary": {
                "users": users_count,
                "roles": roles_count,
                "cases": cases_count,
                "open_cases": open_cases,
                "resolved_cases": resolved_cases,
                "notifications": notifications_count,
                "unread_notifications": unread_notify,
            },
            "recent_cases": list(recent_cases),
            "recent_users": recent_users,
            "role_distribution": list(role_dist),
        })


class RoleListCreateView(generics.ListCreateAPIView):
    """
    GET /custom-admin/roles/
    """
    queryset = Group.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsSystemAdmin]


class RoleDeleteView(APIView):
    """
    POST /custom-admin/roles/
    DELETE /custom-admin/roles/
    """
    permission_classes = [IsSystemAdmin]

    def delete(self, request, role_id):
        role = Group.objects.filter(id=role_id).first()
        if not role:
            return Response({"detail": "Role not found."}, status=404)
        if role.user_set.exists():
            return Response(
                {"detail": "Cannot delete role: it is assigned to users."},
                status=400,
            )
        role.delete()
        return Response(status=204)


class UserListView(generics.ListAPIView):
    """
    GET /custom-admin/users/
    """
    queryset = User.objects.prefetch_related("groups")
    serializer_class = UserSerializer
    permission_classes = [IsSystemAdmin]

class AssignUserRoleView(APIView):
    """
    POST /custom-admin/users/{user_id}/assign-role/
    """
    permission_classes = [IsSystemAdmin]

    def post(self, request, user_id):
        role_id = request.data.get("role")
        user = User.objects.filter(id=user_id).first()
        role = Group.objects.filter(id=role_id).first()

        if not user or not role:
            return Response({"detail": "User or Role not found."}, status=404)

        # Clear old role(s) and assign new one
        user.groups.clear()
        user.groups.add(role)

        return Response({
            "message": "Role assigned successfully.",
            "user_id": user.id,
            "role_id": role.id,
            "role_name": role.name
        })


class CaseQueueView(APIView):
    """
    GET /custom-admin/case-queues/<str:queue_type>/"
    """
    permission_classes = [IsSystemAdmin]

    def get(self, request, queue_type):
        qs = Case.objects.all()

        if queue_type == "intern_unassigned":
            qs = qs.filter(assigned_intern__isnull=True)

        elif queue_type == "officer_unassigned":
            qs = qs.filter(assigned_officer__isnull=True)

        elif queue_type == "police_without_supervisor":
            qs = qs.filter(
                assigned_officer__isnull=False,
                assigned_supervisor__isnull=True,
            )

        elif queue_type == "specialists_unassigned":
            qs = qs.filter(
                assigned_detective__isnull=True
            )

        else:
            raise ValidationError("Invalid queue type.")

        serializer = AdminCaseSerializer(qs.order_by("-updated_at"), many=True)
        return Response(serializer.data)


class CaseAssignmentView(APIView):
    """
    PATCH /custom-admin/case-assignments/<int:case_id>/"
    """
    permission_classes = [IsSystemAdmin]

    def patch(self, request, case_id):
        case = Case.objects.filter(id=case_id).first()
        if not case:
            return Response({"detail": "Case not found."}, status=404)

        mapping = {
            "intern_id": "assigned_intern",
            "officer_id": "assigned_officer",
            "supervisor_id": "assigned_supervisor",
            "detective_id": "assigned_detective",
            "judge_id": "assigned_judge",
        }

        for body_key, field_name in mapping.items():
            if body_key in request.data:
                setattr(case, field_name, request.data[body_key])

        case.save()

        return Response(AdminCaseSerializer(case).data)
