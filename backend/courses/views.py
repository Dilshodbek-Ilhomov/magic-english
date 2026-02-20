"""
Courses views - Video darslar va progress boshqarish
"""

import os
import logging
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db.models import Q

from .models import Video, VideoProgress, Course, Question, Choice, QuizResult
from .serializers import (
    VideoListSerializer,
    VideoDetailSerializer,
    VideoProgressSerializer,
    AdminVideoSerializer,
    CourseSerializer,
    QuestionSerializer,
    ChoiceSerializer,
)
from accounts.permissions import IsAdmin, IsNotBlocked
from accounts.utils import (
    log_security_event,
    generate_signed_video_url,
    verify_video_signature,
)

logger = logging.getLogger('courses')


class CourseListView(APIView):
    """
    Kurslar ro'yxati
    GET /api/courses/
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]

    def get(self, request):
        # Admin barcha kurslarni ko'radi, student faqat ruxsat etilganlarini
        if request.user.role == 'admin':
            courses = Course.objects.all().order_by('-created_at')
        else:
            courses = request.user.allowed_courses.all().order_by('-created_at')
        serializer = CourseSerializer(courses, many=True, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data,
            'count': courses.count()
        })


class CourseDetailView(APIView):
    """
    Kurs tafsiloti va uning videolari
    GET /api/courses/<id>/
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Kurs topilmadi'}
            }, status=status.HTTP_404_NOT_FOUND)

        # Student faqat ruxsat etilgan kurslarini ko'ra oladi
        if request.user.role != 'admin':
            if not request.user.allowed_courses.filter(pk=pk).exists():
                return Response({
                    'success': False,
                    'error': {'message': 'Bu kursga ruxsatingiz yo\'q'}
                }, status=status.HTTP_403_FORBIDDEN)

        course_data = CourseSerializer(course, context={'request': request}).data
        
        # Kursga tegishli videolar
        videos = Video.objects.filter(course=course, is_published=True).select_related('course').order_by('order_index')
        
        if request.user.is_authenticated:
            from django.db.models import Prefetch
            videos = videos.prefetch_related(
                Prefetch(
                    'progress_records',
                    queryset=VideoProgress.objects.filter(user=request.user),
                    to_attr='user_progress'
                )
            )

        video_serializer = VideoListSerializer(videos, many=True, context={'request': request})
        
        course_data['videos'] = video_serializer.data
        
        return Response({
            'success': True,
            'data': course_data
        })


