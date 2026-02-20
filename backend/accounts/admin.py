"""
Django admin paneli konfiguratsiyasi
"""

from django.contrib import admin
from accounts.models import User
# from courses.models import Video, VideoProgress - Removed to avoid duplicate registration
from analytics.models import SecurityLog


@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'ip_address', 'created_at']
    list_filter = ['action']
    search_fields = ['user__username', 'ip_address']
    readonly_fields = ['user', 'action', 'ip_address', 'user_agent', 'metadata', 'created_at']
