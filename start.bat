@echo off
chcp 65001 >nul
echo.
echo  ✦ MagicEnglish Platform - Ishga tushirilmoqda...
echo  ================================================
echo.

:: Backend serverni ishga tushirish
echo  🔧 Django backend ishga tushmoqda (port 8000)...
start "Django Backend" cmd /c "cd /d %~dp0backend && python manage.py runserver 8000"

:: 2 soniya kutish
timeout /t 2 /nobreak >nul

:: Frontend serverni ishga tushirish
echo  🎨 Next.js frontend ishga tushmoqda (port 3000)...
start "Next.js Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

:: 3 soniya kutish
timeout /t 3 /nobreak >nul

echo.
echo  ✅ Tayyor! Brauzerda oching:
echo.
echo     👉 http://localhost:3000
echo.
echo  ================================================
echo  Django API:    http://localhost:8000/api/
echo  Django Admin:  http://localhost:8000/django-admin/
echo  ================================================
echo.
echo  Yopish uchun bu oynani va ikkita server oynasini yoping.
pause