class VideoListView(APIView):
    """
    Video darslar ro'yxati (faqat nashr etilganlar)
    GET /api/videos/
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]

    def get(self, request):
        videos = Video.objects.filter(is_published=True).select_related('course')

        # Student faqat ruxsat etilgan kurslardagi videolarni ko'ra oladi
        if request.user.role != 'admin':
            allowed_course_ids = request.user.allowed_courses.values_list('id', flat=True)
            videos = videos.filter(
                Q(course__in=allowed_course_ids) | Q(course__isnull=True)
            )

        # Kurs bo'yicha filtr
        course_id = request.query_params.get('course', '')
        if course_id:
            videos = videos.filter(course_id=course_id)

        # Daraja bo'yicha filtr
        level = request.query_params.get('level', '')
        if level and level in dict(Video.Level.choices):
            videos = videos.filter(level=level)

        # Qidiruv
        search = request.query_params.get('search', '')
        if search:
            videos = videos.filter(
                Q(title_uz__icontains=search) |
                Q(title_ru__icontains=search) |
                Q(title_en__icontains=search) |
                Q(description_uz__icontains=search) |
                Q(description_ru__icontains=search) |
                Q(description_en__icontains=search)
            )

        if request.user.is_authenticated:
            from django.db.models import Prefetch
            videos = videos.prefetch_related(
                Prefetch(
                    'progress_records',
                    queryset=VideoProgress.objects.filter(user=request.user),
                    to_attr='user_progress'
                )
            )

        serializer = VideoListSerializer(
            videos, many=True,
            context={'request': request},
        )
        return Response({
            'success': True,
            'data': serializer.data,
            'count': videos.count(),
        })


class VideoDetailView(APIView):
    """
    Video dars tafsiloti va imzolangan stream URL
    GET /api/videos/<id>/
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]

    def get(self, request, pk):
        try:
            video = Video.objects.get(pk=pk, is_published=True)
        except Video.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Video topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        # Student faqat ruxsat etilgan kursdagi videoni ko'ra oladi
        if request.user.role != 'admin' and video.course:
            if not request.user.allowed_courses.filter(pk=video.course_id).exists():
                return Response({
                    'success': False,
                    'error': {'message': 'Bu videoga ruxsatingiz yo\'q'},
                }, status=status.HTTP_403_FORBIDDEN)

        # Limit tekshiruvlari
        # Limit tekshiruvlari
        if getattr(request.user, 'role', 'student') != 'admin' and video.course:
            course = video.course
            from django.utils import timezone
            today = timezone.now().date()
            
            total_videos = course.videos.filter(is_published=True).count()
            completed_videos = request.user.video_progress.filter(video__course=course, completed=True).count()
            
            # 1. Agar barcha videolarni ko'rib bo'lgan bo'lsa, limit ishlamaydi (Cheksiz kirish ruxsat etiladi)
            if total_videos > 0 and completed_videos >= total_videos:
                pass
            else:
                # 2. Haftaning ruxsat etilgan kunlari tekshiruvi
                allowed_days_str = getattr(course, 'allowed_days', '0,1,2,3,4,5,6')
                if allowed_days_str:
                    allowed = [x.strip() for x in allowed_days_str.split(',') if x.strip()]
                    if allowed and str(today.weekday()) not in allowed:
                        from calendar import day_name
                        return Response({
                            'success': False,
                            'error': {'message': "Siz bu kursga bugun kira olmaysiz. Grafikingiz (Ruxsat etilgan kunlar) bo'yicha kuting."},
                        }, status=status.HTTP_403_FORBIDDEN)

                # 3. Kunlik darslar (yangi videolar) limiti
                if getattr(course, 'daily_limit', 0) > 0:
                    already_unlocked = request.user.video_progress.filter(video_id=video.id).exists()
                    if not already_unlocked:
                        unlocked_today = request.user.video_progress.filter(
                            created_at__date=today,
                            video__course=course
                        ).count()
                        
                        if unlocked_today >= course.daily_limit:
                            return Response({
                                'success': False,
                                'error': {'message': f"Kunlik dars ochish limitingizga yetdingiz ({course.daily_limit} ta). Yangi darslarni ertaga ko'rishingiz mumkin."},
                            }, status=status.HTTP_403_FORBIDDEN)

        # Ko'rishlar sonini oshirish
        video.views_count += 1
        video.save(update_fields=['views_count'])

        # Imzolangan URL yaratish
        signed = generate_signed_video_url(
            video.id,
            request.user.id,
            settings.VIDEO_SIGNING_KEY,
        )

        serializer = VideoDetailSerializer(
            video, context={'request': request},
        )
        data = serializer.data
        data['stream_token'] = signed

        # Xavfsizlik logiga yozish
        log_security_event(
            request.user, 'video_access', request,
            {'video_id': video.id, 'video_title': video.title_en},
        )

        return Response({
            'success': True,
            'data': data,
        })


