# app/routes/posts.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Any, Tuple
from datetime import datetime
import json

from ..db import pool
from ..auth import require_owner
from ..utils import slugify, compute_excerpt

router = APIRouter()

# ------------------------------- Schema helpers -------------------------------

async def _ensure_schema(con):
    # Needed for gen_random_uuid()
    await con.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    # Base table (includes presentation columns)
    await con.execute(
        """
        CREATE TABLE IF NOT EXISTS posts (
            id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title                text NOT NULL,
            slug                 text NOT NULL UNIQUE,
            excerpt              text,
            cover_image_url      text,
            tags                 text[] DEFAULT '{}'::text[],
            status               text DEFAULT 'draft',
            published_at         timestamptz,
            body_html            text,
            meta                 jsonb,
            -- Presentation fields
            accent_color         text,
            theme_font_family    text,
            theme_base_px        integer,
            theme_heading_scale  numeric(6,3),
            created_at           timestamptz NOT NULL DEFAULT now(),
            updated_at           timestamptz NOT NULL DEFAULT now()
        );
        """
    )
    # Ensure new columns exist on older tables
    await con.execute(
        """
        ALTER TABLE IF EXISTS posts
            ADD COLUMN IF NOT EXISTS accent_color         text,
            ADD COLUMN IF NOT EXISTS theme_font_family    text,
            ADD COLUMN IF NOT EXISTS theme_base_px        integer,
            ADD COLUMN IF NOT EXISTS theme_heading_scale  numeric(6,3);
        """
    )
    # Helpful indexes
    await con.execute("CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status);")
    await con.execute("CREATE INDEX IF NOT EXISTS posts_published_at_idx ON posts (published_at);")
    await con.execute("CREATE INDEX IF NOT EXISTS posts_tags_gin ON posts USING GIN (tags);")

async def _ensure_ready(con):
    await _ensure_schema(con)

# ------------------------------- Row helpers ----------------------------------

def _normalize_tags(tags: Any) -> List[str]:
    if not tags:
        return []
    if isinstance(tags, list):
        return [str(t) for t in tags if t is not None]
    return [t.strip() for t in str(tags).split(",") if t.strip()]

def _extract_theme_from_payload(body: dict) -> Tuple[Optional[str], dict]:
    """
    Pull color + theme from request body (or from meta if present).
    Returns (color, theme_dict) with sane types/defaults.
    """
    meta = body.get("meta") or {}
    color = body.get("color") or meta.get("color")
    t = body.get("theme") or meta.get("theme") or {}

    # Coerce numbers robustly
    base_px = t.get("basePx")
    try:
        base_px = int(base_px) if base_px is not None else 16
    except Exception:
        base_px = 16

    heading_scale = t.get("headingScale")
    try:
        heading_scale = float(heading_scale) if heading_scale is not None else 1.15
    except Exception:
        heading_scale = 1.15

    theme = {
        "fontFamily": t.get("fontFamily") or "",
        "basePx": base_px,
        "headingScale": heading_scale,
    }
    return color, theme

def _compose_meta(meta: Any, color: Optional[str], theme: dict) -> dict:
    """
    Ensure meta carries color + theme for back-compat while keeping any other keys.
    """
    m = meta.copy() if isinstance(meta, dict) else {}
    if color is not None:
        m["color"] = color
    if theme:
        m["theme"] = {
            "fontFamily": theme.get("fontFamily") or "",
            "basePx": int(theme.get("basePx") or 16),
            "headingScale": float(theme.get("headingScale") or 1.15),
        }
    return m

def _coerce_num(x, kind="int"):
    if x is None:
        return None
    try:
        return int(x) if kind == "int" else float(x)
    except Exception:
        return None

def _decode_meta(value: Any) -> dict:
    """
    Deal with legacy rows where meta might be text instead of jsonb.
    Always return a dict.
    """
    if isinstance(value, dict):
        return value
    if value is None:
        return {}
    # Some drivers can return a JSON string; attempt to parse
    try:
        return json.loads(value)
    except Exception:
        return {}

