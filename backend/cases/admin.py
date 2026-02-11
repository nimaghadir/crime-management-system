from django.contrib import admin

from .models import Case, CaseHistory, Complaint, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "level", "created_by", "assigned_to")
    list_filter = ("status", "level")
    search_fields = ("title",)


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "complainant", "case")
    list_filter = ("status",)
    search_fields = ("title",)


@admin.register(CaseHistory)
class CaseHistoryAdmin(admin.ModelAdmin):
    list_display = ("case", "actor", "created_at")
    list_filter = ("case",)

# Register your models here.