class VideoStreamView(APIView):
    """
    Himoyalangan video stream
    GET /api/videos/<id>/stream/?expires=...&signature=...&user_id=...
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        # Parametrlarni tekshirish
        expires = request.query_params.get('expires', '')
        signature = request.query_params.get('signature', '')
        user_id = request.query_params.get('user_id', '')

        if not all([expires, signature, user_id]):
            return Response({
                'success': False,
                'error': {'message': 'Noto\'g\'ri so\'rov parametrlari'},
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Imzoni tekshirish
            if not verify_video_signature(
                pk, user_id, expires, signature,
                settings.VIDEO_SIGNING_KEY,
            ):
                return Response({
                    'success': False,
                    'error': {'message': 'Video URL muddati o\'tgan yoki noto\'g\'ri'},
                }, status=status.HTTP_403_FORBIDDEN)

            # User ID tekshiruvi (imzo orqali)
            # Auth header bo'lmagani uchun request.user yo'q bo'lishi mumkin
            # Imzo to'g'ri bo'lsa, demak URL server tomonidan berilgan

            try:
                video = Video.objects.get(pk=pk)
            except Video.DoesNotExist:
                raise Http404

            # Resolution (sifat) parametrini olish
            res = request.query_params.get('res', '')
            file_path = None
            
            if res == '360p' and video.video_360p: file_path = video.video_360p.path
            elif res == '480p' and video.video_480p: file_path = video.video_480p.path
            elif res == '720p' and video.video_720p: file_path = video.video_720p.path
            elif res == '1080p' and video.video_1080p: file_path = video.video_1080p.path
            
            # Agar sifat topilmasa yoki fayl hali tayyor bo'lmasa, originalni ishlatish
            if not file_path or not os.path.exists(file_path):
                if not video.video_file:
                     return Response({
                        'success': False,
                        'error': {'message': 'Video fayl yuklanmagan'},
                    }, status=status.HTTP_404_NOT_FOUND)
                file_path = video.video_file.path

            if not os.path.exists(file_path):
                return Response({
                    'success': False,
                    'error': {'message': 'Video fayl serverda topilmadi'},
                }, status=status.HTTP_404_NOT_FOUND)

            # Video faylni stream qilish
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'video/mp4'

            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type,
            )
            # Yuklab olishni bloklash
            response['Content-Disposition'] = 'inline'
            # response['X-Content-Type-Options'] = 'nosniff' # Olib tashlandi, ba'zan player bloklaydi
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
            return response
            
        except Exception as e:
            logger.error(f"Video stream error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': {'message': 'Video yuklashda server xatoligi'},
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VideoProgressView(APIView):
    """
    Video ko'rish progressini yangilash
    POST /api/videos/<id>/progress/
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]

    def post(self, request, pk):
        try:
            video = Video.objects.get(pk=pk)
        except Video.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Video topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = VideoProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Limit tekshiruvlari
        # Limit tekshiruvlari
        if getattr(request.user, 'role', 'student') != 'admin' and video.course:
            course = video.course
            from django.utils import timezone
            today = timezone.now().date()
            
            total_videos = course.videos.filter(is_published=True).count()
            completed_videos = request.user.video_progress.filter(video__course=course, completed=True).count()
            
            if total_videos > 0 and completed_videos >= total_videos:
                pass
            else:
                allowed_days_str = getattr(course, 'allowed_days', '0,1,2,3,4,5,6')
                if allowed_days_str:
                    allowed = [x.strip() for x in allowed_days_str.split(',') if x.strip()]
                    if allowed and str(today.weekday()) not in allowed:
                        return Response({
                            'success': False,
                            'error': {'message': "Siz bu kursga bugun kira olmaysiz. Grafikingiz bo'yicha kuting."},
                        }, status=status.HTTP_403_FORBIDDEN)

                if getattr(course, 'daily_limit', 0) > 0:
                    already_unlocked = request.user.video_progress.filter(video_id=video.id).exists()
                    if not already_unlocked:
                        unlocked_today = request.user.video_progress.filter(
                            created_at__date=today,
                            video__course=course
                        ).count()
                        if unlocked_today >= course.daily_limit:
                            return Response({
                                'success': False,
                                'error': {'message': f"Kunlik dars ochish limitingizga yetdingiz ({course.daily_limit} ta)."},
                            }, status=status.HTTP_403_FORBIDDEN)

        progress, created = VideoProgress.objects.get_or_create(
            user=request.user,
            video=video,
        )

        # Faqat oldinga yangilash (orqaga qaytmasin)
        new_seconds = serializer.validated_data.get('watched_seconds', 0)
        if new_seconds > progress.watched_seconds:
            progress.watched_seconds = new_seconds

        if serializer.validated_data.get('completed', False):
            progress.completed = True

        progress.save()

        # Update user streak
        from datetime import date, timedelta
        user = request.user
        today = date.today()
        
        if user.last_activity_date != today:
            if user.last_activity_date == today - timedelta(days=1):
                user.daily_streak += 1
            elif user.last_activity_date is None or user.last_activity_date < today - timedelta(days=1):
                user.daily_streak = 1
            user.last_activity_date = today
            user.save(update_fields=['daily_streak', 'last_activity_date'])

        return Response({
            'success': True,
            'data': {
                'watched_seconds': progress.watched_seconds,
                'completed': progress.completed,
                'progress_percent': progress.progress_percent,
            },
        })


