# app/routes/home.py
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
import re

from ..db import pool
from ..auth import require_owner

router = APIRouter()

# ---------------- Schema DDL ----------------

CREATE_HOME_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS home_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    welcome_html TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

ENSURE_HOME_ROW_SQL = """
INSERT INTO home_settings (id, welcome_html)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;
"""

# Create with the superset of columns we support now
CREATE_HI_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS highlights (
    id BIGSERIAL PRIMARY KEY,
    icon TEXT,
    title_html TEXT NOT NULL DEFAULT '',
    body_html  TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- legacy/plain fields kept for compatibility
    title TEXT,
    description TEXT,
    url TEXT
);
"""

# Patch older tables forward safely
ALTER_HI_ADD_ICON_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS icon TEXT;
"""
ALTER_HI_ADD_TITLE_HTML_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS title_html TEXT;
"""
ALTER_HI_ADD_BODY_HTML_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS body_html TEXT;
"""
ALTER_HI_ADD_SORT_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
"""
ALTER_HI_ADD_CREATED_AT_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
"""
ALTER_HI_ADD_UPDATED_AT_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
"""
# legacy/plain columns (nullable)
ALTER_HI_ADD_TITLE_LEGACY_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS title TEXT;
"""
ALTER_HI_ADD_DESC_LEGACY_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS description TEXT;
"""
ALTER_HI_ADD_URL_LEGACY_SQL = """
ALTER TABLE IF EXISTS highlights
  ADD COLUMN IF NOT EXISTS url TEXT;
"""

# Defaults + not-null after the columns exist
BACKFILL_HI_HTML_DEFAULTS_SQL = """
UPDATE highlights
   SET title_html = COALESCE(title_html, ''),
       body_html  = COALESCE(body_html,  '')
 WHERE title_html IS NULL OR body_html IS NULL;
"""

SET_HI_HTML_NOT_NULL_DEFAULT_SQL = """
ALTER TABLE IF EXISTS highlights
    ALTER COLUMN title_html SET DEFAULT '',
    ALTER COLUMN body_html  SET DEFAULT '';
-- SET NOT NULL guarded: only if no NULLs remain
"""

CREATE_HI_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_highlights_sort
ON highlights (sort_order, id);
"""

async def _ensure_schema():
    async with pool().acquire() as con:
        await con.execute(CREATE_HOME_TABLE_SQL)
        await con.execute(ENSURE_HOME_ROW_SQL)

        await con.execute(CREATE_HI_TABLE_SQL)
        await con.execute(ALTER_HI_ADD_ICON_SQL)
        await con.execute(ALTER_HI_ADD_TITLE_HTML_SQL)
        await con.execute(ALTER_HI_ADD_BODY_HTML_SQL)
        await con.execute(ALTER_HI_ADD_SORT_SQL)
        await con.execute(ALTER_HI_ADD_CREATED_AT_SQL)
        await con.execute(ALTER_HI_ADD_UPDATED_AT_SQL)
        await con.execute(ALTER_HI_ADD_TITLE_LEGACY_SQL)
        await con.execute(ALTER_HI_ADD_DESC_LEGACY_SQL)
        await con.execute(ALTER_HI_ADD_URL_LEGACY_SQL)

        await con.execute(BACKFILL_HI_HTML_DEFAULTS_SQL)
        await con.execute(SET_HI_HTML_NOT_NULL_DEFAULT_SQL)
        # enforce NOT NULL only if safe
        await con.execute("ALTER TABLE IF EXISTS highlights ALTER COLUMN title_html SET NOT NULL;")
        await con.execute("ALTER TABLE IF EXISTS highlights ALTER COLUMN body_html  SET NOT NULL;")

        await con.execute(CREATE_HI_INDEX_SQL)

# ---------------- Models for responses ----------------

class HighlightOut(BaseModel):
    id: int
    icon: Optional[str] = None
    title_html: str
    body_html: str
    sort_order: int
    # legacy fields exposed for compatibility (optional)
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None

class HomeOut(BaseModel):
    welcome_html: str
    highlights: List[HighlightOut]

# ---------------- Helpers ----------------

async def _read_body(request: Request) -> Dict[str, Any]:
    """Read JSON or form data into a dict."""
    data: Dict[str, Any] = {}
    # Try JSON
    try:
        payload = await request.json()
        if isinstance(payload, dict):
            data.update(payload)
    except Exception:
        pass
    # Fallback to form
    if not data:
        try:
            form = await request.form()
            data.update(dict(form))
        except Exception:
            pass
    return data

def _first_key(d: Dict[str, Any], *names: str, default: Optional[Any] = None):
    for n in names:
        if n in d and d[n] is not None:
            return d[n]
    return default

def _to_int(val: Any, default: int = 0) -> int:
    try:
        return int(val)
    except Exception:
        return default

_id_re = re.compile(r"^(?:h-)?(\d+)$")
def _parse_hid(hid: str) -> Optional[int]:
    m = _id_re.match(str(hid))
    return int(m.group(1)) if m else None

def _strip_html(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"<[^>]*>", "", str(s))

