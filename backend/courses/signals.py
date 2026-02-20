from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Video
from .services import transcode_video
import threading

@receiver(post_save, sender=Video)
def video_post_save(sender, instance, created, **kwargs):
    """
    Video yuklangandan keyin avtomatik transcodingni boshlash.
    Jarayonni alohida thread'da bajaramiz, user kutib qolmasligi uchun.
    """
    if created and instance.video_file:
        # Agar video yangi yaratilgan bo'lsa va fayli bo'lsa
        # Main threadni band qilmaslik uchun threading ishlatamiz
        # Production uchun Celery afzal, lekin bu yerda oddiy yechim
        thread = threading.Thread(target=transcode_video, args=(instance.id,))
        thread.daemon = True
        thread.start()
