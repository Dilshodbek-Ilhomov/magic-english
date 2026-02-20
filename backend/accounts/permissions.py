"""
Maxsus ruxsat (permission) sinflari
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Faqat admin foydalanuvchilar uchun"""
    message = 'Faqat administratorlar uchun ruxsat berilgan'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsNotBlocked(BasePermission):
    """Bloklangan foydalanuvchilarni rad etadi"""
    message = 'Akkauntingiz bloklangan'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and not request.user.is_blocked
        )


class IsAdminOrReadOnly(BasePermission):
    """Admin yozishi mumkin, boshqalar faqat o'qiy oladi"""

    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )
