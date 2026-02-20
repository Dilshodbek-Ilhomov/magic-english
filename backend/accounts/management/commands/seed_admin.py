"""
Admin foydalanuvchini yaratish management buyrug'i
Ishlatish: python manage.py seed_admin
"""

from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Standart admin foydalanuvchini yaratadi'

    def handle(self, *args, **options):
        if User.objects.filter(username='admin').exists():
            self.stdout.write(self.style.WARNING('Admin foydalanuvchi allaqachon mavjud'))
            return

        admin = User.objects.create_superuser(
            username='admin',
            password='admin123',
            email='admin@englishlearning.uz',
            first_name='Admin',
            last_name='User',
            role='admin',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Admin yaratildi: {admin.username} (parol: admin123)'
        ))
