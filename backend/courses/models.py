"""
Video darslari modellari - Video, VideoProgress, Course, Question, Choice
"""

from django.db import models
from django.conf import settings
from moviepy.video.io.VideoFileClip import VideoFileClip
import os

class Course(models.Model):
    """Kurs modeli - video darslarni guruhlash uchun"""

    class CourseType(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        PREMIUM = 'premium', 'Premium'
        OTHER = 'other', 'Other'

    title_uz = models.CharField(max_length=255, verbose_name="Sarlavha (O'zbek)", blank=True)
    title_ru = models.CharField(max_length=255, verbose_name='Sarlavha (Rus)', blank=True)
    title_en = models.CharField(max_length=255, verbose_name='Sarlavha (Ingliz)')

    description_uz = models.TextField(blank=True, verbose_name="Tavsif (O'zbek)")
    description_ru = models.TextField(blank=True, verbose_name='Tavsif (Rus)')
    description_en = models.TextField(blank=True, verbose_name='Tavsif (Ingliz)')

    course_type = models.CharField(
        max_length=20,
        choices=CourseType.choices,
        default=CourseType.STANDARD,
        verbose_name='Kurs turi'
    )
    custom_course_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='Boshqa tur (agar tanlangan bo\'lsa)'
    )

    thumbnail = models.ImageField(
        upload_to='course_thumbnails/',
        null=True,
        blank=True,
        verbose_name='Kurs rasmi'
    )

    telegram_group_url = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Telegram guruh havolasi'
    )

    daily_limit = models.IntegerField(
        default=0,
        verbose_name="Kunlik qo'shiq/dars ko'rish limiti",
        help_text="0 = cheksiz"
    )

    allowed_days = models.CharField(
        max_length=50,
        default="0,1,2,3,4,5,6",
        verbose_name="Ruxsat etilgan kunlar",
        help_text="0=Dushanba, 1=Seshanba... 6=Yakshanba. Vergul bilan kengaytmada (masalan '0,2,4' = Du,Chor,Jum)"
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan sana')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Yangilangan sana')

    class Meta:
        db_table = 'courses'
        verbose_name = 'Kurs'
        verbose_name_plural = 'Kurslar'

    def __str__(self):
        return self.title_en

    def get_title(self, lang='uz'):
        titles = {
            'uz': self.title_uz,
            'ru': self.title_ru,
            'en': self.title_en,
        }
        return titles.get(lang, self.title_en)

    def get_description(self, lang='uz'):
        descriptions = {
            'uz': self.description_uz,
            'ru': self.description_ru,
            'en': self.description_en,
        }
        return descriptions.get(lang, self.description_en)


class Video(models.Model):
    """Video dars modeli - admin tomonidan boshqariladi"""

    class Level(models.TextChoices):
        BEGINNER = 'beginner', 'Boshlang\'ich'
        INTERMEDIATE = 'intermediate', 'O\'rta'
        ADVANCED = 'advanced', 'Yuqori'

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='videos',
        verbose_name='Kurs',
        null=True,
        blank=True
    )

    # Sarlavhalar 3 tilda
    title_uz = models.CharField(max_length=255, verbose_name="Sarlavha (O'zbek)", blank=True)
    title_ru = models.CharField(max_length=255, verbose_name='Sarlavha (Rus)', blank=True)
    title_en = models.CharField(max_length=255, verbose_name='Sarlavha (Ingliz)')

    # Tavsiflar 3 tilda
    description_uz = models.TextField(blank=True, verbose_name="Tavsif (O'zbek)")
    description_ru = models.TextField(blank=True, verbose_name='Tavsif (Rus)')
    description_en = models.TextField(blank=True, verbose_name='Tavsif (Ingliz)')

    # Video daraja va tartib
    level = models.CharField(
        max_length=15,
        choices=Level.choices,
        default=Level.BEGINNER,
        verbose_name='Daraja',
    )
    order_index = models.PositiveIntegerField(default=0, verbose_name='Tartib raqami')

    # Fayl va rasm
    video_file = models.FileField(
        upload_to='videos/',
        verbose_name='Video fayl',
    )
    thumbnail = models.ImageField(
        upload_to='thumbnails/',
        null=True,
        blank=True,
        verbose_name='Oldindan ko\'rish rasmi',
    )

    # Video sifatlari (Transcoding natijalari)
    video_360p = models.FileField(upload_to='videos/360p/', null=True, blank=True, verbose_name='Video 360p')
    video_480p = models.FileField(upload_to='videos/480p/', null=True, blank=True, verbose_name='Video 480p')
    video_720p = models.FileField(upload_to='videos/720p/', null=True, blank=True, verbose_name='Video 720p')
    video_1080p = models.FileField(upload_to='videos/1080p/', null=True, blank=True, verbose_name='Video 1080p')
    video_1440p = models.FileField(upload_to='videos/1440p/', null=True, blank=True, verbose_name='Video 1440p (2K)')
    video_2160p = models.FileField(upload_to='videos/2160p/', null=True, blank=True, verbose_name='Video 2160p (4K)')

    # Jarayon holati
    PROCESSING_STATUS = (
        ('pending', 'Kutilmoqda'),
        ('processing', 'Jarayonda'),
        ('completed', 'Tayyor'),
        ('failed', 'Xatolik'),
    )
    processing_status = models.CharField(
        max_length=20, 
        choices=PROCESSING_STATUS, 
        default='pending',
        verbose_name='Transcoding holati'
    )

    # Qo'shimcha ma'lumotlar
    duration_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name='Davomiyligi (soniya)',
        editable=False 
    )
    is_published = models.BooleanField(
        default=True,
        verbose_name='Nashr etilgan',
    )
    views_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Ko\'rishlar soni',
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan sana')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Yangilangan sana')

    class Meta:
        db_table = 'videos'
        verbose_name = 'Video dars'
        verbose_name_plural = 'Video darslar'
        ordering = ['level', 'order_index']

    def __str__(self):
        return self.title_en

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.video_file and (self.duration_seconds == 0 or not self.duration_seconds):
            try:
                clip = VideoFileClip(self.video_file.path)
                self.duration_seconds = int(clip.duration)
                clip.close()
                super().save(update_fields=['duration_seconds'])
            except Exception as e:
                print(f"Error calculating duration: {e}")

    def get_title(self, lang='uz'):
        """Tanlangan tildagi sarlavhani qaytaradi"""
        titles = {
            'uz': self.title_uz,
            'ru': self.title_ru,
            'en': self.title_en,
        }
        return titles.get(lang, self.title_en)

    def get_description(self, lang='uz'):
        """Tanlangan tildagi tavsifni qaytaradi"""
        descriptions = {
            'uz': self.description_uz,
            'ru': self.description_ru,
            'en': self.description_en,
        }
        return descriptions.get(lang, self.description_en)


