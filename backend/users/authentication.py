from rest_framework.authentication import BaseAuthentication

from users.services import get_auth_token, parse_bearer_token


class AuthTokenAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        raw_token = parse_bearer_token(request.headers.get('Authorization'))
        if raw_token is None:
            return None

        token = get_auth_token(raw_token)
        user = token.user
        return user, token
