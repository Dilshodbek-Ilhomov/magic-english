import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from courses.models import Course, Video
from accounts.models import User

def check_data():
    print("--- Courses ---")
    courses = Course.objects.all()
    print(f"Total courses: {courses.count()}")
    for c in courses:
        print(f"ID: {c.id}, Title: {c.title_en}")

    print("\n--- Videos ---")
    videos = Video.objects.all()
    print(f"Total videos: {videos.count()}")
    for v in videos:
        print(f"ID: {v.id}, Title: {v.title_en}, Published: {v.is_published}, Course ID: {v.course_id}")

    print("\n--- Users & Allowed Courses ---")
    users = User.objects.filter(role='student')
    print(f"Total students: {users.count()}")
    for u in users:
        allowed = u.allowed_courses.all()
        print(f"User: {u.username}, Allowed Courses IDs: {[c.id for c in allowed]}")

if __name__ == "__main__":
    check_data()
