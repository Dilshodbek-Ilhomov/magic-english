"""
Xavfsizlik yordamchi funksiyalari
- Xavfsizlik logini yaratish
- IP manzilni olish
- Video URL imzolash
"""

import hmac
import hashlib
import time
import logging
from analytics.models import SecurityLog

logger = logging.getLogger('accounts')


def get_client_ip(request):
    """So'rovdan foydalanuvchi IP manzilini oladi"""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def log_security_event(user, action, request=None, metadata=None):
    """Xavfsizlik hodisasini bazaga yozadi"""
    try:
        SecurityLog.objects.create(
            user=user,
            action=action,
            ip_address=get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
            metadata=metadata or {},
        )
    except Exception as e:
        logger.error(f"Xavfsizlik logini yozishda xato: {e}")


def generate_signed_video_url(video_id, user_id, signing_key, expiry_seconds=3600):
    """Video uchun imzolangan URL yaratadi"""
    expires = int(time.time()) + expiry_seconds
    message = f"{video_id}:{user_id}:{expires}"
    signature = hmac.new(
        signing_key.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        'video_id': video_id,
        'user_id': user_id,
        'expires': expires,
        'signature': signature,
    }


def verify_video_signature(video_id, user_id, expires, signature, signing_key):
    """Video URL imzosini tekshiradi"""
    try:
        if int(time.time()) > int(expires):
            return False  # Muddati o'tgan
    except (ValueError, TypeError):
        return False

    message = f"{video_id}:{user_id}:{expires}"
    expected = hmac.new(
        signing_key.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
