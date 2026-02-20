"""
Courses serializers - Video va progress uchun serializerlar
"""

from rest_framework import serializers
from .models import Course, Video, VideoProgress, Question, Choice


class ChoiceSerializer(serializers.ModelSerializer):
    """Variant serializer"""
    text = serializers.CharField(write_only=True, required=False)
    display_text = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Choice
        fields = ['id', 'text', 'display_text', 'is_correct', 'text_uz', 'text_ru', 'text_en']
        extra_kwargs = {
            'text_uz': {'required': False},
            'text_ru': {'required': False},
            'text_en': {'required': False},
        }

    def get_display_text(self, obj):
        request = self.context.get('request')
        lang = request.query_params.get('lang', 'uz') if request else 'uz'
        if lang == 'ru': return obj.text_ru or obj.text_uz
        if lang == 'en': return obj.text_en or obj.text_uz
        return obj.text_uz

    def create(self, validated_data):
        text = validated_data.pop('text', None)
        if text:
            if not validated_data.get('text_uz'): validated_data['text_uz'] = text
            if not validated_data.get('text_ru'): validated_data['text_ru'] = text
            if not validated_data.get('text_en'): validated_data['text_en'] = text
        return super().create(validated_data)

    def update(self, instance, validated_data):
        text = validated_data.pop('text', None)
        if text:
            if not validated_data.get('text_uz'): validated_data['text_uz'] = text
            if not validated_data.get('text_ru'): validated_data['text_ru'] = text
            if not validated_data.get('text_en'): validated_data['text_en'] = text
        return super().update(instance, validated_data)


class QuestionSerializer(serializers.ModelSerializer):
    """Savol serializer"""
    text = serializers.CharField(write_only=True, required=False)
    display_text = serializers.SerializerMethodField(read_only=True)
    choices = ChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = [
            'id', 'video', 'question_type', 'text', 'display_text', 'choices',
            'text_uz', 'text_ru', 'text_en',
            'correct_answer_uz', 'correct_answer_ru', 'correct_answer_en'
        ]
        extra_kwargs = {
            'text_uz': {'required': False},
            'text_ru': {'required': False},
            'text_en': {'required': False},
        }

    def get_display_text(self, obj):
        request = self.context.get('request')
        lang = request.query_params.get('lang', 'uz') if request else 'uz'
        if lang == 'ru': return obj.text_ru or obj.text_uz
        if lang == 'en': return obj.text_en or obj.text_uz
        return obj.text_uz

    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        text = validated_data.pop('text', None)
        
        if text:
            if not validated_data.get('text_uz'): validated_data['text_uz'] = text
            if not validated_data.get('text_ru'): validated_data['text_ru'] = text
            if not validated_data.get('text_en'): validated_data['text_en'] = text
            
        question = Question.objects.create(**validated_data)
        
        for choice_data in choices_data:
            c_text = choice_data.get('text') or choice_data.get('text_uz', '')
            c_data = {
                'question': question,
                'is_correct': choice_data.get('is_correct', False),
                'text_uz': choice_data.get('text_uz') or c_text,
                'text_ru': choice_data.get('text_ru') or c_text,
                'text_en': choice_data.get('text_en') or c_text,
            }
            # Only create if there's some text
            if c_data['text_uz']:
                Choice.objects.create(**c_data)
            
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        text = validated_data.pop('text', None)

        if text:
            instance.text_uz = validated_data.get('text_uz', text)
            instance.text_ru = validated_data.get('text_ru', text)
            instance.text_en = validated_data.get('text_en', text)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if choices_data is not None:
            # Simple approach: delete old choices and create new ones
            # For a more robust approach, sync them by ID
            instance.choices.all().delete()
            for choice_data in choices_data:
                c_text = choice_data.get('text') or choice_data.get('text_uz', '')
                Choice.objects.create(
                    question=instance,
                    is_correct=choice_data.get('is_correct', False),
                    text_uz=choice_data.get('text_uz') or c_text,
                    text_ru=choice_data.get('text_ru') or c_text,
                    text_en=choice_data.get('text_en') or c_text,
                )
        
        return instance


class CourseSerializer(serializers.ModelSerializer):
    """Kurs serializer"""
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 
            'title_uz', 'title_ru', 'title_en',
            'description_uz', 'description_ru', 'description_en',
            'course_type', 'custom_course_type', 'thumbnail', 
            'telegram_group_url', 'daily_limit', 'allowed_days', 'created_at'
        ]

    def get_title(self, obj):
        request = self.context.get('request')
        lang = request.query_params.get('lang', 'uz') if request else 'uz'
        return obj.get_title(lang)

    def get_description(self, obj):
        request = self.context.get('request')
        lang = request.query_params.get('lang', 'uz') if request else 'uz'
        return obj.get_description(lang)


