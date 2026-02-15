from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .jwt_utils import decode_access_token


class JWTAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth:
            return None
        if auth[0].decode("utf-8").lower() != self.keyword.lower():
            return None
        if len(auth) != 2:
            raise AuthenticationFailed("Invalid authorization header.")

        token = auth[1].decode("utf-8")
        try:
            payload = decode_access_token(token)
        except ValueError as exc:
            raise AuthenticationFailed(str(exc)) from exc

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationFailed("Token subject is missing.")

        try:
            user = get_user_model().objects.select_related("role").get(pk=user_id)
        except get_user_model().DoesNotExist as exc:
            raise AuthenticationFailed("User not found.") from exc

        if not user.is_active:
            raise AuthenticationFailed("User is inactive.")

        return user, None
