from django.conf import settings
from django.http import HttpResponse


class DevCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allow_origin = self._is_allowed_origin(origin)

        if request.method == "OPTIONS" and request.headers.get("Access-Control-Request-Method"):
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        if allow_origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = request.headers.get(
                "Access-Control-Request-Headers",
                "Authorization, Content-Type",
            )
            response["Access-Control-Max-Age"] = "86400"

        return response

    def _is_allowed_origin(self, origin: str | None) -> bool:
        if not origin:
            return False
        allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        return origin in allowed_origins
