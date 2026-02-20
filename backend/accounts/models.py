"""
Foydalanuvchi modeli - Custom User model
Role tizimi: Admin va Student
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Platformaning asosiy foydalanuvchi modeli"""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        STUDENT = 'student', 'Student'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT,
        verbose_name='Rol',
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        verbose_name='Avatar rasm',
    )
    is_blocked = models.BooleanField(
        default=False,
        verbose_name='Bloklangan',
    )
    preferred_language = models.CharField(
        max_length=5,
        choices=[('uz', "O'zbek"), ('ru', 'Русский'), ('en', 'English')],
        default='uz',
        verbose_name='Tanlangan til',
    )
    two_factor_secret = models.CharField(
        max_length=32,
        null=True,
        blank=True,
        verbose_name='2FA maxfiy kalit',
    )
    two_factor_enabled = models.BooleanField(
        default=False,
        verbose_name='2FA yoqilgan',
    )
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Oxirgi login IP',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan sana')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Yangilangan sana')

    daily_streak = models.PositiveIntegerField(default=0, verbose_name='Aktivlik zanjiri (kun)')
    last_activity_date = models.DateField(null=True, blank=True, verbose_name='Oxirgi faoliyat sanasi')

    class Meta:
        db_table = 'users'
        verbose_name = 'Foydalanuvchi'
        verbose_name_plural = 'Foydalanuvchilar'
        ordering = ['-created_at']

    allowed_courses = models.ManyToManyField(
        'courses.Course',
        blank=True,
        verbose_name='Ruxsat etilgan kurslar',
        related_name='allowed_users'
    )
    daily_limit = models.IntegerField(
        default=0,
        verbose_name="Kunlik dars ko'rish limiti",
        help_text='0 = cheksiz'
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def recent_progress(self):
        """Oxirgi 3 ta ko'rilgan video progressi"""
        from courses.models import VideoProgress
        progress = VideoProgress.objects.filter(user=self).select_related('video', 'video__course').order_by('-last_watched')[:3]
        results = []
        for p in progress:
            results.append({
                'video_id': p.video.id,
                'video_title': p.video.title_en,
                'course_id': p.video.course.id if p.video.course else None,
                'course_title': p.video.course.title_en if p.video.course else 'Kategoriyasiz',
                'progress_percent': p.progress_percent,
                'thumbnail': p.video.thumbnail.url if p.video.thumbnail else None
            })
        return results

class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField(max_length=255, verbose_name='Qurilma ID')
    device_name = models.CharField(max_length=255, verbose_name='Qurilma nomi')
    last_login = models.DateTimeField(auto_now=True, verbose_name='Oxirgi faollik')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP manzili')
    user_agent = models.TextField(null=True, blank=True, verbose_name='User Agent')

    class Meta:
        db_table = 'user_devices'
        verbose_name = 'Qurilma'
        verbose_name_plural = 'Qurilmalar'
        unique_together = ('user', 'device_id')
        ordering = ['-last_login']

    def __str__(self):
        return f"{self.user.username} - {self.device_name}"
