# app/main.py
from fastapi import FastAPI, Request, UploadFile, File, Form, Depends, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from typing import Optional
import os
import re
import asyncio
import orjson

from .config import settings
from .db import init_pool, pool
from .auth import create_owner_token, get_current_user, require_owner

from .routes import (
    posts, projects, profile, experience, education, skills, languages,
    certificates_gallery, contact, proxy, health, upload, home
)

def orjson_dumps(v, *, default):
    return orjson.dumps(v, default=default).decode()

app = FastAPI(default_response_class=JSONResponse)

# ----------------------------- CORS ---------------------------------
_raw = settings.allowed_origins
if isinstance(_raw, str):
    _iter = _raw.split(",")
else:
    _iter = _raw or []

_allowed = {
    o.strip().rstrip("/")
    for o in _iter
    if isinstance(o, str) and o.strip()
}

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

# Web root for uploads
webroot = settings.web_root or os.path.join(os.path.dirname(__file__), "..", "uploads")
webroot = os.path.abspath(webroot)
os.makedirs(webroot, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=webroot), name="uploads")

# ----------------------------- Root route ---------------------------
@app.api_route("/", methods=["GET", "HEAD"])
async def _root():
    return PlainTextResponse("ok")
# --------------------------------------------------------------------

# Exception handler: dev-friendly JSON (catch-all)
@app.exception_handler(Exception)
async def all_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "path": str(request.url.path), "detail": str(exc)},
    )

# ---------------------- Try to import & register BIM -----------------
# If anything goes wrong here (file missing, case mismatch, syntax error),
# we log it but keep the app running so you can see why BIM is missing.
bim_loaded = False
try:
    from .routes.bim import router as bim_router, bim_validation_exception_handler
    app.add_exception_handler(RequestValidationError, bim_validation_exception_handler)
    # Register BIM BEFORE proxy so /api/bim isn't shadowed
    app.include_router(bim_router)
    bim_loaded = True
    print("[API] BIM router included ✅")
except Exception as e:
    bim_loaded = False
    print("[API] BIM router NOT included ❌ ->", repr(e))

# ----------------------------- Include routes -----------------------
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
app.include_router(upload.router)
app.include_router(home.router)

# Keep proxy LAST (catch-all patterns go here)
app.include_router(proxy.router)
# --------------------------------------------------------------------

def _mask_dsn(dsn: str) -> str:
    return re.sub(r"://([^:@/]+):([^@]+)@", r"://\1:***@", dsn or "")

# ===== Non-blocking DB initialization =====
DB_INIT_TASK = None

async def _init_pool_background():
    attempts = 20
    delay_sec = 3
    for i in range(1, attempts + 1):
        try:
            await init_pool(settings.database_url)
            print("[API] DB pool initialized ✅")
            return
        except Exception as e:
            print("[API] DB connect attempt {}/{} failed: {}: {}".format(
                i, attempts, e.__class__.__name__, e))
            await asyncio.sleep(delay_sec)
    print("[API] DB init gave up after {} attempts".format(attempts))

@app.on_event("startup")
async def _startup():
    masked = _mask_dsn(settings.database_url or "")
    print(f"[API] DATABASE_URL = {masked}")
    print(f"[API] DB_SSL_INSECURE = {os.getenv('DB_SSL_INSECURE','0')}")
    print(f"[API] Allowed Origins: {', '.join(sorted(_allowed)) or '(none)'}")
    if _allowed_regex:
        print(f"[API] Allowed Origin Regex: {_allowed_regex}")
    print(f"[API] Token lifetime (minutes): {settings.token_minutes}")
    print(f"[API] BIM loaded: {bim_loaded}")

    global DB_INIT_TASK
    DB_INIT_TASK = asyncio.create_task(_init_pool_background())

    # Print registered routes (helpful in logs)
    for r in app.routes:
        try:
            print("ROUTE", getattr(r, "methods", ""), r.path)
        except Exception:
            pass

# Optional: readiness that reflects DB status (still cheap)
@app.get("/api/health/ready", response_class=PlainTextResponse)
async def _ready():
    try:
        if pool is None:
            return PlainTextResponse("starting", status_code=503)
        return PlainTextResponse("ok")
    except Exception as e:
        return PlainTextResponse("error: {}".format(e), status_code=503)

# Tiny introspection endpoint to see routes live in AWS
@app.get("/api/_routes", response_class=JSONResponse)
async def _routes():
    return [
        {"methods": sorted(list(getattr(r, "methods", set()))), "path": getattr(r, "path", "")}
        for r in app.routes
    ]

# -------- Auth endpoints (owner) --------
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
    claims = [{"Type": k, "Value": str(v)} for k, v in user.items()]
    return {"ok": True, "claims": claims}

app.include_router(auth_router)
