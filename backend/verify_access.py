
import os
import django
import sys

# Setup Django environment
sys.path.append('C:/Users/Dilshodbek/Desktop/New site/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.models import User
from courses.models import Course, Video

print("\n=== USERS & ALLOWED COURSES ===")
for u in User.objects.all():
    allowed_ids = list(u.allowed_courses.values_list('id', flat=True))
    print(f"User: {u.username} (Role: {u.role})")
    print(f"  Allowed Course IDs: {allowed_ids}")

print("\n=== COURSES ===")
for c in Course.objects.all():
    video_count = Video.objects.filter(course=c).count()
    published_count = Video.objects.filter(course=c, is_published=True).count()
    print(f"Course {c.id}: {c.title_en} | Videos: {video_count} (Published: {published_count})")

print("\n=== VIDEOS (First 5) ===")
for v in Video.objects.all()[:5]:
    print(f"Video {v.id}: {v.title_en} | Course: {v.course_id} | Published: {v.is_published}")
