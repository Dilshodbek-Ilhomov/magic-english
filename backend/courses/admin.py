from django.contrib import admin
from .models import Course, Video, Question, Choice, VideoProgress

class VideoInline(admin.StackedInline):
    model = Video
    extra = 1
    exclude = ('duration_seconds', 'views_count')

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 3

class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    # inlines = [ChoiceInline] # Nested inlines not supported by default

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title_en', 'course_type', 'created_at')
    list_filter = ('course_type',)
    search_fields = ('title_en', 'title_uz', 'title_ru')
    inlines = [VideoInline]

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('title_en', 'course', 'level', 'views_count', 'processing_status', 'is_published')
    list_filter = ('course', 'level', 'is_published', 'processing_status')
    search_fields = ('title_en', 'course__title_en')
    readonly_fields = ('duration_seconds', 'video_preview', 'available_qualities')
    inlines = [QuestionInline]
    
    fieldsets = (
        ('Asosiy', {
            'fields': ('course', 'title_uz', 'title_ru', 'title_en', 'description_uz', 'description_ru', 'description_en')
        }),
        ('Media', {
            'fields': ('video_file', 'thumbnail', 'video_preview')
        }),
        ('Xususiyatlar', {
            'fields': ('level', 'order_index', 'is_published', 'duration_seconds')
        }),
        ('Transcoding (Sifatlar)', {
            'fields': ('processing_status', 'available_qualities', 'video_360p', 'video_480p', 'video_720p', 'video_1080p')
        }),
    )

    def video_preview(self, obj):
        from django.utils.html import format_html
        if obj.video_file:
            return format_html(
                '<video src="{}" controls style="max-width: 400px; border-radius: 8px;"></video>',
                obj.video_file.url
            )
        return "Video yuklanmagan"
    video_preview.short_description = "Video ko'rinishi"

    def available_qualities(self, obj):
        from django.utils.html import format_html
        qualities = []
        if obj.video_360p: qualities.append('<span style="color: green">360p</span>')
        if obj.video_480p: qualities.append('<span style="color: green">480p</span>')
        if obj.video_720p: qualities.append('<span style="color: green">720p</span>')
        if obj.video_1080p: qualities.append('<span style="color: green">1080p</span>')
        
        if not qualities:
            return "Faqat original"
        return format_html(", ".join(qualities))
    available_qualities.short_description = "Mavjud sifatlar"

    def calculate_duration(self, request, queryset):
        from moviepy.video.io.VideoFileClip import VideoFileClip
        updated = 0
        for video in queryset:
            if video.video_file:
                try:
                    clip = VideoFileClip(video.video_file.path)
                    video.duration_seconds = int(clip.duration)
                    clip.close()
                    video.save(update_fields=['duration_seconds'])
                    updated += 1
                except Exception as e:
                    self.message_user(request, f"Error for {video.title_en}: {e}", level='error')
        self.message_user(request, f"{updated} ta video davomiyligi hisoblandi.")
    calculate_duration.short_description = "Tanlangan videolar davomiyligini hisoblash"

    actions = [calculate_duration]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text_uz', 'video')
    inlines = [ChoiceInline]

@admin.register(VideoProgress)
class VideoProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'video', 'watched_seconds', 'completed', 'last_watched')
    list_filter = ('completed', 'last_watched')
    search_fields = ('user__username', 'video__title_en')
