from fastapi import APIRouter, HTTPException
from ..db import pool
import json
import uuid

router = APIRouter()


async def _ensure_table(con):
    # No extension required; UUID type is built-in.
    await con.execute(
        """
        create table if not exists contact_messages (
            id uuid primary key,
            name text not null,
            email text null,
            message text not null,
            meta jsonb null,
            created_at timestamptz not null default now()
        );
        """
    )


@router.post("/contact")
@router.post("/api/contact")
async def contact(body: dict):
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()
    message = (body.get("message") or "").strip()
    meta = body.get("meta")

    if not name or not message:
        raise HTTPException(status_code=400, detail="Name and message are required.")

    new_id = str(uuid.uuid4())

    async with pool().acquire() as con:
        await _ensure_table(con)
        await con.execute(
            """
            insert into contact_messages (id, name, email, message, meta)
            values ($1, $2, $3, $4, $5::jsonb);
            """,
            new_id,
            name,
            email or None,
            message,
            json.dumps(meta) if meta is not None else None,
        )

    return {"ok": True, "id": new_id}
