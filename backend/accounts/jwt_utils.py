import base64
import hashlib
import hmac
import json
import time
from datetime import timedelta

from django.conf import settings


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _json_bytes(data: dict) -> bytes:
    return json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")


def build_access_token(user, expires_in: timedelta | None = None) -> str:
    if expires_in is None:
        expires_in = timedelta(minutes=60)

    now = int(time.time())
    payload = {
        "sub": str(user.pk),
        "username": user.username,
        "role": user.role.name if user.role else None,
        "iat": now,
        "exp": now + int(expires_in.total_seconds()),
    }
    header = {"alg": "HS256", "typ": "JWT"}

    header_b64 = _b64url_encode(_json_bytes(header))
    payload_b64 = _b64url_encode(_json_bytes(payload))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"
