from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=True)

_jwks_clients: dict[str, PyJWKClient] = {}


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    email: str | None
    role: str


class TokenError(Exception):
    pass


def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    """Supabase JWKS keys rotate rarely; one client per URL is cached for TTL."""
    client = _jwks_clients.get(jwks_url)
    if client is None:
        client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
        _jwks_clients[jwks_url] = client
    return client


def _decode_hs256(token: str, secret: str, audience: str) -> dict:
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience=audience,
    )


def _decode_es256(token: str, jwks_url: str, audience: str) -> dict:
    client = _get_jwks_client(jwks_url)
    signing_key = client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience=audience,
    )


def decode_supabase_jwt(
    token: str,
    settings: Settings,
    audience: str = "authenticated",
) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise TokenError(f"Invalid token: {exc}") from exc

    alg = header.get("alg")
    try:
        if alg == "ES256":
            return _decode_es256(token, settings.jwks_url, audience)
        if alg == "HS256":
            return _decode_hs256(token, settings.supabase_jwt_secret, audience)
        raise TokenError(f"Unsupported JWT algorithm: {alg}")
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token expired") from exc
    except jwt.PyJWKClientError as exc:
        raise TokenError(f"Invalid token: JWKS key not found ({exc})") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError(f"Invalid token: {exc}") from exc


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    try:
        payload = decode_supabase_jwt(creds.credentials, settings)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject (user_id)",
        )

    return CurrentUser(
        user_id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
    )
