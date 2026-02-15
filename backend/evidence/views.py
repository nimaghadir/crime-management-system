from rest_framework import mixins, viewsets

from .models import Evidence
from .serializers import EvidenceSerializer


class EvidenceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EvidenceSerializer
    queryset = Evidence.objects.select_related("case", "uploaded_by").order_by(
        "-created_at", "-id"
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        case_id = self.request.query_params.get("case")
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user, status=Evidence.Status.PENDING)
