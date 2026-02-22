# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('LAPD Identification', {'fields': ('phone_number', 'national_id')}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('LAPD Identification', {
            'fields': ('email', 'phone_number', 'national_id'),
        }),
    )
    
    list_display = ('username', 'email', 'phone_number', 'national_id', 'is_staff', 'is_active')
    
    search_fields = ('username', 'email', 'phone_number', 'national_id')