class QuizSubmissionView(APIView):
    """
    User: Test javoblarini yuborish
    POST /api/videos/<id>/quiz/
    Body: { "answers": { "question_id": choice_id, ... } }
    """
    permission_classes = [IsAuthenticated, IsNotBlocked]

    def post(self, request, pk):
        try:
            try:
                video = Video.objects.get(pk=pk)
            except Video.DoesNotExist:
                return Response({
                    'success': False, 
                    'error': {'message': 'Video topilmadi'}
                }, status=status.HTTP_404_NOT_FOUND)

            answers = request.data.get('answers', {})
            if not answers:
                return Response({
                    'success': False, 
                    'error': {'message': 'Javoblar yo\'q'}
                }, status=status.HTTP_400_BAD_REQUEST)

            # Optimize: Fetch questions with choices in one go
            questions = video.questions.prefetch_related('choices').all()
            total_questions = len(questions)
            if total_questions == 0:
                 return Response({
                    'success': False, 
                    'error': {'message': 'Bu videoda testlar yo\'q'}
                }, status=status.HTTP_400_BAD_REQUEST)

            correct_count = 0
            for q in questions:
                user_answer = answers.get(str(q.id)) or answers.get(q.id)
                
                if not user_answer: continue

                if q.question_type == Question.QuestionType.TEXT:
                    # Text input comparison (case-insensitive)
                    correct_ans = [
                        (q.correct_answer_uz or '').lower().strip(),
                        (q.correct_answer_ru or '').lower().strip(),
                        (q.correct_answer_en or '').lower().strip()
                    ]
                    correct_ans = [mid for mid in correct_ans if mid]
                    
                    if str(user_answer).lower().strip() in correct_ans:
                        correct_count += 1
                
                elif q.question_type == Question.QuestionType.MULTI_CHOICE:
                    if isinstance(user_answer, list) and user_answer:
                        correct_choice_ids = set(c.id for c in q.choices.all() if c.is_correct)
                        try:
                            user_selected_ids = set(map(int, user_answer))
                            if user_selected_ids == correct_choice_ids:
                                correct_count += 1
                        except (ValueError, TypeError):
                            pass

                else:
                    try:
                        user_choice_id = int(user_answer)
                        selected_choice = next((c for c in q.choices.all() if c.id == user_choice_id), None)
                        if selected_choice and selected_choice.is_correct:
                            correct_count += 1
                    except (ValueError, TypeError):
                        pass

            score_percent = round((correct_count / total_questions) * 100, 1)
            passed = score_percent >= 70

            result = QuizResult.objects.create(
                user=request.user,
                video=video,
                correct_answers=correct_count,
                total_questions=total_questions,
                score_percentage=score_percent,
                passed=passed
            )

            return Response({
                'success': True,
                'data': {
                    'score': score_percent,
                    'passed': passed,
                    'correct_count': correct_count,
                    'total_questions': total_questions
                }
            })
        except Exception as e:
            logger.error(f"Quiz submission error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': {'message': f'Server xatoligi: {str(e)}'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===================== ADMIN VIDEO VIEWS =====================


class AdminVideoListCreateView(APIView):
    """
    Admin: Videolar ro'yxati va yangi video yuklash
    GET  /api/admin/videos/
    POST /api/admin/videos/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        from django.db.models import Count
        videos = Video.objects.select_related('course').annotate(
            unique_viewers_count=Count('progress_records__user', distinct=True)
        )

        search = request.query_params.get('search', '')
        if search:
            videos = videos.filter(
                Q(title_uz__icontains=search) |
                Q(title_ru__icontains=search) |
                Q(title_en__icontains=search)
            )

        course_id = request.query_params.get('course') or request.query_params.get('course_id')
        if course_id:
            videos = videos.filter(course_id=course_id)

        level = request.query_params.get('level', '')
        if level:
            videos = videos.filter(level=level)

        serializer = AdminVideoSerializer(videos, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': videos.count(),
        })

    def post(self, request):
        from django.db import transaction
        with transaction.atomic():
            data = request.data.copy()
            # Fallback logic for title and description
            if 'title' in data:
                if 'title_en' not in data: data['title_en'] = data['title']
                if 'title_uz' not in data: data['title_uz'] = data['title']
                if 'title_ru' not in data: data['title_ru'] = data['title']
            if 'description' in data:
                if 'description_en' not in data: data['description_en'] = data['description']
                if 'description_uz' not in data: data['description_uz'] = data['description']
                if 'description_ru' not in data: data['description_ru'] = data['description']

            # Auto-publish: yangi video yuklananda avtomatik nashr qilinadi
            data['is_published'] = True

            serializer = AdminVideoSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            video = serializer.save()

            log_security_event(
                request.user, 'video_upload', request,
                {'video_id': video.id, 'title': video.title_en},
            )
            logger.info(f"Admin {request.user.username} yangi video yukladi: {video.title_en}")

            return Response({
                'success': True,
                'data': AdminVideoSerializer(video).data,
                'message': 'Video muvaffaqiyatli yuklandi',
            }, status=status.HTTP_201_CREATED)


class AdminVideoDetailView(APIView):
    """
    Admin: Videoni tahrirlash va o'chirish
    GET    /api/admin/videos/<id>/
    PUT    /api/admin/videos/<id>/
    DELETE /api/admin/videos/<id>/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_video(self, pk):
        try:
            return Video.objects.get(pk=pk)
        except Video.DoesNotExist:
            return None

    def get(self, request, pk):
        video = self.get_video(pk)
        if not video:
            return Response({
                'success': False,
                'error': {'message': 'Video topilmadi'},
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminVideoSerializer(video)
        return Response({
            'success': True,
            'data': serializer.data,
        })

    def put(self, request, pk):
        from django.db import transaction
        with transaction.atomic():
            video = self.get_video(pk)
            if not video:
                return Response({
                    'success': False,
                    'error': {'message': 'Video topilmadi'},
                }, status=status.HTTP_404_NOT_FOUND)

            data = request.data.copy()
            # Fallback logic for title and description
            if 'title' in data:
                if 'title_en' not in data: data['title_en'] = data['title']
                if 'title_uz' not in data: data['title_uz'] = data['title']
                if 'title_ru' not in data: data['title_ru'] = data['title']
            if 'description' in data:
                if 'description_en' not in data: data['description_en'] = data['description']
                if 'description_uz' not in data: data['description_uz'] = data['description']
                if 'description_ru' not in data: data['description_ru'] = data['description']

            serializer = AdminVideoSerializer(
                video, data=data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response({
                'success': True,
                'data': AdminVideoSerializer(video).data,
                'message': 'Video muvaffaqiyatli yangilandi'
            })

    def patch(self, request, pk):
        from django.db import transaction
        with transaction.atomic():
            video = self.get_video(pk)
            if not video:
                return Response({
                    'success': False,
                    'error': {'message': 'Video topilmadi'},
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = AdminVideoSerializer(video, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            video = serializer.save()

            # Log
            log_security_event(
                request.user, 'video_update', request,
                {'video_id': video.id, 'title': video.title_en, 'published': video.is_published},
            )

            return Response({
                'success': True,
                'data': AdminVideoSerializer(video).data,
                'message': 'Video holati yangilandi'
            })

    def delete(self, request, pk):
        from django.db import transaction
        with transaction.atomic():
            video = self.get_video(pk)
            if not video:
                return Response({
                    'success': False,
                    'error': {'message': 'Video topilmadi'},
                }, status=status.HTTP_404_NOT_FOUND)

            # Video faylni ham o'chirish (DB o'chgandan keyin emas, balki commit bo'lgandan keyin qilish kerak, lekin soddalik uchun shu yerda)
            # Transaction rollback bo'lsa fayl o'chib ketadi, bu ideal emas lekin fayl tizimi transaksion emas.
            # Yaxshiroq yechim: post_delete signal yoki alohida task.
            # Hozircha DB o'chirishni birinchi qilamiz.
            
            title = video.title_en
            video_file_path = video.video_file.path if video.video_file else None
            thumbnail_path = video.thumbnail.path if video.thumbnail else None

            video.delete()

            log_security_event(
                request.user, 'video_delete', request,
                {'video_id': pk, 'title': title},
            )

        # Transaction muvaffaqiyatli bo'lsa fayllarni o'chirish
        if video_file_path:
            try:
                if os.path.exists(video_file_path):
                    os.remove(video_file_path)
            except (OSError, ValueError):
                pass
        if thumbnail_path:
            try:
                if os.path.exists(thumbnail_path):
                    os.remove(thumbnail_path)
            except (OSError, ValueError):
                pass

        return Response({
            'success': True,
            'message': f'"{title}" o\'chirildi',
        })


# ===================== ADMIN COURSE VIEWS =====================

class AdminCourseListCreateView(APIView):
    """
    Admin: Kurslar ro'yxati va yangi kurs yaratish
    GET /api/admin/courses/
    POST /api/admin/courses/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        courses = Course.objects.all().order_by('-created_at')
        serializer = CourseSerializer(courses, many=True, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data,
            'count': courses.count()
        })

    def post(self, request):
        from django.db import transaction
        with transaction.atomic():
            serializer = CourseSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                course = serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Kurs yaratildi'
                }, status=status.HTTP_201_CREATED)
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


class AdminCourseDetailView(APIView):
    """
    Admin: Kursni tahrirlash va o'chirish
    PUT    /api/admin/courses/<id>/
    DELETE /api/admin/courses/<id>/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            raise Http404

    def put(self, request, pk):
        from django.db import transaction
        with transaction.atomic():
            course = self.get_object(pk)
            serializer = CourseSerializer(course, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Kurs yangilandi'
                })
            return Response({
                'success': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        from django.db import transaction
        with transaction.atomic():
            course = self.get_object(pk)
            course.delete()
            return Response({
                'success': True,
                'message': 'Kurs o\'chirildi'
            })


# ===================== ADMIN QUIZ VIEWS =====================

class AdminQuestionListCreateView(APIView):
    """
    Admin: Savollar ro'yxati (video_id bo'yicha) va yangi savol
    GET /api/admin/questions/?video_id=...
    POST /api/admin/questions/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        video_id = request.query_params.get('video_id')
        if not video_id:
            return Response({'success': False, 'error': 'video_id required'}, status=400)
        
        questions = Question.objects.filter(video_id=video_id).prefetch_related('choices')
        serializer = QuestionSerializer(questions, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def post(self, request):
        # Create Question
        # Expects: video (id), text (or text_uz/ru/en)
        data = request.data.copy()
        
        # Simple text fallback logic would go here if cleaner, 
        # but let's assume frontend sends correct fields or we handle it in models save?
        # For now, let's map 'text' to all languages if present
        if 'text' in data:
            if 'text_uz' not in data: data['text_uz'] = data['text']
            if 'text_ru' not in data: data['text_ru'] = data['text']
            if 'text_en' not in data: data['text_en'] = data['text']
            
        serializer = QuestionSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            question = serializer.save()
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Savol qo\'shildi'
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminQuestionDetailView(APIView):
    """
    PUT /api/admin/questions/<id>/
    DELETE /api/admin/questions/<id>/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return Question.objects.get(pk=pk)
        except Question.DoesNotExist:
            raise Http404

    def put(self, request, pk):
        question = self.get_object(pk)
        
        data = request.data.copy()
        if 'text' in data:
             if 'text_uz' not in data: data['text_uz'] = data['text']
             if 'text_ru' not in data: data['text_ru'] = data['text']
             if 'text_en' not in data: data['text_en'] = data['text']

        serializer = QuestionSerializer(question, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'data': serializer.data})
        return Response({'success': False, 'error': serializer.errors}, status=400)

    def delete(self, request, pk):
        question = self.get_object(pk)
        question.delete()
        return Response({'success': True, 'message': 'Savol o\'chirildi'})


class AdminChoiceListCreateView(APIView):
    """
    Admin: Variantlar (choice) yaratish
    POST /api/admin/choices/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        # Expects: question (id), text (or text_uz/ru/en), is_correct
        data = request.data.copy()
        if 'text' in data:
            if 'text_uz' not in data: data['text_uz'] = data['text']
            if 'text_ru' not in data: data['text_ru'] = data['text']
            if 'text_en' not in data: data['text_en'] = data['text']

        serializer = ChoiceSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            choice = serializer.save()
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminChoiceDetailView(APIView):
    """
    DELETE /api/admin/choices/<id>/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        try:
            choice = Choice.objects.get(pk=pk)
            choice.delete()
            return Response({'success': True, 'message': 'Variant o\'chirildi'})
        except Choice.DoesNotExist:
            return Response({'success': False, 'error': 'Variant topilmadi'}, status=404)
