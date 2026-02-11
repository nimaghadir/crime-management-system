from django.contrib import admin

from .models import InvestigationAction, Note, Suspect


@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    list_display = ("name", "case", "status", "score")
    list_filter = ("status",)
    search_fields = ("name", "national_id")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "author", "pinned", "order_index")
    list_filter = ("pinned",)


@admin.register(InvestigationAction)
class InvestigationActionAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "action_type", "performed_by", "created_at")

# Register your models here.
