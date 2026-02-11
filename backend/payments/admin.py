from django.contrib import admin

from .models import PaymentRecord, Reward


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ("code", "amount", "case", "assigned_to", "issued")
    list_filter = ("issued",)
    search_fields = ("code",)


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "amount", "method", "status", "paid_by")
    list_filter = ("status", "method")

# Register your models here.
