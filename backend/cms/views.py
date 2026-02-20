from rest_framework import viewsets, permissions, generics
from rest_framework.response import Response
from .models import LandingPageSection
from .serializers import LandingPageSectionSerializer

class PublicLandingPageView(generics.ListAPIView):
    """
    Public Endpoint: Get visible Landing Page Sections in order
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = LandingPageSectionSerializer

    def get_queryset(self):
        return LandingPageSection.objects.filter(is_visible=True).order_by('order')

class AdminLandingPageViewSet(viewsets.ModelViewSet):
    """
    Admin Endpoint: Manage Landing Page Sections (CRUD)
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    queryset = LandingPageSection.objects.all()
    serializer_class = LandingPageSectionSerializer
