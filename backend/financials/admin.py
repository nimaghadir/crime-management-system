# financials/admin.py
from django.contrib import admin
from .models import RewardTip


@admin.register(RewardTip)
class RewardTipAdmin(admin.ModelAdmin):
    list_display = ('id', 'submitter', 'case', 'status', 'reward_amount', 'claimed', 'submitted_at')
    list_filter = ('status', 'claimed')
    search_fields = ('submitter__username', 'submitter__national_id', 'unique_code')
    raw_id_fields = ('submitter', 'case', 'reviewing_officer')
    readonly_fields = ('submitted_at', 'claimed_at', 'detective_reviewed_at', 'officer_reviewed_at')
    fieldsets = (
        ('Tip Info', {'fields': ('submitter', 'case', 'content', 'status')}),
        ('Officer Review', {'fields': ('reviewing_officer', 'officer_reviewed_at', 'officer_notes')}),
        ('Detective Review', {'fields': ('detective_reviewed_at', 'detective_notes')}),
        ('Reward', {'fields': ('unique_code', 'reward_amount', 'claimed', 'claimed_at')}),
        ('Meta', {'fields': ('submitted_at',)}),
    )
