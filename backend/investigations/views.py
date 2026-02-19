from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import InvestigationAction, Note, Suspect
from .serializers import (
    InvestigationActionSerializer,
    NoteReorderSerializer,
    NoteSerializer,
    StartInterrogationSerializer,
    SuspectSerializer,
)


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

    @action(detail=False, methods=["post"])
    @transaction.atomic
    def reorder(self, request):
        serializer = NoteReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        case = serializer.validated_data["case"]
        note_ids = serializer.validated_data["note_ids"]

        total_case_notes = Note.objects.filter(case=case).count()
        if total_case_notes != len(note_ids):
            raise ValidationError({"note_ids": "Provide all note IDs for this case."})

        notes = list(Note.objects.filter(case=case, id__in=note_ids))
        if len(notes) != len(note_ids):
            raise ValidationError({"note_ids": "Some note IDs do not belong to this case."})

        note_by_id = {note.id: note for note in notes}
        for index, note_id in enumerate(note_ids):
            note_by_id[note_id].order_index = index

        Note.objects.bulk_update(notes, ["order_index"])
        ordered_notes = Note.objects.filter(case=case).order_by("order_index", "id")
        return Response(NoteSerializer(ordered_notes, many=True).data, status=status.HTTP_200_OK)


class InvestigationActionViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = InvestigationActionSerializer
    queryset = InvestigationAction.objects.select_related("case", "performed_by").order_by(
        "-created_at", "-id"
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        case_id = self.request.query_params.get("case")
        if case_id:
            queryset = queryset.filter(case_id=case_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(performed_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="start-interrogation")
    @transaction.atomic
    def start_interrogation(self, request):
        input_serializer = StartInterrogationSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        case = input_serializer.validated_data["case"]
        suspect = input_serializer.validated_data["suspect"]
        note = input_serializer.validated_data.get("note")

        payload = {"suspect_id": suspect.id}
        if note:
            payload["note"] = note

        action_record = InvestigationAction.objects.create(
            case=case,
            action_type="start_interrogation",
            payload=payload,
            performed_by=request.user,
        )
        output_serializer = self.get_serializer(action_record)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