def _read_post_row(r) -> dict:
    # asyncpg.Record supports dict-style indexing for selected columns
    meta = _decode_meta(r["meta"])

    # Prefer dedicated columns; fall back to meta if columns are NULL
    color = r["accent_color"] or meta.get("color")

    theme_from_cols = {
        "fontFamily": r["theme_font_family"],
        "basePx": _coerce_num(r["theme_base_px"], "int"),
        "headingScale": _coerce_num(r["theme_heading_scale"], "float"),
    }
    theme_from_meta = meta.get("theme") or {}

    theme = {
        "fontFamily": theme_from_cols["fontFamily"] or theme_from_meta.get("fontFamily") or "",
        "basePx": (theme_from_cols["basePx"]
                   if theme_from_cols["basePx"] is not None
                   else _coerce_num(theme_from_meta.get("basePx"), "int") or 16),
        "headingScale": (theme_from_cols["headingScale"]
                         if theme_from_cols["headingScale"] is not None
                         else _coerce_num(theme_from_meta.get("headingScale"), "float") or 1.15),
    }

    return {
        "id": str(r["id"]) if r["id"] is not None else None,
        "title": r["title"],
        "slug": r["slug"],
        "excerpt": r["excerpt"],
        "coverImageUrl": r["cover_image_url"],
        "tags": r["tags"] or [],
        "status": r["status"],
        "publishedAt": r["published_at"],
        "bodyHtml": r["body_html"],
        "meta": meta,          # keep exposing meta for compatibility
        "color": color,        # NEW: top-level
        "theme": theme,        # NEW: top-level
        "createdAt": r["created_at"] if "created_at" in r else None,
        "updatedAt": r["updated_at"] if "updated_at" in r else None,
    }

# --------------------------------- Routes -------------------------------------

@router.get("/api/posts")
async def list_posts(page: int = 1, pageSize: int = 10, tag: Optional[str] = None):
    page = max(1, page)
    pageSize = max(1, min(50, pageSize))
    offset = (page - 1) * pageSize

    where = "WHERE status = 'published'"
    params: List[Any] = []

    if tag:
        where += f" AND ${len(params)+1} = ANY(tags)"
        params.append(tag)

    async with pool().acquire() as con:
        await _ensure_ready(con)

        total_sql = f"SELECT COUNT(*) FROM posts {where};"
        total = await con.fetchval(total_sql, *params)

        data_sql = f"""
            SELECT id, title, slug, excerpt, cover_image_url, tags, status,
                   published_at, body_html, meta,
                   accent_color, theme_font_family, theme_base_px, theme_heading_scale,
                   created_at, updated_at
            FROM posts
            {where}
            ORDER BY COALESCE(published_at, created_at) DESC NULLS LAST,
                     created_at DESC NULLS LAST
            LIMIT ${len(params)+1} OFFSET ${len(params)+2};
        """
        rows = await con.fetch(data_sql, *params, pageSize, offset)

    items = [_read_post_row(r) for r in rows]
    return {"page": page, "pageSize": pageSize, "total": total, "items": items}

