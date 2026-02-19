from rest_framework import mixins, viewsets

from .models import Note, Suspect
from .serializers import NoteSerializer, SuspectSerializer


class SuspectViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SuspectSerializer
    queryset = Suspect.objects.select_related("case").order_by("-created_at", "-id")

    def get_queryset(self):
        queryset = super().get_queryset()
        case_id = self.request.query_params.get("case")
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        return queryset


class NoteViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NoteSerializer
    queryset = Note.objects.select_related("case", "author").order_by("-created_at", "-id")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
