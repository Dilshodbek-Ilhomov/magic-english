"""
Analytics URL yo'llari
Slash siz ham ishlaydi — Next.js proxy uchun
"""

from django.urls import re_path
from . import views

urlpatterns = [
    # Admin - Statistika
    re_path(r'^admin/analytics/?$', views.DashboardView.as_view(), name='analytics-dashboard'),
    re_path(r'^admin/analytics/user/(?P<pk>\d+)/?$', views.UserAnalyticsView.as_view(), name='user-analytics'),
    re_path(r'^admin/analytics/students/?$', views.StudentProgressView.as_view(), name='student-progress'),
    re_path(r'^admin/analytics/quizzes/?$', views.QuizPerformanceView.as_view(), name='quiz-performance'),
    re_path(r'^admin/logs/?$', views.SecurityLogListView.as_view(), name='security-logs'),
]
