from django.contrib import admin

from .models import Evidence, EvidenceAttachment


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "type", "status", "uploaded_by")
    list_filter = ("status", "type")


@admin.register(EvidenceAttachment)
class EvidenceAttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "evidence", "mime_type", "uploaded_by", "created_at")

# Register your models here.