@router.get("/api/posts/{slug_or_id}")
async def get_post_by_slug_or_id(slug_or_id: str):
    async with pool().acquire() as con:
        await _ensure_ready(con)
        row = await con.fetchrow(
            """
            SELECT id, title, slug, excerpt, cover_image_url, tags, status,
                   published_at, body_html, meta,
                   accent_color, theme_font_family, theme_base_px, theme_heading_scale,
                   created_at, updated_at
            FROM posts
            WHERE slug=$1 OR id::text=$1
            LIMIT 1;
            """,
            slug_or_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_post_row(row)

@router.post("/api/posts")
async def create_post(body: dict, user=Depends(require_owner)):
    title = (body.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    raw_slug = slugify(body.get("slug") or title)
    status = (body.get("status") or "draft").strip().lower()

    pub = body.get("publishedAt")
    try:
        pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else None
    except Exception:
        pub_dt = None

    body_html = body.get("bodyHtml") or body.get("content") or ""
    excerpt = (body.get("excerpt") or compute_excerpt(body_html) or "").strip()
    tags = _normalize_tags(body.get("tags"))
    cover = body.get("coverImageUrl")

    # Presentation
    color, theme = _extract_theme_from_payload(body)
    meta = _compose_meta(body.get("meta"), color, theme)
    meta_json = json.dumps(meta, ensure_ascii=False)

    async with pool().acquire() as con:
        await _ensure_ready(con)
        async with con.transaction():
            # slug uniqueness
            slug = await _ensure_unique_slug(con, raw_slug)

            row = await con.fetchrow(
                """
                INSERT INTO posts (
                    id, title, slug, excerpt, cover_image_url, tags, status,
                    published_at, body_html, meta,
                    accent_color, theme_font_family, theme_base_px, theme_heading_scale,
                    created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,
                    $10,$11,$12,$13,
                    now(), now()
                )
                RETURNING id, title, slug, excerpt, cover_image_url, tags, status,
                          published_at, body_html, meta,
                          accent_color, theme_font_family, theme_base_px, theme_heading_scale,
                          created_at, updated_at;
                """,
                title,
                slug,
                excerpt,
                cover,
                tags,
                status,
                pub_dt,
                body_html,
                meta_json,  # pass JSON string
                color,
                (theme.get("fontFamily") or None),
                int(theme.get("basePx") or 16),
                float(theme.get("headingScale") or 1.15),
            )

    return _read_post_row(row)

@router.put("/api/posts/{id}")
async def update_post(id: str, body: dict, user=Depends(require_owner)):
    title = (body.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    desired_slug = slugify(body.get("slug") or title)
    status = (body.get("status") or "draft").strip().lower()

    pub = body.get("publishedAt")
    try:
        pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else None
    except Exception:
        pub_dt = None

    body_html = body.get("bodyHtml") or body.get("content") or ""
    explicit_excerpt = (body.get("excerpt") or "").strip()
    excerpt = explicit_excerpt or (compute_excerpt(body_html) if body_html else "")

    tags = _normalize_tags(body.get("tags"))
    cover = body.get("coverImageUrl")

    color, theme = _extract_theme_from_payload(body)
    meta = _compose_meta(body.get("meta"), color, theme)
    meta_json = json.dumps(meta, ensure_ascii=False)

    async with pool().acquire() as con:
        await _ensure_ready(con)
        async with con.transaction():
            slug = await _ensure_unique_slug(con, desired_slug, current_id_text=id)

            row = await con.fetchrow(
                """
                UPDATE posts SET
                    title=$1,
                    slug=$2,
                    excerpt=$3,
                    cover_image_url=$4,
                    tags=$5,
                    status=$6,
                    published_at=$7,
                    body_html=$8,
                    meta=$9::jsonb,
                    accent_color=$10,
                    theme_font_family=$11,
                    theme_base_px=$12,
                    theme_heading_scale=$13,
                    updated_at=now()
                WHERE id::text=$14
                RETURNING id, title, slug, excerpt, cover_image_url, tags, status,
                          published_at, body_html, meta,
                          accent_color, theme_font_family, theme_base_px, theme_heading_scale,
                          created_at, updated_at;
                """,
                title,
                slug,
                excerpt,
                cover,
                tags,
                status,
                pub_dt,
                body_html,
                meta_json,  # pass JSON string
                color,
                (theme.get("fontFamily") or None),
                int(theme.get("basePx") or 16),
                float(theme.get("headingScale") or 1.15),
                id,
            )

    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_post_row(row)

@router.delete("/api/posts/{id}")
async def delete_post(id: str, user=Depends(require_owner)):
    async with pool().acquire() as con:
        await _ensure_ready(con)
        res = await con.execute("DELETE FROM posts WHERE id::text=$1;", id)
    if res.endswith("0"):
        raise HTTPException(status_code=404, detail="Not found")
    return {}

# ------------------------------- Slug helper ----------------------------------

async def _ensure_unique_slug(con, base_slug: str, current_id_text: Optional[str] = None) -> str:
    candidate = base_slug
    n = 1
    while True:
        row = await con.fetchrow(
            """
            SELECT 1
            FROM posts
            WHERE slug=$1
              AND (COALESCE(id::text,'') <> COALESCE($2,''))  -- exclude current row on updates
            LIMIT 1;
            """,
            candidate,
            current_id_text or "",
        )
        if not row:
            return candidate
        n += 1
        candidate = f"{base_slug}-{n}"
