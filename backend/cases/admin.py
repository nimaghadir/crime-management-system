from django.contrib import admin

from .models import Case, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "level", "created_by", "assigned_to")
    list_filter = ("status", "level")
    search_fields = ("title",)

# Register your models here.
