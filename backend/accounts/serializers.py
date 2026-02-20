"""
Accounts serializers - Foydalanuvchi uchun serializerlar
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserDevice


class LoginSerializer(serializers.Serializer):
    """Login uchun serializer"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)
    device_id = serializers.CharField(max_length=255, required=False)
    device_name = serializers.CharField(max_length=255, required=False)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if user is None:
            raise serializers.ValidationError('Login yoki parol noto\'g\'ri')
        if user.is_blocked:
            raise serializers.ValidationError('Akkauntingiz bloklangan. Admin bilan bog\'laning.')
        if not user.is_active:
            raise serializers.ValidationError('Akkaunt faol emas')
        data['user'] = user
        return data




class UserDeviceSerializer(serializers.ModelSerializer):
    """Qurilmalar serializeri"""
    class Meta:
        model = UserDevice
        fields = ['id', 'device_name', 'last_login', 'ip_address']

class UserProfileSerializer(serializers.ModelSerializer):
    """Foydalanuvchi profil ma'lumotlari"""
    progress_stats = serializers.SerializerMethodField()
    devices = UserDeviceSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'avatar', 'preferred_language', 'is_blocked',
            'last_login', 'created_at', 'progress_stats', 'daily_limit',
            'recent_progress', 'devices'
        ]
        read_only_fields = ['id', 'username', 'role', 'is_blocked', 'created_at', 'daily_limit']

    def get_progress_stats(self, obj):
        """Foydalanuvchi statistikasini qaytaradi"""
        progress = obj.video_progress.all()
        total = progress.count()
        completed = progress.filter(completed=True).count()
        return {
            'total_videos_started': total,
            'total_videos_completed': completed,
            'completion_rate': round((completed / total * 100) if total > 0 else 0),
            'daily_streak': obj.daily_streak,
        }


class UserUpdateSerializer(serializers.ModelSerializer):
    """Profil yangilash serializer"""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'preferred_language', 'avatar']


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Admin: yangi foydalanuvchi yaratish"""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'first_name', 'last_name',
            'email', 'role', 'preferred_language', 'allowed_courses', 'daily_limit',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        allowed_courses = validated_data.pop('allowed_courses', [])
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if allowed_courses:
            user.allowed_courses.set(allowed_courses)
        return user


class AdminUserListSerializer(serializers.ModelSerializer):
    """Admin: foydalanuvchilar ro'yxati"""
    videos_watched = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'avatar', 'is_blocked', 'is_active',
            'preferred_language', 'last_login', 'last_login_ip',
            'created_at', 'videos_watched', 'last_activity', 'allowed_courses', 'daily_limit',
        ]

    def get_videos_watched(self, obj):
        if hasattr(obj, 'videos_watched_count'):
            return obj.videos_watched_count
        return obj.video_progress.filter(completed=True).count()

    def get_last_activity(self, obj):
        if hasattr(obj, 'last_activity_date'):
            return obj.last_activity_date or obj.last_login
        last = obj.video_progress.order_by('-last_watched').first()
        return last.last_watched if last else obj.last_login
