from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import TestimonyEvidence, BiologicalEvidence, VehicleEvidence
from .serializers import TestimonyEvidenceSerializer,  BiologicalEvidenceSerializer, BiologicalEvidenceReviewSerializer, VehicleEvidenceSerializer
from .permissions import IsCop, IsCopOrJudgeOrAdmin, IsCoroner


class TestimonyEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = TestimonyEvidenceSerializer

    def get_queryset(self):
        return TestimonyEvidence.objects.select_related('case', 'submitter', 'witness')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(submitter=self.request.user)


class TestimonyEvidenceDetailView(generics.RetrieveAPIView):
    serializer_class = TestimonyEvidenceSerializer
    queryset = TestimonyEvidence.objects.select_related('case', 'submitter', 'witness')
    permission_classes = [IsAuthenticated, IsCopOrJudgeOrAdmin]


############# Biological evidence

class BiologicalEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = BiologicalEvidenceSerializer

    def get_queryset(self):
        return BiologicalEvidence.objects.prefetch_related('images').select_related('case', 'submitter')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(submitter=self.request.user)


class BiologicalEvidenceDetailView(generics.RetrieveUpdateAPIView):
    queryset = BiologicalEvidence.objects.prefetch_related('images').select_related('case', 'submitter')
    http_method_names = ['get', 'patch']

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return BiologicalEvidenceReviewSerializer
        return BiologicalEvidenceSerializer

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsCoroner()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())


class VehicleEvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleEvidenceSerializer

    def get_queryset(self):
        return VehicleEvidence.objects.select_related('case', 'submitter')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsCop()]
        return [IsAuthenticated(), IsCopOrJudgeOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(submitter=self.request.user)


class VehicleEvidenceDetailView(generics.RetrieveAPIView):
    serializer_class = VehicleEvidenceSerializer
    queryset = VehicleEvidence.objects.select_related('case', 'submitter')
    permission_classes = [IsAuthenticated, IsCopOrJudgeOrAdmin]