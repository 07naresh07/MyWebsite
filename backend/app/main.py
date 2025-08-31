from fastapi import FastAPI, Request, UploadFile, File, Form, Depends, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import os
import re
import asyncio
import orjson

from .config import settings
from .db import init_pool, pool
from .routes import home
from .auth import create_owner_token, get_current_user, require_owner

from .routes import (
    posts, projects, profile, experience, education, skills, languages,
    certificates_gallery, contact, proxy, health, upload,
    home,  # ← added
)

def orjson_dumps(v, *, default):
    return orjson.dumps(v, default=default).decode()

app = FastAPI(default_response_class=JSONResponse)

# ----------------------------- CORS ---------------------------------
# Accept ALLOWED_ORIGINS as comma-separated list or python list
_raw = settings.allowed_origins
if isinstance(_raw, str):
    _iter = _raw.split(",")
else:
    _iter = _raw or []

# Normalize: strip spaces, drop trailing slashes, ignore empties
_allowed = {
    o.strip().rstrip("/")
    for o in _iter
    if isinstance(o, str) and o.strip()
}

# Optional regex (e.g., to allow all Vercel previews: https://.*\.vercel\.app)
_allowed_regex = getattr(settings, "allowed_origin_regex", None)

cors_common = dict(
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if _allowed_regex:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=_allowed_regex,
        **cors_common,
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(_allowed),
        **cors_common,
    )
# --------------------------------------------------------------------

# web root for uploads
webroot = settings.web_root or os.path.join(os.path.dirname(__file__), "..", "uploads")
webroot = os.path.abspath(webroot)
os.makedirs(webroot, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=webroot), name="uploads")

# Exception handler: dev-friendly JSON
@app.exception_handler(Exception)
async def all_exception_handler(request: Request, exc: Exception):
    # In production you might hide details; here we show minimal details
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "path": str(request.url.path), "detail": str(exc)},
    )

# Include routes
app.include_router(health.router)
app.include_router(posts.router)
app.include_router(projects.router)
app.include_router(profile.router)
app.include_router(experience.router)
app.include_router(education.router)
app.include_router(skills.router)
app.include_router(languages.router)
app.include_router(certificates_gallery.router)
app.include_router(contact.router)
app.include_router(proxy.router)
app.include_router(upload.router)
app.include_router(home.router)  # ← added

def _mask_dsn(dsn: str) -> str:
    # postgresql://user:pass@host:port/db -> mask pass
    return re.sub(r"://([^:@/]+):([^@]+)@", r"://\1:***@", dsn or "")

@app.on_event("startup")
async def _startup():
    # Log the DSN the server is ACTUALLY using (masked)
    masked = _mask_dsn(settings.database_url or "")
    print(f"[API] DATABASE_URL = {masked}")
    print(f"[API] DB_SSL_INSECURE = {os.getenv('DB_SSL_INSECURE','0')}")
    print(f"[API] Allowed Origins: {', '.join(sorted(_allowed)) or '(none)'}")
    if _allowed_regex:
        print(f"[API] Allowed Origin Regex: {_allowed_regex}")
    print(f"[API] Token lifetime (minutes): {settings.token_minutes}")

    # Robust DB init with small retry/backoff (helps when pooler/DB is waking up)
    attempts = 5
    for i in range(1, attempts + 1):
        try:
            await init_pool(settings.database_url)
            print("[API] DB pool initialized ✅")
            break
        except Exception as e:
            print(f"[API] DB connect attempt {i}/{attempts} failed: {e.__class__.__name__}: {e}")
            if i == attempts:
                # Re-raise so startup fails loudly after final attempt
                raise
            await asyncio.sleep(2 * i)  # backoff: 2s, 4s, 6s, ...

# Auth endpoints (owner)
auth_router = APIRouter()

@auth_router.post("/api/auth/owner")
async def auth_owner(pass_: str = Form(...)):
    if not settings.owner_pass:
        raise HTTPException(status_code=400, detail="Owner auth not configured.")
    if (pass_ or "").strip() != settings.owner_pass:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"token": create_owner_token()}

@auth_router.get("/api/auth/me")
async def auth_me(user = Depends(get_current_user)):
    # mirror C# by returning claims-like structure
    claims = [{"Type": k, "Value": str(v)} for k, v in user.items()]
    return {"ok": True, "claims": claims}

app.include_router(auth_router)
app.include_router(home.router)