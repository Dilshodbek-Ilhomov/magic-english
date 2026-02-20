"""
Xatolarni boshqarish - Professional error handling
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Barcha API xatolarini standart formatda qaytaradi"""
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': _get_error_message(response),
            }
        }
        response.data = custom_data
    else:
        # Kutilmagan xato
        logger.error(f"Kutilmagan xato: {exc}", exc_info=True)
        return Response({
            'success': False,
            'error': {
                'code': 500,
                'message': 'Serverda xatolik yuz berdi',
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response


def _get_error_message(response):
    """Xato xabarini formatlaydi"""
    if isinstance(response.data, dict):
        messages = []
        for key, value in response.data.items():
            if isinstance(value, list):
                messages.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                messages.append(f"{key}: {value}")
        return '; '.join(messages) if messages else 'Xatolik yuz berdi'
    elif isinstance(response.data, list):
        return '; '.join(str(item) for item in response.data)
    return str(response.data)
