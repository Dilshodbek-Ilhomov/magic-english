# 🚀 Magic English Platformasini Bepul Deploy (Internetga chiqarish) Qilish Bo'yicha Yo'riqnoma

Ushbu yo'riqnoma orqali siz saytingizning frontend va backend qismlarini bir tiyin ishlatmasdan internetga chiqarishingiz mumkin.

## 🛠 Kerakli xizmatlar (Hammasi tekin rejasiga ega):
1. **GitHub** — Kodlarni saqlash va deploy markazi.
2. **Neon.tech** — PostgreSQL ma'lumotlar bazasi uchun.
3. **Render.com** — Django (Backend) ni ishga tushirish uchun.
4. **Vercel.com** — Next.js (Frontend) ni ishga tushirish uchun.
5. **Supabase** — Ma'lumotlar bazasi yoki Media (Video/Rasm) saqlash uchun.

---

## 1-Qadam: GitHub-ga yuklash
Barcha kodlaringizni GitHub-ga yuklang. Sizda 2 xil yo'l bor:
*   Alohida repozitoriya: `magic-backend` va `magic-frontend`.
*   Bitta repozitoriya (Monorepo): Ikkalasi bir joyda.

---

## 2-Qadam: Ma'lumotlar bazasini sozlash (Neon.tech)
1. [neon.tech](https://neon.tech/) saytida ro'yxatdan o'ting.
2. Yangi loyiha yarating.
3. Sizga berilgan `DATABASE_URL` (Connection String) ni nusxalab oling.
    *   *Namuna:* `postgres://user:password@hostname/dbname?sslmode=require`

---

## 3-Qadam: Media saqlash (Supabase Storage)
Django serverlari (Render) videolarni saqlash imkonini bermaydi. Cloudinary O'zbekistonda muammo qilishi mumkinligi sababli Supabase Storage-dan foydalanamiz:
1. [Supabase.com](https://supabase.com/)-ga kiring va loyiha yarating.
2. `Storage` bo'limiga o'ting va yangi `media` nomli bucket yarating (Public qilib belgilang).
3. `Project Settings` -> `Storage` bo'limidan `S3 Settings`-ni yoqing.
4. Quyidagi ma'lumotlarni oling:
    *   `Endpoint` (S3 URL)
    *   `Access Key ID`
    *   `Secret Access Key`
    *   `Region` (odatda `us-east-1`)

---

## 4-Qadam: Backend Deploy (Render.com)
1. [Render.com](https://render.com/)-ga GitHub orqali kiring.
2. `New` -> `Web Service` tugmasini bosing va backend repozitoriyangizni tanlang.
3. Quyidagi sozlamalarni kiriting:
    *   **Environment**: `Python`
    *   **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
    *   **Start Command**: `gunicorn config.wsgi`
4. **Advanced** -> **Environment Variables** bo'limiga quyidagilarni qo'shing:
    *   `DATABASE_URL`: (Neon-dan olingan havola)
    *   `SECRET_KEY`: (O'zingizning maxfiy kalitingiz)
    *   `DEBUG`: `False`
    *   `ALLOWED_HOSTS`: `your-backend-url.onrender.com`
    *   `AWS_ACCESS_KEY_ID`: (Supabase S3 Access Key)
    *   `AWS_SECRET_ACCESS_KEY`: (Supabase S3 Secret Key)
    *   `AWS_STORAGE_BUCKET_NAME`: `media`
    *   `AWS_S3_ENDPOINT_URL`: (Supabase S3 Endpoint URL)

---

## 5-Qadam: Frontend Deploy (Vercel.com)
1. [Vercel.com](https://vercel.com/)-ga kiring.
2. `Add New` -> `Project` tugmasini bosing va frontend repozitoriyangizni tanlang.
3. **Environment Variables** bo'limiga quyidagini qo'shing:
    *   `NEXT_PUBLIC_API_URL`: `https://your-backend-url.onrender.com/api` (Render-dagi backend manzilingiz)
4. `Deploy` tugmasini bosing.

---

## 6-Qadam: Admin yaratish
Backend ishga tushgandan keyin Render terminalida (yoki SSH orqali) quyidagi buyruqni bering:
```bash
python manage.py createsuperuser
```
Va admin panelga kirib darslarni yuklashni boshlang.

---

## 💡 Muhim tavsiyalar:
*   **Video Hajmi:** Tekin rejada Cloudinary hajmi cheklangan (25 GB). Videolarni yuklashdan oldin ularni siqishni (compress) maslahat beraman.
*   **Backend "Uxlashi":** Render tekin rejasi 15 daqiqa faollik bo'lmasa, serverni uxlatiib qo'yadi. Saytga birinchi kirganda 30 soniya kutish kerak bo'ladi. Buni oldini olish uchun [cron-job.org](https://cron-job.org/) orqali har 10 minutda ping yuborib turish mumkin.

Agar biror qadamda xatolik chiqsa, menga ayting, darhol tuzatamiz! 🧙‍♂️
