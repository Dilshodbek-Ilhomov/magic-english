"""
Analytics serializer
"""

from rest_framework import serializers
from .models import SecurityLog


class SecurityLogSerializer(serializers.ModelSerializer):
    """Xavfsizlik log serializer"""
    username = serializers.CharField(source='user.username', default='Noma\'lum')
    action_display = serializers.CharField(source='get_action_display')

    class Meta:
        model = SecurityLog
        fields = [
            'id', 'username', 'action', 'action_display',
            'ip_address', 'user_agent', 'metadata', 'created_at',
        ]
