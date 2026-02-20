"""
Accounts URL yo'llari
Slash siz — Next.js proxy slash larni olib tashlaydi
"""

from django.urls import path, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Autentifikatsiya (slash bilan va slash siz)
    re_path(r'^auth/login/?$', views.LoginView.as_view(), name='login'),
    re_path(r'^auth/logout/?$', views.LogoutView.as_view(), name='logout'),
    re_path(r'^auth/refresh/?$', TokenRefreshView.as_view(), name='token-refresh'),

    # Profil
    re_path(r'^profile/?$', views.ProfileView.as_view(), name='profile'),
    re_path(r'^profile/avatar/?$', views.AvatarUploadView.as_view(), name='avatar-upload'),

    # Admin - Foydalanuvchilar boshqaruvi
    re_path(r'^admin/users/?$', views.AdminUserListCreateView.as_view(), name='admin-users'),
    re_path(r'^admin/users/(?P<pk>\d+)/?$', views.AdminUserDetailView.as_view(), name='admin-user-detail'),
    re_path(r'^admin/users/(?P<pk>\d+)/block/?$', views.AdminUserBlockView.as_view(), name='admin-user-block'),
    
    # Qurilmalar boshqaruvi
    re_path(r'^auth/force-disconnect/?$', views.ForceDisconnectDeviceView.as_view(), name='force-disconnect'),
    re_path(r'^profile/devices/(?P<pk>\d+)/?$', views.DeviceDeleteView.as_view(), name='device-delete'),
]
