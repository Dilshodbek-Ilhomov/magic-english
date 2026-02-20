# 🚀 Magic English Platformasini Bepul Deploy (Internetga chiqarish) Qilish Bo'yicha Yo'riqnoma

Ushbu yo'riqnoma orqali siz saytingizning frontend va backend qismlarini bir tiyin ishlatmasdan internetga chiqarishingiz mumkin.

## 🛠 Kerakli xizmatlar (Hammasi tekin rejasiga ega):
1. **GitHub** — Kodlarni saqlash va deploy markazi.
2. **Neon.tech** — PostgreSQL ma'lumotlar bazasi uchun.
3. **Render.com** — Django (Backend) ni ishga tushirish uchun.
4. **Vercel.com** — Next.js (Frontend) ni ishga tushirish uchun.
5. **Cloudinary.com** — Rasmlar va Videolarni saqlash uchun.

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

## 3-Qadam: Media saqlash (Cloudinary)
Django serverlari (Render/Koyeb) videolarni saqlash imkonini bermaydi (o'chib ketadi). Shuning uchun:
1. [cloudinary.com](https://cloudinary.com/)-dan ro'yxatdan o'ting.
2. `Dashboard`-dan quyidagilarni oling:
    *   `Cloud Name`
    *   `API Key`
    *   `API Secret`
3. Django `settings.py` faylida `cloudinary` ni sozlang (agar sozlanmagan bo'lsa, men yordam beraman).

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
    *   `CLOUDINARY_URL`: (Cloudinary-dan olingan API havola)

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
