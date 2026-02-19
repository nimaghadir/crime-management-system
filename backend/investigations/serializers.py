from rest_framework import serializers

from .models import Note, Suspect


class SuspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suspect
        fields = (
            "id",
            "case",
            "name",
            "national_id",
            "status",
            "score",
            "created_at",
        )
        read_only_fields = ("id", "score", "created_at")

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Name cannot be empty.")
        return cleaned


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = (
            "id",
            "case",
            "author",
            "text",
            "order_index",
            "pinned",
            "created_at",
        )
        read_only_fields = ("id", "author", "created_at")

    def validate_text(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Text cannot be empty.")
        return cleaned

    def validate(self, attrs):
        if self.instance is not None and "case" in attrs and attrs["case"] != self.instance.case:
            raise serializers.ValidationError({"case": "Case cannot be changed."})
        return attrs
