"""
Accounts views - Login, Logout, Profil boshqarish, Admin User CRUD
"""

import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Count, Q

from .models import User, UserDevice
from .serializers import (
    LoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    AdminUserCreateSerializer,
    AdminUserListSerializer,
)
from .permissions import IsAdmin, IsNotBlocked
from .utils import log_security_event, get_client_ip

logger = logging.getLogger('accounts')


class LoginView(APIView):
    """
    Foydalanuvchi kirish (JWT token olish)
    POST /api/auth/login/
    """
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        device_id = serializer.validated_data.get('device_id')
        device_name = serializer.validated_data.get('device_name', 'Noma\'lum qurilma')

        # Qurilmalar limiti (faqat studentlar uchun)
        if user.role != 'admin' and device_id:
            devices = user.devices.all()
            existing_device = devices.filter(device_id=device_id).first()
            
            if not existing_device and devices.count() >= 2:
                from .serializers import UserDeviceSerializer
                return Response({
                    'success': False,
                    'error': {
                        'code': 'DEVICE_LIMIT_EXCEEDED',
                        'message': 'Qurilmalar limiti to\'ldi (maksimum 2 ta). Iltimos, birorta qurilmani o\'chirib qayta urinib ko\'ring.',
                        'devices': UserDeviceSerializer(devices, many=True).data
                    }
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Qurilmani saqlash/yangilash
            if existing_device:
                existing_device.device_name = device_name
                existing_device.ip_address = get_client_ip(request)
                existing_device.user_agent = request.META.get('HTTP_USER_AGENT', '')
                existing_device.save()
            else:
                UserDevice.objects.create(
                    user=user,
                    device_id=device_id,
                    device_name=device_name,
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )

        refresh = RefreshToken.for_user(user)

        # IP va oxirgi login yangilash
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=['last_login_ip'])

        # Xavfsizlik logiga yozish
        log_security_event(user, 'login', request)

        logger.info(f"Foydalanuvchi kirdi: {user.username}")

        return Response({
            'success': True,
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserProfileSerializer(user).data,
            }
        })


class LogoutView(APIView):
    """
    Foydalanuvchi chiqish (refresh tokenni qora ro'yxatga qo'shish)
    POST /api/auth/logout/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            log_security_event(request.user, 'logout', request)
            logger.info(f"Foydalanuvchi chiqdi: {request.user.username}")

            return Response({
                'success': True,
                'message': 'Muvaffaqiyatli chiqildi',
            })
        except Exception:
            return Response({
                'success': True,
                'message': 'Chiqish amalga oshirildi',
            })


class ProfileView(APIView):
    """
    Foydalanuvchi profili
    GET /api/profile/  - profilni ko'rish
    PUT /api/profile/  - profilni yangilash
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def put(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'success': True,
            'data': UserProfileSerializer(request.user).data,
            'message': 'Profil yangilandi',
        })


