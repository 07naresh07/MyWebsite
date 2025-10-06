# app/routes/bim.py
from __future__ import annotations
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import request_validation_exception_handler as default_validation_handler
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from pathlib import Path
import uuid, shutil, asyncio, base64
import orjson

# Import the module so we can access get_pool()/pool/init_pool
from .. import db
from ..config import settings

router = APIRouter(prefix="/api/bim", tags=["bim"])

# ---------------- Exception handling helper (registered in app/main.py) -----
def _safe_jsonable(val):
    if isinstance(val, (bytes, bytearray)):
        return {"__bytes_b64__": base64.b64encode(val).decode("ascii")}
    if isinstance(val, dict):
        return {k: _safe_jsonable(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_safe_jsonable(v) for v in val]
    return val

async def bim_validation_exception_handler(request: Request, exc: RequestValidationError):
    if request.url.path.startswith("/api/bim"):
        return JSONResponse(status_code=422, content={"detail": _safe_jsonable(exc.errors())})
    return await default_validation_handler(request, exc)

# ---- Robust pool getter -----------------------------------------------------
async def _get_pool(timeout_sec: float = 5.0):
    deadline = asyncio.get_event_loop().time() + timeout_sec
    last_err = None
    while True:
        p = None
        if hasattr(db, "get_pool") and callable(db.get_pool):
            try: p = db.get_pool()
            except Exception as e: last_err, p = e, None
        if p is None and hasattr(db, "pool") and callable(db.pool):
            try: p = db.pool()
            except Exception as e: last_err, p = e, None
        if p is not None and hasattr(p, "acquire"):
            return p
        if hasattr(db, "init_pool") and callable(db.init_pool) and getattr(settings, "database_url", None):
            try: await db.init_pool(settings.database_url)
            except Exception as e: last_err = e
        if asyncio.get_event_loop().time() >= deadline:
            break
        await asyncio.sleep(0.1)
    raise HTTPException(status_code=503, detail=f"Database not ready: {last_err or 'initializing'}")

# ---------- Models -----------------------------------------------------------
class BimBlock(BaseModel):
    # Accept h1/h2 from UI and keep them as-is
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

# ---------- Normalization helpers -------------------------------------------
_LANG_MAP = {
    None: None,
    "js": "js", "javascript": "js",
    "ts": "ts", "typescript": "ts",
    "py": "py", "python": "py",
    "html": "html",
    "css": "css",
}

def _normalize_block(b: BimBlock) -> dict:
    # FIXED: Keep h1, h2, text, image, code types as-is
    t = b.type
    lang = None
    if t == "code":
        key = (b.language or "").strip().lower() or None
        lang = _LANG_MAP.get(key, "js")
    return {"type": t, "value": b.value or "", "language": lang}

def _normalize_blocks(blocks: List[BimBlock]) -> List[dict]:
    return [_normalize_block(b) for b in blocks]

# ---------- SQL --------------------------------------------------------------
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
INSERT_BLOCK_SQL = "insert into public.bim_blocks (entry_id, idx, type, value, language) values ($1, $2, $3, $4, $5);"
DELETE_BLOCKS_SQL = "delete from public.bim_blocks where entry_id = $1;"
DELETE_ENTRY_SQL  = "delete from public.bim_entries where id = $1;"
UPDATE_ENTRY_SQL = "update public.bim_entries set title = $2, tags = $3 where id = $1 returning id;"

def _row_to_dict_with_parsed_blocks(row) -> dict:
    d = dict(row)
    if isinstance(d.get("blocks"), str):
        d["blocks"] = orjson.loads(d["blocks"])
    return d

# ---- IMAGE UPLOAD FIRST (so it wins over /{entry_id}) -----------------------
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
        if ctype == "image/jpeg":
            ext = ".jpg"
        elif ctype == "image/png":
            ext = ".png"
        elif ctype == "image/gif":
            ext = ".gif"
        elif ctype == "image/webp":
            ext = ".webp"
        else:
            ext = ".png"

    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    try:
        with dest.open("wb") as out:
            shutil.copyfileobj(up.file, out)
    finally:
        try: up.file.close()
        except Exception: pass

    return {"url": f"/uploads/{name}", "filename": name, "content_type": ctype}

# ---------- CRUD Routes ------------------------------------------------------
@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def list_entries():
    pool = await _get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(LIST_SQL)
        return [_row_to_dict_with_parsed_blocks(r) for r in rows]

@router.get("/{entry_id}", response_model=dict)
async def get_entry(entry_id: int):
    pool = await _get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return _row_to_dict_with_parsed_blocks(row)

@router.post("", response_model=dict, status_code=201)
@router.post("/", response_model=dict, status_code=201)
async def create_entry(payload: BimCreate):
    if not payload.blocks:
        raise HTTPException(status_code=400, detail="At least one block required")
    pool = await _get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            e = await conn.fetchrow(INSERT_ENTRY_SQL, payload.title.strip(), payload.tags or [])
            entry_id = e["id"]
            for i, b in enumerate(_normalize_blocks(payload.blocks)):
                await conn.execute(INSERT_BLOCK_SQL, entry_id, i, b["type"], b["value"], b["language"])
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        return _row_to_dict_with_parsed_blocks(row)

@router.put("/{entry_id}", response_model=dict)
@router.put("/{entry_id}/", response_model=dict)
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
                await conn.execute(INSERT_BLOCK_SQL, entry_id, i, b["type"], b["value"], b["language"])
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        return _row_to_dict_with_parsed_blocks(row)

@router.patch("/{entry_id}", response_model=dict)
@router.patch("/{entry_id}/", response_model=dict)
async def patch_entry(entry_id: int, payload: BimUpdate):
    pool = await _get_pool()
    async with pool.acquire() as conn:
        current = await conn.fetchrow(GET_ONE_SQL, entry_id)
        if not current:
            raise HTTPException(status_code=404, detail="Not found")

        new_title = payload.title.strip() if isinstance(payload.title, str) else current["title"]
        new_tags  = payload.tags if payload.tags is not None else current.get("tags") or []
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
                    await conn.execute(INSERT_BLOCK_SQL, entry_id, i, b["type"], b["value"], b["language"])
        row = await conn.fetchrow(GET_ONE_SQL, entry_id)
        return _row_to_dict_with_parsed_blocks(row)

# ----- METHOD-OVERRIDE: keep this LAST so it doesn't shadow /upload-image ----
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
        await conn.execute(DELETE_ENTRY_SQL, entry_id)
    return {}