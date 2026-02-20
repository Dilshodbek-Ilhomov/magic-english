"""
Asosiy URL konfiguratsiyasi - Loyihaning barcha yo'llari
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class HealthCheckView(APIView):
    """Server salomatlik tekshiruvi"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'success': True,
            'message': 'Server ishlayapti ✨',
            'version': '1.0.0',
        })


urlpatterns = [
    # Root - frontendga yo'naltirish
    path('', lambda request: redirect('http://localhost:3000')),

    # Django admin (standart)
    path('django-admin/', admin.site.urls),

    # API yo'llari
    path('api/', include('accounts.urls')),
    path('api/', include('courses.urls')),
    path('api/', include('analytics.urls')),
    path('api/cms/', include('cms.urls')),

    # Server holati
    re_path(r'^api/health/?$', HealthCheckView.as_view(), name='health-check'),
]

# Development rejimida media fayllarni xizmat qilish
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