class VideoListSerializer(serializers.ModelSerializer):
    """Video ro'yxat serializer (qisqacha ma'lumot)"""
    progress = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            'id', 'title_uz', 'title_ru', 'title_en',
            'description_uz', 'description_ru', 'description_en',
            'level', 'thumbnail', 'duration_seconds',
            'views_count', 'order_index', 'is_published',
            'created_at', 'progress', 'course_title', 'course'
        ]

    def get_progress(self, obj):
        """Joriy foydalanuvchining progressini qaytaradi (Optimized)"""
        # 1. Agar viewda prefetch_related qilingan bo'lsa (user_progress list)
        if hasattr(obj, 'user_progress'):
            progress = obj.user_progress[0] if obj.user_progress else None
            if progress:
                return {
                    'watched_seconds': progress.watched_seconds,
                    'completed': progress.completed,
                    'progress_percent': progress.progress_percent,
                }
            return None

        # 2. Fallback (N+1 muammosi bo'lishi mumkin, lekin xavfsiz)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = VideoProgress.objects.get(
                    user=request.user,
                    video=obj,
                )
                return {
                    'watched_seconds': progress.watched_seconds,
                    'completed': progress.completed,
                    'progress_percent': progress.progress_percent,
                }
            except VideoProgress.DoesNotExist:
                pass
        return None

    def get_course_title(self, obj):
        if obj.course:
            request = self.context.get('request')
            lang = request.query_params.get('lang', 'uz') if request else 'uz'
            return obj.course.get_title(lang)
        return None


class VideoProgressSerializer(serializers.ModelSerializer):
    """Video progress update serializer"""
    class Meta:
        model = VideoProgress
        fields = ['watched_seconds', 'completed']
        read_only_fields = ['user', 'video', 'last_watched']

    def validate_watched_seconds(self, value):
        if value < 0:
            raise serializers.ValidationError("Watched time cannot be negative")
        return value


class VideoDetailSerializer(serializers.ModelSerializer):
    """Video to'liq ma'lumot serializer"""
    progress = serializers.SerializerMethodField()
    questions = QuestionSerializer(many=True, read_only=True)
    next_video_id = serializers.SerializerMethodField()
    prev_video_id = serializers.SerializerMethodField()
    telegram_group_url = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            'id', 'title_uz', 'title_ru', 'title_en',
            'description_uz', 'description_ru', 'description_en',
            'level', 'thumbnail', 'duration_seconds',
            'views_count', 'order_index', 'is_published',
            'created_at', 'updated_at', 'progress',
            'questions', 'next_video_id', 'prev_video_id', 'course',
            'telegram_group_url',
            'video_360p', 'video_480p', 'video_720p', 'video_1080p',
            'video_1440p', 'video_2160p'
        ]

    def get_telegram_group_url(self, obj):
        if obj.course:
            return obj.course.telegram_group_url
        return None

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = VideoProgress.objects.get(user=request.user, video=obj)
                return {
                    'watched_seconds': progress.watched_seconds,
                    'completed': progress.completed,
                    'progress_percent': progress.progress_percent,
                }
            except VideoProgress.DoesNotExist:
                pass
        return None

    def get_next_video_id(self, obj):
        if not obj.course:
            return None
        next_vid = Video.objects.filter(
            course=obj.course, 
            order_index__gt=obj.order_index,
            is_published=True
        ).order_by('order_index').first()
        return next_vid.id if next_vid else None

    def get_prev_video_id(self, obj):
        if not obj.course:
            return None
        prev_vid = Video.objects.filter(
            course=obj.course, 
            order_index__lt=obj.order_index,
            is_published=True
        ).order_by('-order_index').first()
        return prev_vid.id if prev_vid else None


class AdminVideoSerializer(serializers.ModelSerializer):
    """Admin: video qo'shish/tahrirlash serializer"""
    total_views = serializers.SerializerMethodField()
    unique_viewers = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = '__all__'

    def get_total_views(self, obj):
        return obj.views_count

    def get_unique_viewers(self, obj):
        if hasattr(obj, 'unique_viewers_count'):
            return obj.unique_viewers_count
        return obj.progress_records.values('user').distinct().count()
