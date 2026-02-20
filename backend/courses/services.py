import os
import subprocess
from django.conf import settings
from .models import Video

def transcode_video(video_id):
    """
    Video faylini turli sifatlarga o'tkazish (Transcoding).
    FFmpeg talab qilinadi.
    """
    try:
        video = Video.objects.get(id=video_id)
        video.processing_status = 'processing'
        video.save()
        
        source_path = video.video_file.path
        base_dir = os.path.dirname(source_path)
        filename = os.path.basename(source_path)
        name_without_ext = os.path.splitext(filename)[0]
        
        # Sifatlar va ularning sozlamalari
        # (scale=-2:height aspect ratio saqlash uchun, -2 ffmpeg talabi)
        qualities = [
            {'name': '360p', 'height': 360, 'bitrate': '800k', 'field': 'video_360p'},
            {'name': '480p', 'height': 480, 'bitrate': '1500k', 'field': 'video_480p'},
            {'name': '720p', 'height': 720, 'bitrate': '3000k', 'field': 'video_720p'},
            {'name': '1080p', 'height': 1080, 'bitrate': '5000k', 'field': 'video_1080p'},
        ]
        
        # 1440p va 2160p ni faqat asl video yetarli sifatda bo'lsa qo'shamiz
        # Hozircha oddiylik uchun har doim urinib ko'ramiz yoki keyinroq logic qo'shamiz
        # Keling, user so'ragan barcha formatlarni qo'shamiz
        qualities.extend([
            {'name': '1440p', 'height': 1440, 'bitrate': '8000k', 'field': 'video_1440p'},
            {'name': '2160p', 'height': 2160, 'bitrate': '14000k', 'field': 'video_2160p'},
        ])

        print(f"Starting transcoding for video {video_id}: {filename}")
        
        for q in qualities:
            output_filename = f"{name_without_ext}_{q['name']}.mp4"
            output_subdir = os.path.join(base_dir, q['name']) # videos/360p/
            
            # Sub-papka yaratish (masalan: media/videos/360p/)
            # Modelda upload_to='videos/360p/' ko'rsatilgan, lekin u fayl yuklanganda ishlaydi.
            # Biz bu yerda qo'lda yasaymiz.
            # Yaxshisi, barcha sifatlarni bitta papkada yoki modeldagi kabi alohida papkalarda saqlash.
            # Model strukturasiga moslashamiz: videos/360p/fayl.mp4
            
            # Absolute path to media/videos/{quality}/
            quality_dir = os.path.join(settings.MEDIA_ROOT, 'videos', q['name'])
            os.makedirs(quality_dir, exist_ok=True)
            
            output_path = os.path.join(quality_dir, output_filename)
             
            # FFmpeg buyrug'i
            # -vf scale=-2:HEIGHT -> balandlikni belgilash, enini avtomatik hisoblash
            # -c:v libx264 -> videoni H.264 kadeki bilan kodlash
            # -b:v BITRATE -> video sifati
            # -c:a aac -> audio kadeki
            # -y -> mavjud faylni so'roqsiz almashtirish
            command = [
                'ffmpeg', '-i', source_path,
                '-vf', f"scale=-2:{q['height']}",
                '-c:v', 'libx264',
                '-b:v', q['bitrate'],
                '-c:a', 'aac',
                '-y',
                output_path
            ]
            
            try:
                subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                # Modelga nisbiy yo'lni saqlash (media rootdan keyingi qism)
                relative_path = f"videos/{q['name']}/{output_filename}"
                
                # Field nomini dinamik aniqlab qiymat beramiz
                setattr(video, q['field'], relative_path)
                print(f"Generated {q['name']} version")
                
            except subprocess.CalledProcessError as e:
                print(f"Error generating {q['name']}: {e}")
                # Xatolik bo'lsa ham davom etamiz (balki kichikroq sifat o'xshar)
                continue
            except FileNotFoundError:
                 print("FFmpeg not found! Please install FFmpeg and add it to PATH.")
                 video.processing_status = 'failed'
                 video.save()
                 return

        video.processing_status = 'completed'
        video.save()
        print(f"Transcoding completed for video {video_id}")

    except Exception as e:
        print(f"Critical error: {e}")
        try:
            video = Video.objects.get(id=video_id)
            video.processing_status = 'failed'
            video.save()
        except:
            pass