class Question(models.Model):
    """Video darsga tegishli savol"""
    class QuestionType(models.TextChoices):
        CHOICE = 'choice', 'Multiple Choice'
        MULTI_CHOICE = 'multi_choice', 'Multiple Answer'
        TEXT = 'text', 'Text Input'
        TRUE_FALSE = 'true_false', 'True/False'

    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='questions', verbose_name='Video')
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.CHOICE,
        verbose_name='Savol turi'
    )
    text_uz = models.TextField(verbose_name="Savol matni (O'zbek)")
    text_ru = models.TextField(verbose_name="Savol matni (Rus)", blank=True)
    text_en = models.TextField(verbose_name="Savol matni (Ingliz)", blank=True)
    
    # Faqat 'text' turi uchun
    correct_answer_uz = models.CharField(max_length=255, verbose_name="To'g'ri javob (UZ)", blank=True)
    correct_answer_ru = models.CharField(max_length=255, verbose_name="To'g'ri javob (RU)", blank=True)
    correct_answer_en = models.CharField(max_length=255, verbose_name="To'g'ri javob (EN)", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Savol'
        verbose_name_plural = 'Savollar'

    def __str__(self):
        return self.text_uz[:50]


class Choice(models.Model):
    """Savol varianti"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices', verbose_name='Savol')
    text_uz = models.CharField(max_length=255, verbose_name="Variant matni (O'zbek)")
    text_ru = models.CharField(max_length=255, verbose_name="Variant matni (Rus)", blank=True)
    text_en = models.CharField(max_length=255, verbose_name="Variant matni (Ingliz)", blank=True)
    is_correct = models.BooleanField(default=False, verbose_name="To'g'ri javob")

    class Meta:
        verbose_name = 'Variant'
        verbose_name_plural = 'Variantlar'

    def __str__(self):
        return self.text_uz


class VideoProgress(models.Model):
    """Foydalanuvchining video ko'rish jarayoni"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_progress',
        verbose_name='Foydalanuvchi',
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='progress_records',
        verbose_name='Video',
    )
    watched_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name='Ko\'rilgan vaqt (soniya)',
    )
    completed = models.BooleanField(
        default=False,
        verbose_name='Tugatilgan',
    )
    last_watched = models.DateTimeField(
        auto_now=True,
        verbose_name='Oxirgi ko\'rilgan vaqt',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Boshlangan sana')

    class Meta:
        db_table = 'video_progress'
        verbose_name = 'Video progress'
        verbose_name_plural = 'Video progresslar'
        unique_together = ('user', 'video')
        ordering = ['-last_watched']

    def __str__(self):
        status = '✅' if self.completed else f'{self.progress_percent}%'
        return f"{self.user.username} - {self.video.title_en} ({status})"

    @property
    def progress_percent(self):
        """Foizdagi progressni qaytaradi"""
        if self.video.duration_seconds == 0:
            return 0
        return min(100, round((self.watched_seconds / self.video.duration_seconds) * 100))


class QuizResult(models.Model):
    """Foydalanuvchining test natijalari"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_results',
        verbose_name='Foydalanuvchi'
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='quiz_results',
        verbose_name='Video'
    )
    correct_answers = models.PositiveIntegerField(verbose_name="To'g'ri javoblar")
    total_questions = models.PositiveIntegerField(verbose_name="Jami savollar")
    score_percentage = models.FloatField(verbose_name="Foiz")
    passed = models.BooleanField(default=False, verbose_name="O'tdi")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Sanasi")

    class Meta:
        verbose_name = 'Test natijasi'
        verbose_name_plural = 'Test natijalari'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.video.title_en} ({self.score_percentage}%)"
