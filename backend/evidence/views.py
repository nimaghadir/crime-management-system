from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import TestimonyEvidence
from .serializers import TestimonyEvidenceSerializer
from .permissions import IsCop, IsCopOrJudgeOrAdmin


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
