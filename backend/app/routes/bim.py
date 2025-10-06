# app/routes/bim.py
from __future__ import annotations
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import request_validation_exception_handler as default_validation_handler
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from pathlib import Path
import uuid, shutil, base64
import orjson

from ..db import pool
from ..config import settings

router = APIRouter()

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
    # Only wrap /api/bim* errors to avoid giant binary dumps in 422 responses
    if str(request.url.path).startswith("/api/bim"):
        return JSONResponse(status_code=422, content={"detail": _safe_jsonable(exc.errors())})
    return await default_validation_handler(request, exc)

# ---------- Models -----------------------------------------------------------
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
    t = b.type
    lang = None
    if t == "code":
        key = (b.language or "").strip().lower() or None
        lang = _LANG_MAP.get(key, "js")
    return {"type": t, "value": b.value or "", "language": lang}

def _normalize_blocks(blocks: List[BimBlock]) -> List[dict]:
    return [_normalize_block(b) for b in blocks]

def _row_to_dict_with_parsed_blocks(row) -> dict:
    d = dict(row)
    if isinstance(d.get("blocks"), str):
        d["blocks"] = orjson.loads(d["blocks"])
    return d

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

INSERT_ENTRY_SQL = """
insert into public.bim_entries (title, tags)
values ($1, $2)
returning id, title, created_at, tags;
"""
INSERT_BLOCK_SQL = """
insert into public.bim_blocks (entry_id, idx, type, value, language)
values ($1, $2, $3, $4, $5);
"""
DELETE_BLOCKS_SQL = "delete from public.bim_blocks where entry_id = $1;"
DELETE_ENTRY_SQL  = "delete from public.bim_entries where id = $1;"
UPDATE_ENTRY_SQL  = "update public.bim_entries set title = $2, tags = $3 where id = $1 returning id;"

# ---- Upload directory -------------------------------------------------------
DEFAULT_UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR = Path(settings.web_root or DEFAULT_UPLOAD_ROOT)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --------------------- Sanity route (cheap, DB-free) -------------------------
@router.get("/api/bim/ping")
async def bim_ping():
    return {"ok": True}

# ---- IMAGE UPLOAD FIRST (so it wins over /{entry_id}) -----------------------
@router.post("/api/bim/upload-image")
@router.post("/api/bim/upload-image/")
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

# ------------------------------- CRUD ----------------------------------------
@router.get("/api/bim", response_model=List[dict])
@router.get("/api/bim/", response_model=List[dict])
async def list_entries():
    async with pool().acquire() as con:
        rows = await con.fetch(LIST_SQL)
        return [_row_to_dict_with_parsed_blocks(r) for r in rows]

@router.get("/api/bim/{entry_id}", response_model=dict)
async def get_entry(entry_id: int):
    async with pool().acquire() as con:
        row = await con.fetchrow(GET_ONE_SQL, entry_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return _row_to_dict_with_parsed_blocks(row)

@router.post("/api/bim", response_model=dict, status_code=201)
@router.post("/api/bim/", response_model=dict, status_code=201)
async def create_entry(payload: BimCreate):
    if not payload.blocks:
        raise HTTPException(status_code=400, detail="At least one block required")

    async with pool().acquire() as con:
        async with con.transaction():
            e = await con.fetchrow(INSERT_ENTRY_SQL, payload.title.strip(), payload.tags or [])
            entry_id = e["id"]
            for i, b in enumerate(_normalize_blocks(payload.blocks)):
                await con.execute(INSERT_BLOCK_SQL, entry_id, i, b["type"], b["value"], b["language"])
        row = await con.fetchrow(GET_ONE_SQL, entry_id)
        return _row_to_dict_with_parsed_blocks(row)

@router.put("/api/bim/{entry_id}", response_model=dict)
@router.put("/api/bim/{entry_id}/", response_model=dict)
async def update_entry(entry_id: int, payload: BimUpdate):
    if payload.title is None or payload.blocks is None:
        raise HTTPException(status_code=400, detail="PUT requires 'title' and 'blocks'")
    if not payload.blocks:
        raise HTTPException(status_code=400, detail="At least one block required")

    title = payload.title.strip()
    tags  = payload.tags or []
    norm  = _normalize_blocks(payload.blocks)

    async with pool().acquire() as con:
        exists = await con.fetchrow("select id from public.bim_entries where id = $1;", entry_id)
        if not exists:
            raise HTTPException(status_code=404, detail="Not found")

        async with con.transaction():
            await con.fetchrow(UPDATE_ENTRY_SQL, entry_id, title, tags)
            await con.execute(DELETE_BLOCKS_SQL, entry_id)
            for i, b in enumerate(norm):
                await con.execute(INSERT_BLOCK_SQL, entry_id, i, b["type"], b["value"], b["language"])
        row = await con.fetchrow(GET_ONE_SQL, entry_id)
        return _row_to_dict_with_parsed_blocks(row)

@router.patch("/api/bim/{entry_id}", response_model=dict)
@router.patch("/api/bim/{entry_id}/", response_model=dict)
async def patch_entry(entry_id: int, payload: BimUpdate):
    async with pool().acquire() as con:
        current = await con.fetchrow(GET_ONE_SQL, entry_id)
        if not current:
            raise HTTPException(status_code=404, detail="Not found")

        new_title = payload.title.strip() if isinstance(payload.title, str) else current["title"]
        new_tags  = payload.tags if payload.tags is not None else current.get("tags") or []
        if isinstance(new_tags, str):
            new_tags = orjson.loads(new_tags)

        async with con.transaction():
            await con.fetchrow(UPDATE_ENTRY_SQL, entry_id, new_title, new_tags)
            if payload.blocks is not None:
                if not payload.blocks:
                    raise HTTPException(status_code=400, detail="If 'blocks' is provided, it cannot be empty")
                norm = _normalize_blocks(payload.blocks)
                await con.execute(DELETE_BLOCKS_SQL, entry_id)
                for i, b in enumerate(norm):
                    await con.execute(INSERT_BLOCK_SQL, entry_id, i, b["type"], b["value"], b["language"])
        row = await con.fetchrow(GET_ONE_SQL, entry_id)
        return _row_to_dict_with_parsed_blocks(row)

# ----- METHOD-OVERRIDE: keep this LAST so it doesn't shadow /upload-image ----
@router.post("/api/bim/{entry_id}")
@router.post("/api/bim/{entry_id}/")
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

@router.delete("/api/bim/{entry_id}", status_code=204)
@router.delete("/api/bim/{entry_id}/", status_code=204)
async def delete_entry(entry_id: int):
    async with pool().acquire() as con:
        await con.execute(DELETE_ENTRY_SQL, entry_id)
    return {}
