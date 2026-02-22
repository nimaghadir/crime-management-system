# cases/views.py
from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import Case, CaseReviewAction, CaseSuspect, SuspectReviewAction, Complainant
from .serializers import (
    CaseListSerializer, CaseDetailSerializer, CaseCreateSerializer,
    CaseReviewActionSerializer, SuspectStatusSerializer,
    InterrogationSerializer, CaseResolutionSerializer,
)
from .permissions import (
    IsDetective, IsSergeant, IsJudge,
    IsDetectiveOrSergeant, IsDetectiveOrSergeantOrJudge, CanAddWitness
)

User = get_user_model()

def get_random_user_by_group(group_name):
    return (
        User.objects
        .filter(groups__name=group_name)
        .order_by("?")
        .first()
    )

class CaseCreateView(generics.CreateAPIView):
    """
    POST /api/cases/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseCreateSerializer

    def perform_create(self, serializer):
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))
        creation_method = serializer.validated_data.get("creation_method")

        if creation_method == Case.CreationMethod.COMPLAINT:
            if "Complainant" not in user_groups:
                raise PermissionDenied(
                    "Only complainants can create cases via complaint."
                )
            Complainant.objects.create(case=serializer.instance, user=user)
            initial_status = Case.Status.AWAITING_VALIDATION

        elif creation_method == Case.CreationMethod.CRIME_SCENE:
            allowed = {
                "Police chief",
                "Captain",
                "Sergeant",
                "Detective",
                "Police Officer",
            }
            if not user_groups.intersection(allowed):
                raise PermissionDenied(
                    "You do not have permission to create crime scene cases."
                )

            if "Police chief" in user_groups:
                initial_status = Case.Status.OPEN
            else:
                initial_status = Case.Status.AWAITING_VALIDATION

        else:
            initial_status = Case.Status.AWAITING_VALIDATION

        serializer.save(
            registered_by=user,
            status=initial_status
        )

class CaseListView(generics.ListAPIView):
    """
    GET /api/cases/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseListSerializer

    def get_queryset(self):
        user = self.request.user
        user_groups = set(user.groups.values_list("name", flat=True))

        police_roles = {
            'Police Chief',
            'Captain',
            'Sergeant',
            'Detective',
            'Police Officer',
            'Cadet',
        }

        if user_groups.intersection(police_roles):
            return Case.objects.all().order_by('-created_at')

        if 'Complainant' in user_groups:
            return Case.objects.filter(
                registered_by=user
            ).order_by('-created_at')

        return Case.objects.none()

class CaseValidationReviewListView(generics.ListAPIView):
    """
    GET /api/cases/case-validation-reviews/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseValidationReviewListSerializer

    def get_queryset(self):
        user = self.request.user
        return CaseValidationReview.objects.filter(
            Q(source=user) | Q(destination=user)
        ).order_by("-created_at")

class CaseValidationReviewCreateView(generics.CreateAPIView):
    """
    POST /api/cases/case-validation-reviews/
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseValidationReviewCreateSerializer

    def perform_create(self, serializer):
        user = self.request.user
        review_case = serializer.validated_data["case"]
        destination = serializer.validated_data.get("destination")

        user_groups = set(user.groups.values_list("name", flat=True))

        if destination is None:
            if "Complainant" in user_groups:
                destination = get_random_user_by_group("Cadet")

            elif "Cadet" in user_groups:
                destination = get_random_user_by_group("Police Officer")

            elif user_groups.intersection(
                {"Police Officer", "Sergeant", "Captain", "Police Chief"}
            ):
                # Officer responding → send back to cadet
                destination = get_random_user_by_group("Cadet")

            else:
                raise PermissionDenied("Invalid role for review creation.")

        review = serializer.save(
            source=user,
            destination=destination,
        )

        complainant = review_case.registered_by

        rejection_count = CaseValidationReview.objects.filter(
            case=review_case,
            destination=complainant,
            validated=False,
        ).count()

        if rejection_count >= 3:
            review_case.status = Case.Status.INVALIDATED
            review_case.save(update_fields=["status"])

class CaseValidationReviewValidateView(generics.UpdateAPIView):
    """
    PATCH /api/cases/case-validation-review/<id>/
    """
    http_method_names = ["patch"]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CaseValidationReviewUpdateSerializer
    queryset = CaseValidationReview.objects.all()

    def perform_update(self, serializer):
        user = self.request.user
        review = self.get_object()
        user_groups = set(user.groups.values_list("name", flat=True))

        if not user_groups.intersection(
            {"Police Officer", "Sergeant", "Captain", "Police Chief"}
        ):
            raise PermissionDenied("Only police officers can validate cases.")

        serializer.save(validated=True, resolved=True)

        review.case.status = Case.Status.OPEN
        review.case.save(update_fields=["status"])

class CaseWitnessCreateView(generics.CreateAPIView):
    """
    POST /api/cases/witnesses/
    """
    permission_classes = [permissions.CanAddWitness]
    serializer_class = CaseWitnessCreateSerializer
    queryset = CaseWitness.objects.all()


class CaseWitnessListView(generics.ListAPIView):
    """
    GET /api/cases/<pk>/witnesses/
    """
    permission_classes = [permissions.CanAddWitness]
    serializer_class = CaseWitnessCreateSerializer

    def get_queryset(self):
        case_pk = self.kwargs["pk"]
        return CaseWitness.objects.filter(case_id=case_pk)
