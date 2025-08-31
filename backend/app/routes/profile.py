from fastapi import APIRouter, Depends, HTTPException
from ..db import pool
from ..auth import require_owner
import json

router = APIRouter()

def _safe_json_to_dict(v):
    if isinstance(v, dict):
        return v
    if isinstance(v, (str, bytes)) and v:
        try:
            return json.loads(v)
        except Exception:
            return {}
    return {}

def _ensure_extras_shape(obj):
    """Return a fully-populated extras dict with defaults."""
    return {
        "interests": list(obj.get("interests") or []),
        "languages": list(obj.get("languages") or []),
        "focus": list(obj.get("focus") or []),
        "motto": obj.get("motto") or "",
    }

def _read_profile_row(r) -> dict:
    socials = _safe_json_to_dict(r["socials"])
    extras = _ensure_extras_shape(_safe_json_to_dict(socials.get("extras", {})))

    # Keep existing keys, and also expose 'quote' alias for convenience in the UI.
    return {
        "id": r["id"],
        "fullName": r["full_name"],
        "headline": r["headline"],
        "quote": r["headline"],  # alias for frontend convenience
        "bio": r["bio"],
        "about": r["bio"],       # alias commonly used by the UI
        "location": r["location"],
        "email": r["email"],
        "phone": r["phone"],
        "avatarUrl": r["avatar_url"],
        "bannerUrl": r["banner_url"],
        "socials": {**socials, "extras": extras},
    }

async def _ensure_table(con):
    ddl = """
    create table if not exists profile (
        id uuid primary key,
        full_name text not null default '',
        headline text null,
        bio text null,
        location text null,
        email text null,
        phone text null,
        avatar_url text null,
        banner_url text null,
        socials jsonb null,
        created_at timestamptz not null default now(),
        updated_at timestamptz null
    );
    alter table profile
        add column if not exists full_name text not null default '',
        add column if not exists headline text,
        add column if not exists bio text,
        add column if not exists location text,
        add column if not exists email text,
        add column if not exists phone text,
        add column if not exists avatar_url text,
        add column if not exists banner_url text,
        add column if not exists socials jsonb,
        add column if not exists updated_at timestamptz;
    """
    await con.execute(ddl)

@router.get("/api/profile")
async def get_profile():
    async with pool().acquire() as con:
        await _ensure_table(con)
        row = await con.fetchrow("""
            select id, full_name, headline, bio, location, email, phone, avatar_url, banner_url, socials
            from profile
            order by id asc
            limit 1;
        """)
    return _read_profile_row(row) if row else None

def _merge_socials(current_socials: dict, incoming: dict, body: dict) -> dict:
    """
    Merge current socials with new socials.
    Extras can arrive as `socials.extras` or as top-level fields in body.
    """
    cur = _safe_json_to_dict(current_socials)
    inc = _safe_json_to_dict(incoming)

    # Start with current -> overlay incoming (shallow)
    merged = {**cur, **inc}

    # Determine extras (priority: socials.extras, else top-level fields)
    extras_from_socials = _safe_json_to_dict(inc.get("extras")) if "extras" in inc else {}
    top_level_extras = {
        "interests": body.get("interests"),
        "languages": body.get("languages"),
        "focus": body.get("focus"),
        "motto": body.get("motto"),
    }
    # Filter out Nones in top-level extras
    top_level_extras = {k: v for k, v in top_level_extras.items() if v is not None}

    # Choose the source: prefer socials.extras if provided; otherwise top-level
    base_extras = extras_from_socials if extras_from_socials else top_level_extras
    # Normalize and fill defaults
    normalized = _ensure_extras_shape(_safe_json_to_dict(base_extras))
    merged["extras"] = normalized
    return merged

@router.api_route("/api/profile", methods=["POST", "PUT"])
async def upsert_profile(body: dict, user=Depends(require_owner)):
    """
    Accept both POST and PUT to solve 405 for clients that POST first.
    Stores quote into `headline`, about into `bio`, and merges socials.extras.
    """
    async with pool().acquire() as con:
        await _ensure_table(con)

        # Load current row
        row = await con.fetchrow("select id, socials from profile order by id asc limit 1;")
        current_socials = _safe_json_to_dict(row["socials"]) if row else {}

        # Merge socials (handles both socials.extras and top-level extras fields)
        incoming_socials = _safe_json_to_dict(body.get("socials"))
        merged_socials = _merge_socials(current_socials, incoming_socials, body)
        socials_json = json.dumps(merged_socials)

        full_name = body.get("fullName") or ""
        headline = body.get("quote") or body.get("headline") or None
        bio = body.get("about") or body.get("bio") or None
        avatar_url = body.get("avatarUrl") or None

        if not row:
            saved = await con.fetchrow(
                """
                insert into profile (id, full_name, headline, bio, avatar_url, socials, updated_at)
                values (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, now())
                returning id, full_name, headline, bio, location, email, phone, avatar_url, banner_url, socials;
                """,
                full_name, headline, bio, avatar_url, socials_json
            )
        else:
            saved = await con.fetchrow(
                """
                update profile
                   set full_name=$1,
                       headline=$2,
                       bio=$3,
                       avatar_url=$4,
                       socials=$5::jsonb,
                       updated_at=now()
                 where id=$6
                returning id, full_name, headline, bio, location, email, phone, avatar_url, banner_url, socials;
                """,
                full_name, headline, bio, avatar_url, socials_json, row["id"]
            )

    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save profile")

    return _read_profile_row(saved)
