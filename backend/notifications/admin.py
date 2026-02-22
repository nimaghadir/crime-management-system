# notifications/admin.py
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'notif_type', 'title', 'is_read', 'created_at')
    list_filter = ('notif_type', 'is_read')
    search_fields = ('recipient__username', 'title', 'body')
    raw_id_fields = ('recipient',)
    readonly_fields = ('created_at', 'read_at')
