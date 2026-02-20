"""
Xavfsizlik log modeli va Analytics
"""

from django.db import models
from django.conf import settings


class SecurityLog(models.Model):
    """Xavfsizlik hodisalarini qayd etish"""

    class Action(models.TextChoices):
        LOGIN = 'login', 'Kirish'
        LOGOUT = 'logout', 'Chiqish'
        LOGIN_FAILED = 'login_failed', 'Muvaffaqiyatsiz kirish'
        VIDEO_ACCESS = 'video_access', 'Video ko\'rish'
        VIDEO_UPLOAD = 'video_upload', 'Video yuklash'
        USER_CREATED = 'user_created', 'Foydalanuvchi yaratildi'
        USER_BLOCKED = 'user_blocked', 'Foydalanuvchi bloklandi'
        USER_UNBLOCKED = 'user_unblocked', 'Foydalanuvchi blokdan chiqarildi'
        ADMIN_ACTION = 'admin_action', 'Admin harakat'
        SUSPICIOUS = 'suspicious', 'Shubhali harakat'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_logs',
        verbose_name='Foydalanuvchi',
    )
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        verbose_name='Harakat turi',
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP manzil',
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name='Brauzer ma\'lumoti',
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Qo\'shimcha ma\'lumot',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Vaqt',
    )

    class Meta:
        db_table = 'security_logs'
        verbose_name = 'Xavfsizlik log'
        verbose_name_plural = 'Xavfsizlik loglar'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        username = self.user.username if self.user else 'Noma\'lum'
        return f"[{self.created_at}] {username}: {self.get_action_display()}"
