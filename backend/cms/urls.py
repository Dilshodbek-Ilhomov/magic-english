from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PublicLandingPageView, AdminLandingPageViewSet

router = DefaultRouter()
router.register(r'sections', AdminLandingPageViewSet)

urlpatterns = [
    path('landing/', PublicLandingPageView.as_view(), name='public-landing'),
    path('admin/', include(router.urls)),
]
