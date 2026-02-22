# cases/admin.py
from django.contrib import admin
from .models import Case, Complainant, CaseWitness, CaseSuspect, SuspectReviewAction


class ComplainantInline(admin.TabularInline):
    model = Complainant
    extra = 0
    raw_id_fields = ('user',)


class CaseWitnessInline(admin.TabularInline):
    model = CaseWitness
    extra = 0


class CaseSuspectInline(admin.TabularInline):
    model = CaseSuspect
    extra = 0
    raw_id_fields = ('suspect',)
    readonly_fields = ('arrest_warrant_issued_at',)


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'crime_level', 'status', 'creation_method', 'assigned_detective', 'assigned_sergeant', 'created_at')
    list_filter = ('crime_level', 'status', 'creation_method')
    search_fields = ('title', 'description', 'location')
    raw_id_fields = ('registered_by', 'assigned_detective', 'assigned_sergeant')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ComplainantInline, CaseWitnessInline, CaseSuspectInline]
    fieldsets = (
        ('Basic Info', {'fields': ('title', 'description', 'crime_level', 'status', 'creation_method')}),
        ('Location & Time', {'fields': ('location', 'incident_datetime')}),
        ('Assignment', {'fields': ('registered_by', 'assigned_detective', 'assigned_sergeant')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

@admin.register(CaseSuspect)
class CaseSuspectAdmin(admin.ModelAdmin):
    list_display = ('id', 'suspect', 'case', 'arrest_status', 'detective_guilt_score', 'sergeant_guilt_score')
    list_filter = ('arrest_status',)
    search_fields = ('suspect__username', 'suspect__national_id')
    raw_id_fields = ('suspect', 'case')
    readonly_fields = ('arrest_warrant_issued_at',)


@admin.register(SuspectReviewAction)
class SuspectReviewActionAdmin(admin.ModelAdmin):
    list_display = ('id', 'source', 'source_role', 'destination', 'destination_role', 'validated')
    list_filter = ('validated',)
    raw_id_fields = ('source', 'destination')
