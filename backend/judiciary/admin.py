# judiciary/admin.py
from django.contrib import admin
from .models import Trial, Punishment


class PunishmentInline(admin.StackedInline):
    model = Punishment
    extra = 0
    readonly_fields = ('recorded_at',)


@admin.register(Trial)
class TrialAdmin(admin.ModelAdmin):
    list_display = ('id', 'case', 'judge', 'verdict', 'held_at', 'concluded_at')
    list_filter = ('verdict',)
    search_fields = ('case__title', 'judge__username')
    raw_id_fields = ('case', 'judge')
    readonly_fields = ('held_at',)
    filter_horizontal = ('involved_officers',) if hasattr(Trial, 'involved_officers') else ()
    inlines = [PunishmentInline]


@admin.register(Punishment)
class PunishmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'trial', 'title', 'recorded_at')
    search_fields = ('title', 'explanation')
    readonly_fields = ('recorded_at',)
