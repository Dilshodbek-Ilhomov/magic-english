import os
import django

# Django sozlamalarini yuklash
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

# Admin ma'lumotlari
username = 'admin'
email = 'admin@example.com'
password = 'AdminPassword123!' # Buni o'zingizga qulayiga o'zgartiring

if not User.objects.filter(username=username).exists():
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        role='admin' # Sizning modelingizdagi maxsus rol
    )
    print(f"Muvaffaqiyatli: Admin '{username}' yaratildi!")
else:
    print(f"Xato: '{username}' ismli foydalanuvchi allaqachon mavjud.")
