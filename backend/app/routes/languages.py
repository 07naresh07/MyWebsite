from fastapi import APIRouter
from ..db import pool

router = APIRouter()


async def _ensure_table(con):
    # Create table if missing and add any missing columns for forward compatibility.
    await con.execute(
        """
        create table if not exists languages (
            id uuid primary key,
            name text not null,
            code text not null,
            level_cefr text null,
            proficiency_pct int not null default 0,
            is_primary boolean not null default false,
            notes text null,
            sort_order int not null default 0,
            created_at timestamptz not null default now(),
            updated_at timestamptz null
        );

        alter table languages
            add column if not exists level_cefr text,
            add column if not exists proficiency_pct int not null default 0,
            add column if not exists is_primary boolean not null default false,
            add column if not exists notes text,
            add column if not exists sort_order int not null default 0,
            add column if not exists created_at timestamptz not null default now(),
            add column if not exists updated_at timestamptz;
        """
    )


@router.get("/api/languages")
@router.get("/languages")
async def list_languages():
    async with pool().acquire() as con:
        await _ensure_table(con)
        rows = await con.fetch(
            """
            select id, name, code, level_cefr, proficiency_pct, is_primary, notes, sort_order
            from languages
            order by is_primary desc, sort_order asc, name asc;
            """
        )

    # Keep anonymous C#-style shape
    items = []
    for r in rows:
        items.append(
            {
                "Id": r["id"],
                "Name": r["name"],
                "Code": r["code"],
                "LevelCEFR": r["level_cefr"],
                "ProficiencyPct": r["proficiency_pct"],
                "IsPrimary": r["is_primary"],
                "Notes": r["notes"],
                "SortOrder": r["sort_order"],
            }
        )
    return items
