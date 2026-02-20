"""
Analytics views - Admin statistika, loglar
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Sum, Q, F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from accounts.permissions import IsAdmin
from courses.models import Video, VideoProgress
from analytics.models import SecurityLog
from analytics.serializers import SecurityLogSerializer


from django.core.cache import cache

class DashboardView(APIView):
    """
    Admin dashboard - umumiy statistika
    GET /api/admin/analytics/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        cache_key = 'admin_dashboard_stats'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Foydalanuvchilar statistikasi
        total_users = User.objects.count()
        active_users = User.objects.filter(is_blocked=False, is_active=True).count()
        new_users_week = User.objects.filter(created_at__gte=week_ago).count()
        blocked_users = User.objects.filter(is_blocked=True).count()

        # Video statistikasi
        total_videos = Video.objects.count()
        published_videos = Video.objects.filter(is_published=True).count()
        total_views = Video.objects.aggregate(total=Sum('views_count'))['total'] or 0

        # Progress statistikasi
        total_completions = VideoProgress.objects.filter(completed=True).count()
        active_learners = VideoProgress.objects.filter(
            last_watched__gte=week_ago
        ).values('user').distinct().count()

        # Daraja bo'yicha video taqsimoti
        level_distribution = Video.objects.values('level').annotate(
            count=Count('id'),
        ).order_by('level')

        # Oxirgi 7 kunlik faollik
        daily_activity = []
        for i in range(7):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = VideoProgress.objects.filter(
                last_watched__gte=day_start,
                last_watched__lt=day_end,
            ).count()
            daily_activity.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'views': count,
            })

        # Eng ko'p ko'rilgan videolar
        top_videos = Video.objects.order_by('-views_count')[:5].values(
            'id', 'title_en', 'views_count', 'level',
        )

        response_data = {
            'success': True,
            'data': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'new_this_week': new_users_week,
                    'blocked': blocked_users,
                },
                'videos': {
                    'total': total_videos,
                    'published': published_videos,
                    'total_views': total_views,
                },
                'learning': {
                    'total_completions': total_completions,
                    'active_learners_week': active_learners,
                },
                'level_distribution': list(level_distribution),
                'daily_activity': daily_activity,
                'top_videos': list(top_videos),
            },
        }
        # Keshga saqlaymiz (5 daqiqaga, ya'ni 300 soniya)
        cache.set(cache_key, response_data, 300)
        return Response(response_data)


class UserAnalyticsView(APIView):
    """
    Admin: Individual foydalanuvchi statistikasi
    GET /api/admin/analytics/user/<id>/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Foydalanuvchi topilmadi'},
            }, status=404)

        # Foydalanuvchining video progressi
        progress = VideoProgress.objects.filter(user=user).select_related('video')
        total_watched = progress.count()
        completed = progress.filter(completed=True).count()
        total_time = progress.aggregate(total=Sum('watched_seconds'))['total'] or 0

        # Daraja bo'yicha progress
        level_progress = {}
        for level_code, level_name in Video.Level.choices:
            level_videos = Video.objects.filter(level=level_code, is_published=True).count()
            level_completed = progress.filter(
                video__level=level_code, completed=True
            ).count()
            level_progress[level_code] = {
                'total': level_videos,
                'completed': level_completed,
                'percent': round((level_completed / level_videos * 100) if level_videos > 0 else 0),
            }

        # Oxirgi faollik
        recent = progress.order_by('-last_watched')[:10]
        recent_data = [{
            'video_id': p.video.id,
            'video_title': p.video.title_en,
            'watched_seconds': p.watched_seconds,
            'completed': p.completed,
            'progress_percent': p.progress_percent,
            'last_watched': p.last_watched,
        } for p in recent]

        # Xavfsizlik loglari
        logs = SecurityLog.objects.filter(user=user).order_by('-created_at')[:20]
        log_data = SecurityLogSerializer(logs, many=True).data

        return Response({
            'success': True,
            'data': {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'full_name': user.get_full_name(),
                    'role': user.role,
                    'is_blocked': user.is_blocked,
                    'last_login': user.last_login,
                    'created_at': user.created_at,
                },
                'stats': {
                    'total_watched': total_watched,
                    'completed': completed,
                    'total_time_seconds': total_time,
                    'completion_rate': round((completed / total_watched * 100) if total_watched > 0 else 0),
                },
                'level_progress': level_progress,
                'recent_activity': recent_data,
                'security_logs': log_data,
            },
        })


class SecurityLogListView(APIView):
    """
    Admin: Xavfsizlik loglari
    GET /api/admin/logs/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        logs = SecurityLog.objects.select_related('user').all()

        # Filtrlar
        action = request.query_params.get('action', '')
        if action:
            logs = logs.filter(action=action)

        user_id = request.query_params.get('user_id', '')
        if user_id:
            logs = logs.filter(user_id=user_id)

        # Oxirgi 100 ta log
        logs = logs[:100]
        serializer = SecurityLogSerializer(logs, many=True)

        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data),
        })


class StudentProgressView(APIView):
    """
    Admin: Talabalar o'zlashtirish ko'rsatkichlari
    GET /api/admin/analytics/students/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        students = User.objects.filter(role='student').annotate(
            total_watched=Count('video_progress', filter=Q(video_progress__completed=True)),
            total_watched_seconds=Sum('video_progress__watched_seconds'),
            total_quizzes_taken=Count('quiz_results', distinct=True)
        ).order_by('-date_joined')

        data = []
        for s in students:
            # Quiz average workaround if annotation fails or is complex
            quizzes = s.quiz_results.all()
            avg_quiz = 0
            if quizzes.exists():
                avg_quiz = sum(q.score_percentage for q in quizzes) / quizzes.count()

            data.append({
                'id': s.id,
                'username': s.username,
                'full_name': s.get_full_name(),
                'date_joined': s.date_joined,
                'completed_videos': s.total_watched,
                'total_watched_seconds': s.total_watched_seconds or 0,
                'total_quizzes_taken': s.total_quizzes_taken or 0,
                'avg_quiz_score': round(avg_quiz, 1),
                'last_active': s.last_login
            })

        return Response({
            'success': True,
            'data': data
        })


class QuizPerformanceView(APIView):
    """
    Admin: Test natijalari bo'yicha statistika
    GET /api/admin/analytics/quizzes/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        courses = Video.objects.values('course__title_en').annotate(
            total_attempts=Count('quiz_results'),
            avg_score=Sum('quiz_results__score_percentage') / Count('quiz_results')
        ).exclude(course__isnull=True).order_by('-total_attempts')
        
        # Or detailed by Video
        videos = Video.objects.annotate(
            attempts=Count('quiz_results'),
            avg_score=Sum('quiz_results__score_percentage') / Count('quiz_results')
        ).filter(attempts__gt=0).order_by('-attempts')

        video_data = [{
            'id': v.id,
            'title': v.title_en,
            'course': v.course.title_en if v.course else 'N/A',
            'attempts': v.attempts,
            'avg_score': round(v.avg_score or 0, 1)
        } for v in videos]

        return Response({
            'success': True,
            'data': video_data
        })
