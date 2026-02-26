from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from notifications.models import Notification
from notifications.utils import notify_case
from cases.models import Case, CaseValidationReview, Complainant, CaseSuspect
from financials.models import RewardTip
from evidence.models import (
    TestimonyEvidence,
    BiologicalEvidence,
    VehicleEvidence,
    IdentificationDocument,
    OtherEvidence,
)
from accounts import constants
from accounts.constants import SYSTEM_ADMINISTRATOR
from .permissions import IsSystemAdmin
from .serializers import (
    RoleSerializer,
    UserSerializer,
    AdminCaseSerializer,
    AdminUserUpdateSerializer,
)

User = get_user_model()


def is_system_admin_user(user):
    return bool(user and user.groups.filter(name=SYSTEM_ADMINISTRATOR).exists())


def build_user_delete_impact(user):
    review_qs = CaseValidationReview.objects.filter(Q(source=user) | Q(destination=user))

    set_null_effects = {
        "cases_registered_by": Case.objects.filter(registered_by=user).count(),
        "cases_assigned_cadet": Case.objects.filter(assigned_cadet=user).count(),
        "cases_assigned_officer": Case.objects.filter(assigned_police_officer=user).count(),
        "cases_assigned_sergeant": Case.objects.filter(assigned_sergeant=user).count(),
        "cases_assigned_captain": Case.objects.filter(assigned_captain=user).count(),
        "cases_assigned_chief": Case.objects.filter(assigned_chief=user).count(),
        "cases_assigned_detective": Case.objects.filter(assigned_detective=user).count(),
        "cases_assigned_coroner": Case.objects.filter(assigned_coroner=user).count(),
        "cases_assigned_judge": Case.objects.filter(assigned_judge=user).count(),
        "reward_tips_reviewing_officer": RewardTip.objects.filter(reviewing_officer=user).count(),
        "testimony_submitter_links": TestimonyEvidence.objects.filter(submitter=user).count(),
        "biological_submitter_links": BiologicalEvidence.objects.filter(submitter=user).count(),
        "biological_reviewer_links": BiologicalEvidence.objects.filter(reviewed_by=user).count(),
        "vehicle_submitter_links": VehicleEvidence.objects.filter(submitter=user).count(),
        "identification_submitter_links": IdentificationDocument.objects.filter(submitter=user).count(),
        "other_evidence_submitter_links": OtherEvidence.objects.filter(submitter=user).count(),
    }

    cascade_deletions = {
        "notifications": Notification.objects.filter(recipient=user).count(),
        "submitted_reward_tips": RewardTip.objects.filter(submitter=user).count(),
        "complainant_links": Complainant.objects.filter(user=user).count(),
        "suspect_case_links": CaseSuspect.objects.filter(suspect=user).count(),
        "testimony_witness_records": TestimonyEvidence.objects.filter(witness=user).count(),
        "case_validation_reviews_total": review_qs.count(),
        "case_validation_reviews_as_source": CaseValidationReview.objects.filter(source=user).count(),
        "case_validation_reviews_as_destination": CaseValidationReview.objects.filter(destination=user).count(),
    }

    warnings = []
    if cascade_deletions["suspect_case_links"] > 0:
        warnings.append("Deleting this user removes suspect links from related cases.")
    if cascade_deletions["submitted_reward_tips"] > 0:
        warnings.append("Deleting this user removes submitted reward tips and their reward records.")
    if cascade_deletions["case_validation_reviews_total"] > 0:
        warnings.append("Deleting this user removes case validation review history entries.")
    if is_system_admin_user(user):
        warnings.append("This user currently has System Administrator access.")

    return {
        "set_null_effects": set_null_effects,
        "cascade_deletions": cascade_deletions,
        "warnings": warnings,
        "has_any_effect": any(set_null_effects.values()) or any(cascade_deletions.values()),
    }