# Normalize incoming payload into the canonical columns we persist
def _normalize_highlight_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    icon = _first_key(data, "icon", default="💡")

    title_html = _first_key(data, "title_html", "titleHtml")
    body_html  = _first_key(data, "body_html", "bodyHtml")

    # accept legacy/plain fields too
    title_plain = _first_key(data, "title", "name", "text", "label", "heading")
    desc_plain  = _first_key(data, "description", "desc", "body", "content")

    # derive HTML if only plain provided
    if not title_html:
        title_html = title_plain or ""
    if not body_html:
        body_html = desc_plain or ""

    # sort order aliases
    sort_order_raw = _first_key(
        data, "sort_order", "sortOrder", "order", "sort", "position", "index"
    )
    sort_order = None if sort_order_raw is None else _to_int(sort_order_raw, 0)

    # keep legacy fields in DB (optional)
    title_legacy = title_plain or _strip_html(title_html)
    desc_legacy  = desc_plain  or _strip_html(body_html)
    url          = _first_key(data, "url", "link", "href")

    return {
        "icon": icon or "💡",
        "title_html": (title_html or "").strip(),
        "body_html": (body_html or "").strip(),
        "sort_order": sort_order,
        "title": (title_legacy or None),
        "description": (desc_legacy or None),
        "url": (url or None),
    }

# ---------------- Routes ----------------

@router.get("/api/home", response_model=HomeOut)
async def get_home():
    await _ensure_schema()
    async with pool().acquire() as con:
        welcome = await con.fetchval("SELECT welcome_html FROM home_settings WHERE id = 1")
        rows = await con.fetch(
            """
            SELECT id, icon, title_html, body_html, sort_order, title, description, url
              FROM highlights
          ORDER BY sort_order ASC, id ASC
            """
        )
        highlights = [HighlightOut(**dict(r)) for r in rows]
        return HomeOut(welcome_html=welcome or "", highlights=highlights)

@router.put("/api/home", response_model=dict)
async def update_home(request: Request, _=Depends(require_owner)):
    """
    Accepts any of these keys for the welcome editor:
      - welcome_html, welcomeHtml, welcome, html, text, content, message
    """
    await _ensure_schema()
    data = await _read_body(request)

    html = _first_key(
        data,
        "welcome_html", "welcomeHtml", "welcome", "html", "text", "content", "message",
        default=""
    )
    html = (html or "").strip()

    async with pool().acquire() as con:
        await con.execute(
            "UPDATE home_settings SET welcome_html = $1, updated_at = now() WHERE id = 1",
            html
        )
    return {"ok": True, "welcome_html": html}

@router.get("/api/highlights", response_model=List[HighlightOut])
async def list_highlights():
    await _ensure_schema()
    async with pool().acquire() as con:
        rows = await con.fetch(
            """
            SELECT id, icon, title_html, body_html, sort_order, title, description, url
              FROM highlights
          ORDER BY sort_order ASC, id ASC
            """
        )
        return [HighlightOut(**dict(r)) for r in rows]

@router.post("/api/highlights", response_model=HighlightOut)
async def create_highlight(request: Request, _=Depends(require_owner)):
    """
    Accepts these aliases:
      icon:        icon
      title_html:  title_html | titleHtml | title | name | text | label | heading
      body_html:   body_html  | bodyHtml  | description | desc | body | content
      url:         url | link | href
      sort_order:  sort_order | sortOrder | order | sort | position | index
    """
    await _ensure_schema()
    data_in = await _read_body(request)
    data = _normalize_highlight_payload(data_in)

    async with pool().acquire() as con:
        # if sort not provided, append to end
        if data["sort_order"] is None:
            data["sort_order"] = await con.fetchval(
                "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM highlights"
            )

        row = await con.fetchrow(
            """
            INSERT INTO highlights (icon, title_html, body_html, sort_order, title, description, url)
            VALUES ($1,   $2,         $3,        $4,         $5,    $6,          $7)
            RETURNING id, icon, title_html, body_html, sort_order, title, description, url
            """,
            data["icon"], data["title_html"], data["body_html"], data["sort_order"],
            data["title"], data["description"], data["url"]
        )
    return HighlightOut(**dict(row))

@router.delete("/api/highlights/{hid}", response_model=dict)
async def delete_highlight(hid: str, _=Depends(require_owner)):
    await _ensure_schema()
    real_id = _parse_hid(hid)
    if real_id is None:
        raise HTTPException(status_code=400, detail="Invalid highlight id")

    async with pool().acquire() as con:
        status = await con.execute("DELETE FROM highlights WHERE id = $1", real_id)
        deleted = status.endswith(" 1")
    return {"ok": deleted, "deleted": 1 if deleted else 0}

# (Optional) Update endpoint if you need it from the UI:
@router.put("/api/highlights/{hid}", response_model=HighlightOut)
async def update_highlight(hid: str, request: Request, _=Depends(require_owner)):
    await _ensure_schema()
    real_id = _parse_hid(hid)
    if real_id is None:
        raise HTTPException(status_code=400, detail="Invalid highlight id")

    data_in = await _read_body(request)
    data = _normalize_highlight_payload(data_in)

    async with pool().acquire() as con:
        row = await con.fetchrow(
            """
            UPDATE highlights
               SET icon       = COALESCE($2, icon),
                   title_html = COALESCE($3, title_html),
                   body_html  = COALESCE($4, body_html),
                   sort_order = COALESCE($5, sort_order),
                   title      = COALESCE($6, title),
                   description= COALESCE($7, description),
                   url        = COALESCE($8, url),
                   updated_at = now()
             WHERE id = $1
         RETURNING id, icon, title_html, body_html, sort_order, title, description, url
            """,
            real_id,
            data.get("icon"),
            (data.get("title_html") or ""),
            (data.get("body_html") or ""),
            data.get("sort_order"),
            data.get("title"),
            data.get("description"),
            data.get("url"),
        )
    if not row:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return HighlightOut(**dict(row))
