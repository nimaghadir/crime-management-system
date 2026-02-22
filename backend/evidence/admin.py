# evidence/admin.py
from django.contrib import admin
from .models import (
    TestimonyEvidence, TestimonyMediaFile,
    BiologicalEvidence, BiologicalEvidenceImage,
    VehicleEvidence, IdentificationDocument, OtherEvidence,
)


class TestimonyMediaFileInline(admin.TabularInline):
    model = TestimonyMediaFile
    extra = 1


class BiologicalEvidenceImageInline(admin.TabularInline):
    model = BiologicalEvidenceImage
    extra = 1


@admin.register(TestimonyEvidence)
class TestimonyEvidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'case', 'submitter', 'registered_at')
    search_fields = ('title', 'transcript')
    raw_id_fields = ('case', 'submitter')
    readonly_fields = ('registered_at',)
    inlines = [TestimonyMediaFileInline]


@admin.register(BiologicalEvidence)
class BiologicalEvidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'case', 'review_status', 'reviewed_by', 'registered_at')
    list_filter = ('review_status',)
    search_fields = ('title', 'doctor_notes', 'identity_db_notes')
    raw_id_fields = ('case', 'submitter', 'reviewed_by')
    readonly_fields = ('registered_at', 'reviewed_at')
    inlines = [BiologicalEvidenceImageInline]


@admin.register(VehicleEvidence)
class VehicleEvidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'case', 'model_name', 'color', 'license_plate', 'serial_number', 'registered_at')
    search_fields = ('title', 'model_name', 'license_plate', 'serial_number')
    raw_id_fields = ('case', 'submitter')
    readonly_fields = ('registered_at',)


@admin.register(IdentificationDocument)
class IdentificationDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'case', 'owner_name', 'registered_at')
    search_fields = ('title', 'owner_name')
    raw_id_fields = ('case', 'submitter')
    readonly_fields = ('registered_at',)


@admin.register(OtherEvidence)
class OtherEvidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'case', 'submitter', 'registered_at')
    search_fields = ('title',)
    raw_id_fields = ('case', 'submitter')
    readonly_fields = ('registered_at',)
