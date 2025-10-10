# app/routes/bim.py
from __future__ import annotations
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.exception_handlers import request_validation_exception_handler as default_validation_handler
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from pathlib import Path
import uuid, shutil, asyncio, base64, os
import orjson

from .. import db
from ..config import settings

__all__ = ["router"]

# NOTE: keep this exact prefix so /api/bim and /api/bim/ are handled
router = APIRouter(prefix="/api/bim", tags=["bim"])

# ------------------------- helpers / handlers -------------------------
def _safe_jsonable(val):
    if isinstance(val, (bytes, bytearray)):
        return {"__bytes_b64__": base64.b64encode(val).decode("ascii")}
    if isinstance(val, dict):
        return {k: _safe_jsonable(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_safe_jsonable(v) for v in val]
    return val

async def bim_validation_exception_handler(request: Request, exc: RequestValidationError):
    # If wired in app/main.py, this limits noisy 422 bodies to this router only
    if request.url.path.startswith("/api/bim"):
        return JSONResponse(status_code=422, content={"detail": _safe_jsonable(exc.errors())})
    return await default_validation_handler(request, exc)

async def _get_pool(timeout_sec: float = 5.0):
    """Get (or init) the asyncpg pool. Works with db.get_pool() or db.pool variable."""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout_sec
    last_err = None
    while True:
        p = None
        # 1) preferred helper
        if hasattr(db, "get_pool") and callable(db.get_pool):
            try:
                p = db.get_pool()
            except Exception as e:
                last_err, p = e, None
        # 2) direct variable (your main imports `pool` as a variable)
        if p is None and hasattr(db, "pool"):
            try:
                p = db.pool() if callable(db.pool) else db.pool
            except Exception as e:
                last_err, p = e, None

        if p is not None and hasattr(p, "acquire"):
            return p

        # 3) try init if possible
        if hasattr(db, "init_pool") and callable(db.init_pool) and getattr(settings, "database_url", None):
            try:
                await db.init_pool(settings.database_url)
            except Exception as e:
                last_err = e

        if loop.time() >= deadline:
            break
        await asyncio.sleep(0.1)

    # Don't raise here for base routes; callers can decide to fallback
    raise HTTPException(status_code=503, detail=f"Database not ready: {last_err or 'initializing'}")

# ------------------------------ models --------------------------------
class BimBlock(BaseModel):
    type: Literal["text", "image", "code", "h1", "h2"]
    value: str
    language: Optional[str] = None

class BimCreate(BaseModel):
    title: str = Field(default="BIM Notes", max_length=200)
    blocks: List[BimBlock] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

class BimUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    blocks: Optional[List[BimBlock]] = None
    tags: Optional[List[str]] = None

_LANG_MAP = {
    None: None,
    "js": "js", "javascript": "js",
    "ts": "ts", "typescript": "ts",
    "py": "py", "python": "py",
    "html": "html",
    "css": "css",
}

def _normalize_block(b: BimBlock) -> dict:
    t = b.type
    lang = None
    if t == "code":
        key = (b.language or "").strip().lower() or None
        lang = _LANG_MAP.get(key, "js")
    return {"type": t, "value": b.value or "", "language": lang}

def _normalize_blocks(blocks: List[BimBlock]) -> List[dict]:
    return [_normalize_block(b) for b in blocks]

# ------------------------------- SQL ---------------------------------
LIST_SQL = """
select
  e.id, e.title, e.created_at,
  coalesce(e.tags, '{}') as tags,
  coalesce(
    json_agg(
      json_build_object('type', b.type, 'value', b.value, 'language', b.language)
      order by b.idx
    ) filter (where b.id is not null),
    '[]'::json
  ) as blocks
from public.bim_entries e
left join public.bim_blocks b on b.entry_id = e.id
group by e.id
order by e.created_at desc;
"""

GET_ONE_SQL = """
select
  e.id, e.title, e.created_at,
  coalesce(e.tags, '{}') as tags,
  coalesce(
    json_agg(
      json_build_object('type', b.type, 'value', b.value, 'language', b.language)
      order by b.idx
    ) filter (where b.id is not null),
    '[]'::json
  ) as blocks
from public.bim_entries e
left join public.bim_blocks b on b.entry_id = e.id
where e.id = $1
group by e.id;
"""

INSERT_ENTRY_SQL = "insert into public.bim_entries (title, tags) values ($1, $2) returning id, title, created_at, tags;"
INSERT_BLOCK_SQL_RETURNING = (
    "insert into public.bim_blocks (entry_id, idx, type, value, language) "
    "values ($1, $2, $3, $4, $5) returning id;"
)
DELETE_BLOCKS_SQL = "delete from public.bim_blocks where entry_id = $1;"
DELETE_ENTRY_SQL  = "delete from public.bim_entries where id = $1;"
UPDATE_ENTRY_SQL  = "update public.bim_entries set title = $2, tags = $3 where id = $1 returning id;"

from asyncpg import exceptions as pgexc

FIND_ATTACHED_SEQ_SQL = """
SELECT n.nspname||'.'||s.relname
FROM pg_class s
JOIN pg_namespace n ON n.oid = s.relnamespace
JOIN pg_depend d    ON d.objid = s.oid
JOIN pg_class t     ON t.oid = d.refobjid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
WHERE s.relkind = 'S'
  AND n.nspname = 'public'
  AND t.relname = 'bim_blocks'
  AND a.attname = 'id'
LIMIT 1;
"""

RESET_SEQ_TO_MAX_SQL = """
SELECT setval($1, (SELECT COALESCE(MAX(id),0)+1 FROM public.bim_blocks), false);
"""

LOG_BIM_SEQ = os.getenv("LOG_BIM_SEQ", "0") == "1"

async def _insert_block_with_retry(conn, entry_id, i, b):
    try:
        row = await conn.fetchrow(INSERT_BLOCK_SQL_RETURNING, entry_id, i, b["type"], b["value"], b["language"])
        if LOG_BIM_SEQ:
            print("[bim] insert ok -> id", row["id"])
        return
    except pgexc.UniqueViolationError as e:
        if 'bim_blocks_pkey' not in str(e):
            raise
        if LOG_BIM_SEQ:
            print("[bim] duplicate on first try; attempting seq reset")

    seqname = await conn.fetchval(FIND_ATTACHED_SEQ_SQL)
    if seqname:
        await conn.execute(RESET_SEQ_TO_MAX_SQL, seqname)
        try:
            row = await conn.fetchrow(INSERT_BLOCK_SQL_RETURNING, entry_id, i, b["type"], b["value"], b["language"])
            if LOG_BIM_SEQ:
                print("[bim] after reset -> id", row["id"])
            return
        except pgexc.UniqueViolationError as e2:
            if 'bim_blocks_pkey' not in str(e2):
                raise
            if LOG_BIM_SEQ:
                print("[bim] duplicate even after reset; falling back")

    await conn.execute("SELECT pg_advisory_xact_lock(hashtext('public.bim_blocks.id'));")
    next_id_row = await conn.fetchrow(
        "SELECT GREATEST(COALESCE(MAX(id),0)+1, (SELECT last_value FROM public.bim_blocks_id_seq)+1) AS nid "
        "FROM public.bim_blocks;"
    )
    next_id = int(next_id_row["nid"])
    for bump in (0, 10, 100):
        try:
            nid = next_id + bump
            await conn.execute(
                "INSERT INTO public.bim_blocks (id, entry_id, idx, type, value, language) "
                "VALUES ($1, $2, $3, $4, $5, $6);",
                nid, entry_id, i, b["type"], b["value"], b["language"]
            )
            if LOG_BIM_SEQ:
                print("[bim] fallback explicit id ->", nid)
            return
        except pgexc.UniqueViolationError as e3:
            if 'bim_blocks_pkey' not in str(e3):
                raise
            continue
    raise HTTPException(status_code=500, detail="Could not allocate unique id for bim_blocks")

# ----------------------------- uploads --------------------------------
DEFAULT_UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR = Path(settings.web_root or DEFAULT_UPLOAD_ROOT)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload-image")
@router.post("/upload-image/")
async def upload_image(
    file: UploadFile | None = File(None, alias="file"),
    image: UploadFile | None = File(None, alias="image")
):
    up = file or image
    if up is None:
        raise HTTPException(status_code=400, detail="No file provided. Use form field 'file' (or 'image').")

    ctype = (up.content_type or "").lower()
    ext = Path(up.filename or "").suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        if   ctype == "image/jpeg": ext = ".jpg"
        elif ctype == "image/png":  ext = ".png"
        elif ctype == "image/gif":  ext = ".gif"
        elif ctype == "image/webp": ext = ".webp"
        else:                       ext = ".png"

    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    try:
        with dest.open("wb") as out:
            shutil.copyfileobj(up.file, out)
    finally:
        try: up.file.close()
        except Exception: pass

    return {"url": f"/uploads/{name}", "filename": name, "content_type": ctype}

# ------------------------------- API ---------------------------------
# Helper to parse JSON fields coming from SQL

def _row_to_dict_with_parsed_blocks(row) -> dict:
    d = dict(row)
    if isinstance(d.get("blocks"), str):
        d["blocks"] = orjson.loads(d["blocks"])
    return d

# ✅ Base routes so /api/bim and /api/bim/ NEVER 404
@router.get("", summary="BIM root — minimal index (safe if DB down)")
@router.get("/", summary="BIM root — minimal index (safe if DB down)")
async def bim_root():
    """Return the FULL list of BIM entries including blocks (previous behavior).
    - If the DB is temporarily unavailable, return an **empty list** (same shape)
      so the frontend doesn't break waiting for an array.
    """
    try:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(LIST_SQL)
            return [_row_to_dict_with_parsed_blocks(r) for r in rows]
    except Exception:
        # Preserve response shape expected by the UI (list/array)
        return []

@router.get("/health", summary="Readiness for BIM router")
async def bim_health():
    try:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            await conn.fetchrow("SELECT 1;")
        return {"status": "healthy", "db": "ok"}
    except Exception as e:
        return {"status": "degraded", "db_error": str(e)}

# HEAD / OPTIONS for safer health/preflight at the prefix
@router.head("/")
@router.head("")
async def bim_head():
    return PlainTextResponse("", status_code=200)

@router.options("/")
@router.options("")
async def bim_options():
    return PlainTextResponse("", status_code=200)

# Diagnostics
@router.get("/_meta")
async def bim_meta():
    try:
        pool = await _get_pool()
        ok = pool is not None
    except Exception as e:
        return {"ok": False, "error": str(e)}
    return {"ok": True}

@router.get("/{entry_id}")
async def get_entry(entry_id: int):
    pool = await _get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        d = dict(row)
        if isinstance(d.get("blocks"), str):
            d["blocks"] = orjson.loads(d["blocks"])
        return d

@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_entry(payload: BimCreate):
    if not payload.blocks:
        raise HTTPException(status_code=400, detail="At least one block required")
    pool = await _get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            e = await conn.fetchrow(INSERT_ENTRY_SQL, payload.title.strip(), payload.tags or [])
            entry_id = e["id"]
            for i, b in enumerate(_normalize_blocks(payload.blocks)):
                await _insert_block_with_retry(conn, entry_id, i, b)
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        d = dict(row)
        if isinstance(d.get("blocks"), str):
            d["blocks"] = orjson.loads(d["blocks"])
        return d

@router.put("/{entry_id}")
@router.put("/{entry_id}/")
async def update_entry(entry_id: int, payload: BimUpdate):
    if payload.title is None or payload.blocks is None:
        raise HTTPException(status_code=400, detail="PUT requires 'title' and 'blocks'")
    if not payload.blocks:
        raise HTTPException(status_code=400, detail="At least one block required")

    title = payload.title.strip()
    tags  = payload.tags or []
    norm  = _normalize_blocks(payload.blocks)

    pool = await _get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchrow("select id from public.bim_entries where id = $1;", entry_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Not found")

        async with conn.transaction():
            await conn.fetchrow(UPDATE_ENTRY_SQL, entry_id, title, tags)
            await conn.execute(DELETE_BLOCKS_SQL, entry_id)
            for i, b in enumerate(norm):
                await _insert_block_with_retry(conn, entry_id, i, b)
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        d = dict(row)
        if isinstance(d.get("blocks"), str):
            d["blocks"] = orjson.loads(d["blocks"])
        return d

@router.patch("/{entry_id}")
@router.patch("/{entry_id}/")
async def patch_entry(entry_id: int, payload: BimUpdate):
    pool = await _get_pool()
    async with pool.acquire() as conn:
        current = await conn.fetchrow(GET_ONE_SQL, entry_id)
        if not current:
            raise HTTPException(status_code=404, detail="Not found")

        new_title = payload.title.strip() if isinstance(payload.title, str) else current["title"]
        new_tags  = payload.tags if payload.tags is not None else (current.get("tags") or [])
        if isinstance(new_tags, str):
            new_tags = orjson.loads(new_tags)

        async with conn.transaction():
            await conn.fetchrow(UPDATE_ENTRY_SQL, entry_id, new_title, new_tags)
            if payload.blocks is not None:
                if not payload.blocks:
                    raise HTTPException(status_code=400, detail="If 'blocks' is provided, it cannot be empty")
                norm = _normalize_blocks(payload.blocks)
                await conn.execute(DELETE_BLOCKS_SQL, entry_id)
                for i, b in enumerate(norm):
                    await _insert_block_with_retry(conn, entry_id, i, b)
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        d = dict(row)
        if isinstance(d.get("blocks"), str):
            d["blocks"] = orjson.loads(d["blocks"])
        return d

@router.post("/{entry_id}")
@router.post("/{entry_id}/")
async def method_override(entry_id: int, payload: dict, request: Request):
    override = request.headers.get("X-HTTP-Method-Override", "").upper()
    if override == "PUT":
        data = BimUpdate(**payload)
        return await update_entry(entry_id, data)
    elif override == "PATCH":
        data = BimUpdate(**payload)
        return await patch_entry(entry_id, data)
    elif override == "DELETE":
        return await delete_entry(entry_id)
    raise HTTPException(status_code=405, detail="Method Not Allowed")

@router.delete("/{entry_id}", status_code=204)
@router.delete("/{entry_id}/", status_code=204)
async def delete_entry(entry_id: int):
    pool = await _get_pool()
    async with pool.acquire() as conn:
        await conn.execute(DELETE_BLOCKS_SQL, entry_id)
        await conn.execute(DELETE_ENTRY_SQL, entry_id)
    return {}
