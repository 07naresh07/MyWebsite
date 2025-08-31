from fastapi import APIRouter, Depends, HTTPException
from ..db import pool
from ..auth import require_owner
from ..utils import save_data_url_image
import os
import uuid

router = APIRouter()


# --------------------------- Row adapters -----------------------------------
def _read_cert_row(r) -> dict:
    return {
        "id": r["id"],
        "title": r["title"],
        "issuer": r["issuer"],
        "type": r["type"],
        "dateMonth": r["date_month"],
        "credentialId": r["credential_id"],
        "credentialUrl": r["credential_url"],
        "imageUrl": r["image_url"],
        "skills": r["skills"] or [],
        "description": r["description"],
        "sortOrder": r["sort_order"],
        "createdAt": r["created_at"],
        "updatedAt": r["updated_at"],
    }


# --------------------------- Schema bootstrap -------------------------------
async def _ensure_table(con):
    ddl = """
    create table if not exists certificates (
        id uuid primary key,
        title text not null,
        issuer text null,
        type text null,
        date_month text null,
        credential_id text null,
        credential_url text null,
        image_url text null,
        skills text[] not null default '{}',
        description text null,
        sort_order int not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz null
    );

    -- Backfill columns for older deployments (safe if already exist)
    alter table certificates
        add column if not exists skills text[] not null default '{}',
        add column if not exists description text,
        add column if not exists updated_at timestamptz;
    """
    await con.execute(ddl)


# --------------------------- Read endpoints ---------------------------------
@router.get("/api/certificates")
async def list_certificates():
    """
    Full certificate rows (used by editor to prefill).
    """
    async with pool().acquire() as con:
        await _ensure_table(con)
        rows = await con.fetch(
            """
            select id, title, issuer, type, date_month, credential_id, credential_url,
                   image_url, skills, description, sort_order, created_at, updated_at
            from certificates
            order by sort_order asc, created_at desc;
            """
        )
    return [_read_cert_row(r) for r in rows]


@router.get("/api/certificates/{id}")
async def get_certificate(id: str):
    """
    Get a single certificate by id.
    """
    async with pool().acquire() as con:
        await _ensure_table(con)
        r = await con.fetchrow(
            """
            select id, title, issuer, type, date_month, credential_id, credential_url,
                   image_url, skills, description, sort_order, created_at, updated_at
            from certificates
            where id = $1;
            """,
            id,
        )
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_cert_row(r)


@router.get("/api/gallery")
async def list_gallery():
    """
    Lightweight gallery list used by the public grid.  Historically this only
    returned a computed 'description'. To keep backward compatibility we keep
    that field *and* include the structured fields your editor needs so editing
    a 'Course' doesn't fall back to 'Certificate'.
    """
    async with pool().acquire() as con:
        await _ensure_table(con)
        rows = await con.fetch(
            """
            select
                id,
                title,
                issuer,
                type,
                date_month,
                credential_id,
                credential_url,
                image_url,
                skills,
                description as raw_description,
                sort_order,
                -- legacy computed description kept for gallery cards:
                coalesce(issuer,'') ||
                case when date_month is not null then ' • '||date_month else '' end as legacy_description
            from certificates
            order by sort_order asc, created_at desc;
            """
        )

    items = []
    for r in rows:
        items.append(
            {
                # minimal, legacy fields expected by existing gallery views
                "id": r["id"],
                "title": r["title"],
                "description": r["legacy_description"],  # (kept for backward-compat)
                "imageUrl": r["image_url"],
                "tags": [],  # unchanged
                "sortOrder": r["sort_order"],
                "published": True,

                # ✅ extra structured fields for editors / prefills
                "issuer": r["issuer"],
                "type": r["type"],
                "dateMonth": r["date_month"],
                "credentialId": r["credential_id"],
                "credentialUrl": r["credential_url"],
                "skills": r["skills"] or [],
                "rawDescription": r["raw_description"],  # the real description column
            }
        )
    return items


# --------------------------- Create / Update / Delete -----------------------
@router.post("/api/gallery")
async def create_gallery(body: dict, user=Depends(require_owner)):
    """
    Create a new certificate row.

    Accepts either:
      - image: data URL string
      - imageUrl: data URL string or an existing URL
    In both cases, if a data URL is provided it will be saved under /uploads
    and imageUrl will point to the saved file.
    """
    webroot = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )
    os.makedirs(webroot, exist_ok=True)

    image_url = body.get("imageUrl")
    data_url = body.get("image") or (
        image_url if (image_url or "").startswith("data:image/") else None
    )
    if data_url:
        saved = save_data_url_image(data_url, webroot)
        if saved:
            image_url = saved

    new_id = str(uuid.uuid4())

    async with pool().acquire() as con:
        await _ensure_table(con)
        row = await con.fetchrow(
            """
            insert into certificates (
                id, title, issuer, type, date_month,
                credential_id, credential_url,
                image_url, skills, description,
                sort_order, created_at, updated_at
            )
            values (
                $1, $2, $3, $4, $5,
                $6, $7,
                $8, $9, $10,
                $11, now(), now()
            )
            returning id;
            """,
            new_id,
            body.get("title") or "",
            body.get("issuer"),
            body.get("type"),
            body.get("dateMonth"),
            body.get("credentialId"),
            body.get("credentialUrl"),   # ✅ verification URL saved
            image_url,
            body.get("skills") or [],
            body.get("description"),
            body.get("sortOrder") or 0,
        )

    return {"id": row["id"], "imageUrl": image_url}


@router.put("/api/gallery/{id}")
async def update_gallery(id: str, body: dict, user=Depends(require_owner)):
    """
    Update an existing certificate by ID. Same image semantics as create.
    """
    webroot = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )
    os.makedirs(webroot, exist_ok=True)

    image_url = body.get("imageUrl")
    data_url = body.get("image") or (
        image_url if (image_url or "").startswith("data:image/") else None
    )
    if data_url:
        saved = save_data_url_image(data_url, webroot)
        if saved:
            image_url = saved

    async with pool().acquire() as con:
        await _ensure_table(con)
        row = await con.fetchrow(
            """
            update certificates set
                title=$1,
                issuer=$2,
                type=$3,
                date_month=$4,
                credential_id=$5,
                credential_url=$6,
                image_url=$7,
                skills=$8,
                description=$9,
                sort_order=$10,
                updated_at=now()
            where id=$11
            returning id;
            """,
            body.get("title") or "",
            body.get("issuer"),
            body.get("type"),
            body.get("dateMonth"),
            body.get("credentialId"),
            body.get("credentialUrl"),   # ✅ verification URL preserved
            image_url,
            body.get("skills") or [],
            body.get("description"),
            body.get("sortOrder") or 0,
            id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": id, "imageUrl": image_url}


@router.delete("/api/gallery/{id}")
async def delete_gallery(id: str, user=Depends(require_owner)):
    async with pool().acquire() as con:
        await _ensure_table(con)
        res = await con.execute("delete from certificates where id=$1;", id)
    if res.endswith("0"):
        raise HTTPException(status_code=404, detail="Not found")
    return {}
