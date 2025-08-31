from fastapi import APIRouter, Depends, HTTPException
from ..db import pool
from ..auth import require_owner

router = APIRouter()


def _read_row(r) -> dict:
    return {
        "id": r["id"],
        "name": r["name"],
        "category": r["category"],
        "level": r["level"],
        "sortOrder": r["sort_order"],
        "createdAt": r.get("created_at"),
        "updatedAt": r.get("updated_at"),
    }


async def _ensure_table(con):
    # Flexible schema: keep level as TEXT so you can store "Beginner/Advanced" or "90"
    ddl = """
    create table if not exists skills (
        id uuid primary key,
        name text not null,
        category text null,
        level text null,
        sort_order int not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz null
    );

    -- Idempotent "add column if not exists" to evolve older DBs
    alter table skills
        add column if not exists category text,
        add column if not exists level text,
        add column if not exists sort_order int not null default 0,
        add column if not exists created_at timestamptz not null default now(),
        add column if not exists updated_at timestamptz;

    -- Helpful indexes
    create index if not exists idx_skills_sort on skills (sort_order asc, name asc);
    create index if not exists idx_skills_category on skills (category);
    """
    await con.execute(ddl)


def _no_rows(res: str) -> bool:
    # postgres returns "DELETE 0" / "DELETE 1"
    try:
        return int(res.split()[-1]) == 0
    except Exception:
        return res.endswith("0")


@router.get("/api/skills")
async def list_skills():
    async with pool().acquire() as con:
        await _ensure_table(con)
        rows = await con.fetch(
            """
            select id, name, category, level, sort_order, created_at, updated_at
            from skills
            order by sort_order asc, name asc;
            """
        )
    return [_read_row(r) for r in rows]


@router.post("/api/skills")
async def create_skill(body: dict, user=Depends(require_owner)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    category = (body.get("category") or None) or None
    level = (body.get("level") or None) or None
    try:
        sort_order = int(body.get("sortOrder") or 0)
    except Exception:
        sort_order = 0

    async with pool().acquire() as con:
        await _ensure_table(con)
        row = await con.fetchrow(
            """
            insert into skills (id, name, category, level, sort_order, created_at, updated_at)
            values (gen_random_uuid(), $1, $2, $3, $4, now(), now())
            returning id, name, category, level, sort_order, created_at, updated_at;
            """,
            name,
            category,
            level,
            sort_order,
        )
    return _read_row(row)


@router.put("/api/skills/{id}")
async def update_skill(id: str, body: dict, user=Depends(require_owner)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    category = (body.get("category") or None) or None
    level = (body.get("level") or None) or None
    try:
        sort_order = int(body.get("sortOrder") or 0)
    except Exception:
        sort_order = 0

    async with pool().acquire() as con:
        await _ensure_table(con)
        row = await con.fetchrow(
            """
            update skills
               set name=$1, category=$2, level=$3, sort_order=$4, updated_at=now()
             where id=$5
         returning id, name, category, level, sort_order, created_at, updated_at;
            """,
            name,
            category,
            level,
            sort_order,
            id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_row(row)


@router.delete("/api/skills/{id}")
async def delete_skill(id: str, user=Depends(require_owner)):
    async with pool().acquire() as con:
        await _ensure_table(con)
        res = await con.execute("delete from skills where id=$1;", id)
    if _no_rows(res):
        raise HTTPException(status_code=404, detail="Not found")
    return {}
