# app/auth.py
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from fastapi import HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from .config import settings

ALGO = "HS256"
security = HTTPBearer(auto_error=False)

def create_owner_token() -> str:
    now = datetime.now(tz=timezone.utc)
    exp = now + timedelta(minutes=settings.token_minutes or 120)
    payload = {
        "role": "owner",
        "nbf": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token - used by BIM router"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
        # Check if token is expired
        exp = payload.get("exp")
        if exp:
            now = datetime.now(tz=timezone.utc).timestamp()
            if now > exp:
                raise HTTPException(status_code=401, detail="Token expired")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    x_owner_token: str | None = Header(default=None, alias="X-Owner-Token"),
    token_qs: str | None = None,
):
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    elif x_owner_token:
        token = x_owner_token
    elif token_qs:
        token = token_qs

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    payload = decode_token(token)
    return payload

async def require_owner(user = Depends(get_current_user)):
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user