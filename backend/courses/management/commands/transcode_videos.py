from django.core.management.base import BaseCommand
from courses.models import Video
from courses.services import transcode_video

class Command(BaseCommand):
    help = 'Transcode videos that are pending or all videos'

    def add_arguments(self, parser):
        parser.add_argument('--all', action='store_true', help='Reprocess all videos')
        parser.add_argument('--id', type=str, help='Process specific video ID')

    def handle(self, *args, **options):
        if options['id']:
            videos = Video.objects.filter(id=options['id'])
        elif options['all']:
            videos = Video.objects.all()
        else:
            # Default: faqat 'pending' bo'lganlar yoki sifatlari yo'qlar
             videos = Video.objects.filter(processing_status='pending')

        self.stdout.write(f"Found {videos.count()} videos to process...")

        for video in videos:
            self.stdout.write(f"Processing: {video.title} ({video.id})")
            transcode_video(video.id)
            
        self.stdout.write(self.style.SUCCESS("Barcha vazifalar bajarildi!"))
