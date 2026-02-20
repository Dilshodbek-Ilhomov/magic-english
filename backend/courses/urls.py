"""
Courses API URLs
"""

from django.urls import path
from .views import (
    VideoListView, VideoDetailView,
    VideoStreamView, VideoProgressView,
    AdminVideoListCreateView, AdminVideoDetailView,
    CourseListView, CourseDetailView,
    AdminCourseListCreateView, AdminCourseDetailView,
    AdminQuestionListCreateView, AdminQuestionDetailView,
    AdminChoiceListCreateView, AdminChoiceDetailView,
    QuizSubmissionView,
)

urlpatterns = [
    # Public (User) endpoints
    path('courses/', CourseListView.as_view(), name='course-list'),
    path('courses/<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    
    path('videos/', VideoListView.as_view(), name='video-list'),
    path('videos/<int:pk>/', VideoDetailView.as_view(), name='video-detail'),
    path('videos/<int:pk>/stream/', VideoStreamView.as_view(), name='video-stream'),
    path('videos/<int:pk>/progress/', VideoProgressView.as_view(), name='video-progress'),
    path('videos/<int:pk>/quiz/', QuizSubmissionView.as_view(), name='video-quiz-submit'),

    # Admin endpoints
    path('admin/videos/', AdminVideoListCreateView.as_view(), name='admin-video-list'),
    path('admin/videos/<int:pk>/', AdminVideoDetailView.as_view(), name='admin-video-detail'),
    
    path('admin/courses/', AdminCourseListCreateView.as_view(), name='admin-course-list'),
    path('admin/courses/<int:pk>/', AdminCourseDetailView.as_view(), name='admin-course-detail'),

    path('admin/questions/', AdminQuestionListCreateView.as_view(), name='admin-question-list'),
    path('admin/questions/<int:pk>/', AdminQuestionDetailView.as_view(), name='admin-question-detail'),

    path('admin/choices/', AdminChoiceListCreateView.as_view(), name='admin-choice-list'),
    path('admin/choices/<int:pk>/', AdminChoiceDetailView.as_view(), name='admin-choice-detail'),
]
