from rest_framework import serializers
from .models import LandingPageSection

class LandingPageSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandingPageSection
        fields = '__all__'