def delete_user_with_cleanup(user):
    impact = build_user_delete_impact(user)

    with transaction.atomic():
        # Explicitly null out SET_NULL relations so the cleanup is clear/auditable.
        Case.objects.filter(registered_by=user).update(registered_by=None)
        Case.objects.filter(assigned_cadet=user).update(assigned_cadet=None)
        Case.objects.filter(assigned_police_officer=user).update(assigned_police_officer=None)
        Case.objects.filter(assigned_sergeant=user).update(assigned_sergeant=None)
        Case.objects.filter(assigned_captain=user).update(assigned_captain=None)
        Case.objects.filter(assigned_chief=user).update(assigned_chief=None)
        Case.objects.filter(assigned_detective=user).update(assigned_detective=None)
        Case.objects.filter(assigned_coroner=user).update(assigned_coroner=None)
        Case.objects.filter(assigned_judge=user).update(assigned_judge=None)
        RewardTip.objects.filter(reviewing_officer=user).update(reviewing_officer=None)
        TestimonyEvidence.objects.filter(submitter=user).update(submitter=None)
        BiologicalEvidence.objects.filter(submitter=user).update(submitter=None)
        BiologicalEvidence.objects.filter(reviewed_by=user).update(reviewed_by=None)
        VehicleEvidence.objects.filter(submitter=user).update(submitter=None)
        IdentificationDocument.objects.filter(submitter=user).update(submitter=None)
        OtherEvidence.objects.filter(submitter=user).update(submitter=None)

        # Explicitly delete known CASCADE relations so impact matches action taken.
        Notification.objects.filter(recipient=user).delete()
        RewardTip.objects.filter(submitter=user).delete()
        Complainant.objects.filter(user=user).delete()
        CaseSuspect.objects.filter(suspect=user).delete()
        TestimonyEvidence.objects.filter(witness=user).delete()
        CaseValidationReview.objects.filter(Q(source=user) | Q(destination=user)).delete()

        deleted_id = user.id
        deleted_username = user.username
        user.delete()

    return {
        "deleted_user_id": deleted_id,
        "deleted_username": deleted_username,
        "impact": impact,
    }


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
    queryset = User.objects.prefetch_related("groups").order_by("-date_joined", "-id")
    serializer_class = UserSerializer
    permission_classes = [IsSystemAdmin]


