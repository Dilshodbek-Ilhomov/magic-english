import os
import sys
import django

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Setup django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
try:
    django.setup()
except Exception as e:
    print(f"Django setup failed: {e}")
    sys.exit(1)

from courses.models import Video, Question, Choice
from courses.serializers import QuestionSerializer

video = Video.objects.first()
if not video:
    print("No videos found")
    sys.exit(0)

print(f"Using Video: {video.title_uz} (ID: {video.id})")

data = {
    'video': video.id,
    'text': 'Shell Test Question',
    'choices': [
        {'text': 'Choice A', 'is_correct': True},
        {'text': 'Choice B', 'is_correct': False}
    ]
}

serializer = QuestionSerializer(data=data)
if serializer.is_valid():
    q = serializer.save()
    print(f"Question created: {q.text_uz}")
    print(f"Choices count: {q.choices.count()}")
    for choice in q.choices.all():
        print(f"- {choice.text_uz} (Correct: {choice.is_correct})")
    
    # Verify display_text
    print(f"Display Text: {q.display_text}")
    print(f"Choice 1 Display Text: {q.choices.first().display_text}")
else:
    print(f"Validation failed: {serializer.errors}")
