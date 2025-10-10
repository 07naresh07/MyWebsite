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
import traceback

from .config import settings
from .db import init_pool, pool
from .auth import create_owner_token, get_current_user, require_owner

from .routes import (
    posts, projects, profile, experience, education, skills, languages,
    certificates_gallery, contact, proxy, health, upload, home, bim
)


def orjson_dumps(v, *, default):
    return orjson.dumps(v, default=default).decode()

# Use JSONResponse (you can switch to ORJSONResponse app-wide later)
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

# Auto-augment with local dev and Vercel if present (non-breaking)
vercel_url = os.getenv("VERCEL_URL", "").strip()  # e.g., myapp.vercel.app
if vercel_url:
    _allowed.add(f"https://{vercel_url}")
# Common dev origins (ignored if settings already specify)
_allowed.update({
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
})

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
        allow_origins=sorted(list(_allowed)) or ["*"],  # fallback to * if nothing configured
        **cors_common,
    )
# --------------------------------------------------------------------

# Web root for uploads
webroot = settings.web_root or os.path.join(os.path.dirname(__file__), "..", "uploads")
webroot = os.path.abspath(webroot)
os.makedirs(webroot, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=webroot), name="uploads")

# ----------------------------- Root routes & health -----------------
@app.api_route("/", methods=["GET", "HEAD"])
async def _root():
    # App Runner health check friendly
    return PlainTextResponse("ok")

# Optional: API base ping (helps frontend base-URL tests)
@app.get("/api", response_class=PlainTextResponse)
async def _api_root():
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
# Keep BIM before any catch-all/proxy so it isn't shadowed.
bim_loaded = False
try:
    from .routes.bim import router as bim_router, bim_validation_exception_handler
    # Let BIM customize RequestValidationError (e.g., orjson-friendly)
    app.add_exception_handler(RequestValidationError, bim_validation_exception_handler)
    # 🔑 Mount EXACTLY ONCE — router already has prefix="/api/bim"
    app.include_router(bim_router)
    bim_loaded = True
    print("[API] BIM router included ✅")

except Exception as e:
    bim_loaded = False
    print("[API] BIM router NOT included ❌ ->", repr(e))
    print("[API] BIM import traceback:\n" + traceback.format_exc())
    shim = APIRouter(prefix="/api/bim", tags=["bim(shim)"])

    @shim.get("/health", response_class=PlainTextResponse, summary="BIM health (shim)")
    async def _bim_health_missing():
        return PlainTextResponse("bim router not loaded in this build", status_code=503)

    @shim.get("/", response_class=JSONResponse, summary="BIM root (shim)")
    @shim.get("", response_class=JSONResponse, summary="BIM root (shim)")
    async def _bim_root_missing():
        return JSONResponse({"error": "bim router not loaded"}, status_code=503)

    app.include_router(shim)

# ----------------------------- Include routes -----------------------
# Specific routers
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
    return re.sub(r"://([^:@/]+):([^@]+)@", r"://\:***@", dsn or "")

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
    print(f"[API] Docs: /docs  |  Redoc: /redoc  |  Routes dump: /api/_routes")

    global DB_INIT_TASK
    DB_INIT_TASK = asyncio.create_task(_init_pool_background())

    # Print registered routes (helpful in logs)
    for r in app.routes:
        try:
            print("ROUTE", getattr(r, "methods", ""), r.path)
        except Exception:
            pass

# -------- Health / introspection --------
@app.get("/api/health/ready", response_class=PlainTextResponse)
async def _ready():
    try:
        if pool is None:
            return PlainTextResponse("starting", status_code=503)
        return PlainTextResponse("ok")
    except Exception as e:
        return PlainTextResponse("error: {}".format(e), status_code=503)

@app.get("/api/_routes", response_class=JSONResponse)
async def _routes():
    return [
        {"methods": sorted(list(getattr(r, "methods", set()))), "path": getattr(r, "path", "")}
        for r in app.routes
    ]

@app.get("/api/_meta", response_class=JSONResponse)
async def _meta():
    return {"bim_loaded": bim_loaded}

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
