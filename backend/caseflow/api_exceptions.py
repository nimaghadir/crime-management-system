import logging

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _normalize_detail(value):
    if isinstance(value, ErrorDetail):
        return str(value)
    if isinstance(value, list):
        return [_normalize_detail(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_detail(item) for key, item in value.items()}
    return value


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        if settings.DEBUG:
            return None
        logger.exception("Unhandled API exception", exc_info=exc)
        return Response(
            {
                "error": {
                    "code": "server_error",
                    "message": "Internal server error.",
                    "details": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    details = _normalize_detail(response.data)
    code = getattr(exc, "default_code", "api_error")

    if isinstance(exc, ValidationError):
        message = "Validation error."
        code = "validation_error"
    elif isinstance(details, dict) and isinstance(details.get("detail"), str):
        message = details["detail"]
    elif isinstance(details, str):
        message = details
    else:
        message = "Request failed."

    response.data = {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        }
    }
    return response
