import os
import sys
import django
import json

# Add the current directory to sys.path
sys.path.append(os.getcwd())

# Setup django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from courses.models import Video, Question, Choice
from courses.serializers import VideoDetailSerializer
from django.test import RequestFactory

video = Video.objects.first()
if not video:
    print("No videos found")
    sys.exit(0)

# Ensure there is at least one question with choices
question = Question.objects.filter(video=video).first()
if not question:
    question = Question.objects.create(video=video, text_uz="Test Question")
    Choice.objects.create(question=question, text_uz="Choice 1", is_correct=True)
    Choice.objects.create(question=question, text_uz="Choice 2", is_correct=False)

print(f"Video: {video.title_uz}")
print(f"Question: {question.text_uz}, Choices count: {question.choices.count()}")

# Create a mock request for serializer context
factory = RequestFactory()
request = factory.get('/')

# Mock authenticated user
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.filter(is_staff=True).first() or User.objects.create_superuser('testadmin', 'test@test.com', 'pass123')
request.user = user

serializer = VideoDetailSerializer(video, context={'request': request})
data = serializer.data

# Print only questions and choices part
print("Serialized Questions and Choices:")
print(json.dumps(data.get('questions', []), indent=2))