class AvatarUploadView(APIView):
    """
    Avatar rasm yuklash
    POST /api/profile/avatar/
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response({
                'success': False,
                'error': {'message': 'Avatar rasm tanlanmagan'},
            }, status=status.HTTP_400_BAD_REQUEST)

        request.user.avatar = request.FILES['avatar']
        request.user.save(update_fields=['avatar'])

        return Response({
            'success': True,
            'data': {'avatar': request.user.avatar.url},
            'message': 'Avatar yangilandi',
        })


# ===================== ADMIN VIEWS =====================


class AdminUserListCreateView(APIView):
    """
    Admin: Foydalanuvchilar ro'yxati va yangi foydalanuvchi yaratish
    GET  /api/admin/users/
    POST /api/admin/users/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Count, Max, Q
        users = User.objects.annotate(
            videos_watched_count=Count('video_progress', filter=Q(video_progress__completed=True)),
            last_activity_date=Max('video_progress__last_watched')
        ).prefetch_related('allowed_courses').order_by('-created_at')

        # Qidiruv
        search = request.query_params.get('search', '')
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        # Rol bo'yicha filtr
        role = request.query_params.get('role', '')
        if role:
            users = users.filter(role=role)

        # Bloklangan bo'yicha filtr
        blocked = request.query_params.get('blocked', '')
        if blocked.lower() == 'true':
            users = users.filter(is_blocked=True)

        serializer = AdminUserListSerializer(users, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': users.count(),
        })

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        log_security_event(
            request.user, 'user_created', request,
            {'created_user': user.username, 'role': user.role},
        )
        logger.info(f"Admin {request.user.username} yangi foydalanuvchi yaratdi: {user.username}")

        return Response({
            'success': True,
            'data': AdminUserListSerializer(user).data,
            'message': f'Foydalanuvchi {user.username} yaratildi',
        }, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    """
    Admin: Foydalanuvchini tahrirlash, o'chirish, bloklash
    GET    /api/admin/users/<id>/
    PUT    /api/admin/users/<id>/
    DELETE /api/admin/users/<id>/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response({
                'success': False,
                'error': {'message': 'Foydalanuvchi topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminUserListSerializer(user)
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def put(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response({
                'success': False,
                'error': {'message': 'Foydalanuvchi topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        # Parol yangilash
        new_password = request.data.get('password')
        if new_password:
            user.set_password(new_password)

        if 'allowed_courses' in request.data:
            user.allowed_courses.set(request.data['allowed_courses'])

        # Boshqa maydonlar
        for field in ['first_name', 'last_name', 'email', 'role', 'preferred_language']:
            if field in request.data:
                setattr(user, field, request.data[field])

        user.save()

        return Response({
            'success': True,
            'data': AdminUserListSerializer(user).data,
            'message': f'{user.username} yangilandi',
        })

    def delete(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response({
                'success': False,
                'error': {'message': 'Foydalanuvchi topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({
                'success': False,
                'error': {'message': 'O\'zingizni o\'chira olmaysiz'},
            }, status=status.HTTP_400_BAD_REQUEST)

        username = user.username
        user.delete()

        return Response({
            'success': True,
            'message': f'{username} o\'chirildi',
        })


class AdminUserBlockView(APIView):
    """
    Admin: Foydalanuvchini bloklash/blokdan chiqarish
    PATCH /api/admin/users/<id>/block/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Foydalanuvchi topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({
                'success': False,
                'error': {'message': 'O\'zingizni bloklashingiz mumkin emas'},
            }, status=status.HTTP_400_BAD_REQUEST)

        user.is_blocked = not user.is_blocked
        user.save(update_fields=['is_blocked'])

        action = 'user_blocked' if user.is_blocked else 'user_unblocked'
        log_security_event(request.user, action, request, {'target_user': user.username})

        status_text = 'bloklandi' if user.is_blocked else 'blokdan chiqarildi'
        return Response({
            'success': True,
            'data': {'is_blocked': user.is_blocked},
            'message': f'{user.username} {status_text}',
        })


class DeviceDeleteView(APIView):
    """Qurilmani uzish (Profil orqali)"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            device = UserDevice.objects.get(pk=pk, user=request.user)
            name = device.device_name
            device.delete()
            return Response({
                'success': True,
                'message': f'{name} muvaffaqiyatli uzildi'
            })
        except UserDevice.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Qurilma topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)


class ForceDisconnectDeviceView(APIView):
    """Limit to'lganda qurilmani majburan uzish"""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate
        username = request.data.get('username')
        password = request.data.get('password')
        device_pk = request.data.get('device_pk')

        user = authenticate(username=username, password=password)
        if not user:
            return Response({
                'success': False,
                'error': {'message': 'Login yoki parol noto\'g\'ri'}
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            device = UserDevice.objects.get(pk=device_pk, user=user)
            device.delete()
            return Response({
                'success': True,
                'message': 'Qurilma uzildi. Endi qayta login qilishingiz mumkin.'
            })
        except UserDevice.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Qurilma topilmadi'}
            }, status=status.HTTP_404_NOT_FOUND)