class UserDetailManageView(APIView):
    """
    GET/PATCH/DELETE /custom-admin/users/{user_id}/
    """
    permission_classes = [IsSystemAdmin]

    def _get_target(self, user_id):
        return User.objects.prefetch_related("groups").filter(id=user_id).first()

    def get(self, request, user_id):
        user = self._get_target(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        return Response({
            "user": UserSerializer(user).data,
            "delete_impact": build_user_delete_impact(user),
        })

    def patch(self, request, user_id):
        user = self._get_target(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if request.user.id == user.id and serializer.validated_data.get("is_active") is False:
            return Response(
                {"detail": "You cannot deactivate your own currently logged-in admin account."},
                status=400,
            )

        updated = serializer.save()
        return Response(UserSerializer(updated).data)

    def delete(self, request, user_id):
        user = self._get_target(user_id)
        if not user:
            return Response({"detail": "User not found."}, status=404)

        if request.user.id == user.id:
            return Response({"detail": "You cannot delete your own account."}, status=400)

        if is_system_admin_user(user):
            admin_count = User.objects.filter(groups__name=SYSTEM_ADMINISTRATOR).distinct().count()
            if admin_count <= 1:
                return Response(
                    {"detail": "Cannot delete the last System Administrator user."},
                    status=400,
                )

        try:
            result = delete_user_with_cleanup(user)
        except ProtectedError as exc:
            return Response(
                {"detail": "User cannot be deleted because protected related records exist.", "error": str(exc)},
                status=409,
            )
        except IntegrityError as exc:
            return Response(
                {"detail": "User deletion failed due to database integrity constraints.", "error": str(exc)},
                status=409,
            )

        return Response({
            "detail": "User deleted successfully.",
            **result,
        })

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

        if is_system_admin_user(user) and role.name != SYSTEM_ADMINISTRATOR:
            admin_count = User.objects.filter(groups__name=SYSTEM_ADMINISTRATOR).distinct().count()
            if admin_count <= 1:
                return Response(
                    {"detail": "Cannot remove the last System Administrator from the admin role."},
                    status=400,
                )

        # Clear old role(s) and assign new one
        user.groups.clear()
        user.groups.add(role)

        return Response(UserSerializer(user).data)


class CaseQueueView(APIView):
    """
    GET /custom-admin/case-queues/<str:queue_type>/"
    """
    permission_classes = [IsSystemAdmin]

    def get(self, request, queue_type):
        qs = Case.objects.all()
        queue_type = str(queue_type or "").strip().lower()

        if queue_type == "intern_unassigned":
            qs = qs.filter(assigned_cadet__isnull=True)

        elif queue_type == "officer_unassigned":
            qs = qs.filter(assigned_police_officer__isnull=True)

        elif queue_type in {"police_without_supervisor", "command_chain_unassigned"}:
            qs = qs.filter(
                Q(assigned_sergeant__isnull=True)
                | Q(assigned_captain__isnull=True)
                | Q(assigned_chief__isnull=True)
            )

        elif queue_type == "specialists_unassigned":
            qs = qs.filter(
                Q(assigned_detective__isnull=True)
                | Q(assigned_coroner__isnull=True)
                | Q(assigned_judge__isnull=True)
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
        previous_assignment_ids = {
            "assigned_cadet": case.assigned_cadet_id,
            "assigned_police_officer": case.assigned_police_officer_id,
            "assigned_sergeant": case.assigned_sergeant_id,
            "assigned_captain": case.assigned_captain_id,
            "assigned_chief": case.assigned_chief_id,
            "assigned_detective": case.assigned_detective_id,
            "assigned_coroner": case.assigned_coroner_id,
            "assigned_judge": case.assigned_judge_id,
        }

        mapping = {
            "intern_id": "assigned_cadet",
            "cadet_id": "assigned_cadet",
            "officer_id": "assigned_police_officer",
            "police_officer_id": "assigned_police_officer",
            "supervisor_id": "assigned_sergeant",
            "sergeant_id": "assigned_sergeant",
            "captain_id": "assigned_captain",
            "chief_id": "assigned_chief",
            "police_chief_id": "assigned_chief",
            "detective_id": "assigned_detective",
            "coroner_id": "assigned_coroner",
            "medical_examiner_id": "assigned_coroner",
            "judge_id": "assigned_judge",
        }

        allowed_roles_by_field = {
            "assigned_cadet": {constants.CADET},
            "assigned_police_officer": {constants.POLICE_OFFICER, constants.PATROL_OFFICER},
            "assigned_sergeant": {constants.SERGEANT},
            "assigned_captain": {constants.CAPTAIN},
            "assigned_chief": {constants.POLICE_CHIEF},
            "assigned_detective": {constants.DETECTIVE},
            "assigned_coroner": {constants.CORONER},
            "assigned_judge": {constants.JUDGE},
        }

        updated_fields = set()

        for body_key, field_name in mapping.items():
            if body_key in request.data:
                raw_value = request.data[body_key]
                if raw_value in (None, "", "0", 0):
                    setattr(case, f"{field_name}_id", None)
                    updated_fields.add(field_name)
                    continue

                try:
                    user_id = int(raw_value)
                except (TypeError, ValueError):
                    return Response(
                        {"detail": f"Invalid value for {body_key}. Expected user id or null."},
                        status=400,
                    )

                target_user = User.objects.filter(id=user_id).prefetch_related("groups").first()
                if not target_user:
                    return Response(
                        {"detail": f"User #{user_id} was not found for {body_key}."},
                        status=404,
                    )

                allowed_roles = allowed_roles_by_field.get(field_name, set())
                if allowed_roles:
                    target_roles = set(target_user.groups.values_list("name", flat=True))
                    if not target_roles.intersection(allowed_roles):
                        return Response(
                            {
                                "detail": (
                                    f"User #{user_id} cannot be assigned to {body_key}. "
                                    f"Expected role: {', '.join(sorted(allowed_roles))}."
                                )
                            },
                            status=400,
                        )

                setattr(case, f"{field_name}_id", user_id)
                updated_fields.add(field_name)

        if not updated_fields:
            return Response({"detail": "No supported assignment fields were provided."}, status=400)

        case.save(update_fields=sorted(updated_fields))
        case.refresh_from_db()

        slot_labels = {
            "assigned_cadet": "Cadet",
            "assigned_police_officer": "Police Officer",
            "assigned_sergeant": "Sergeant",
            "assigned_captain": "Captain",
            "assigned_chief": "Police Chief",
            "assigned_detective": "Detective",
            "assigned_coroner": "Coroner",
            "assigned_judge": "Judge",
        }
        actor_name = request.user.username
        for field_name in updated_fields:
            old_id = previous_assignment_ids.get(field_name)
            new_id = getattr(case, f"{field_name}_id", None)
            if old_id == new_id:
                continue

            slot_label = slot_labels.get(field_name, field_name.replace("assigned_", "").replace("_", " ").title())
            if old_id:
                old_user = User.objects.filter(id=old_id).first()
                if old_user:
                    notify_case(
                        old_user,
                        case.id,
                        f"{slot_label} assignment removed",
                        f"Admin {actor_name} removed your {slot_label.lower()} assignment from Case #{case.id}.",
                    )
            if new_id:
                new_user = getattr(case, field_name, None)
                if new_user:
                    notify_case(
                        new_user,
                        case.id,
                        f"Assigned as {slot_label}",
                        f"Admin {actor_name} assigned you as {slot_label.lower()} on Case #{case.id}.",
                    )

        return Response(AdminCaseSerializer(case).data)


class AdminCaseDeleteView(APIView):
    """
    DELETE /custom-admin/admin/cases/<int:case_id>/
    """
    permission_classes = [IsSystemAdmin]

    def delete(self, request, case_id):
        case = Case.objects.filter(id=case_id).first()
        if not case:
            return Response({"detail": "Case not found."}, status=404)

        case_snapshot = {
            "id": case.id,
            "title": case.title,
            "status": case.status,
        }
        try:
            with transaction.atomic():
                case.delete()
        except ProtectedError as exc:
            return Response(
                {"detail": "Case cannot be deleted because protected related records exist.", "error": str(exc)},
                status=409,
            )
        except IntegrityError as exc:
            return Response(
                {"detail": "Case deletion failed due to database integrity constraints.", "error": str(exc)},
                status=409,
            )

        return Response(
            {
                "detail": "Case deleted successfully.",
                "case": case_snapshot,
            },
            status=200,
        )
