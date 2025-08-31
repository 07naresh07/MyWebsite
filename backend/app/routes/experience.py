from fastapi import APIRouter, Depends, HTTPException
from ..db import pool
from ..auth import require_owner
from ..utils import try_parse_date_flexible, to_year_month, to_year_month_or_none

import json
import re

router = APIRouter()

# ---------- helpers ----------

_bullet_re = re.compile(r'^(\-|\*|•)\s+')

def _escape_html(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )

def _text_to_html(text: str) -> str:
    """
    Convert our plain-text format to HTML.
    - Lines beginning with -, * or • become <li> items.
    - Consecutive bullet lines are grouped into a <ul>.
    - Other lines become <p>.
    """
    text = (text or "").replace("\r\n", "\n").strip()
    if not text:
        return ""

    lines = [ln.rstrip() for ln in text.split("\n")]
    html_parts = []
    ul_buffer = []

    def flush_ul():
        nonlocal ul_buffer, html_parts
        if ul_buffer:
            items = "".join(f"<li>{_escape_html(item)}</li>" for item in ul_buffer)
            # marker:text-current is front-end (Tailwind). Keep HTML semantic here.
            html_parts.append(f"<ul>{items}</ul>")
            ul_buffer = []

    for ln in lines:
        m = _bullet_re.match(ln.strip())
        if m:
            content = ln.strip()[m.end():].strip()
            if content:
                ul_buffer.append(content)
            continue
        # non-bullet -> end any open list and add a paragraph
        flush_ul()
        if ln.strip():
            html_parts.append(f"<p>{_escape_html(ln.strip())}</p>")

    flush_ul()
    return "".join(html_parts)

def _to_string_list(v) -> list[str]:
    """Turn JSON array / Python list / comma string / objects-with-name into a clean string list."""
    if v is None:
        return []
    if isinstance(v, list):
        out = []
        for x in v:
            if x is None:
                continue
            if isinstance(x, (str, int, float)):
                s = str(x).strip()
                if s:
                    out.append(s)
            elif isinstance(x, dict):
                for k in ("name", "label", "title", "value", "text"):
                    if k in x and str(x[k]).strip():
                        out.append(str(x[k]).strip())
                        break
        return [t for t in out if t]
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return []
        try:
            j = json.loads(s)
            if isinstance(j, list):
                return _to_string_list(j)
        except Exception:
            pass
        return [t.strip() for t in re.split(r"[,\n]", s) if t.strip()]
    return []

def _parse_tools(body: dict) -> list[str]:
    for key in ("tools", "techTags", "technologies", "skills", "tags"):
        if key in body:
            return _to_string_list(body.get(key))
    return []

def _read_row(r) -> dict:
    tools = r["tech_tags"] or []
    return {
        "id": r["id"],
        "company": r["company"],
        "role": r["role"],
        "project": r["project"],
        "location": r["location"],
        "startDate": r["start_date"],
        "endDate": r["end_date"],

        # we now expose BOTH plain and HTML forms
        "description": r["description"] or "",
        "descriptionHtml": r["description_html"] or "",

        # skills/tech – keep legacy and new names so all clients are happy
        "techTags": tools,
        "tools": tools,
        "tags": tools,
        "skills": tools,

        "sortOrder": r["sort_order"],
    }

# ---------- routes ----------

@router.get("/api/experience")
async def list_experience():
    async with pool().acquire() as con:
        rows = await con.fetch("""
            select
                id, company, role, project, location,
                start_date, end_date,
                description, description_html,
                tech_tags, sort_order
            from experience
            order by sort_order asc, start_date desc nulls last;
        """)
    return [_read_row(r) for r in rows]

@router.post("/api/experience")
async def create_experience(body: dict, user=Depends(require_owner)):
    ok, start, err = try_parse_date_flexible(body.get("startDate"))
    if not ok:
        raise HTTPException(status_code=400, detail=f"startDate: {err}")

    if body.get("endDate"):
        end_ok, end_dt, _ = try_parse_date_flexible(body.get("endDate"))
        if not end_ok:
            raise HTTPException(
                status_code=400,
                detail="endDate: Unsupported date format. Use ISO, yyyy-MM-dd, yyyy-MM, or yyyy.",
            )
    else:
        end_dt = None

    start_ym = to_year_month(start)
    end_ym = to_year_month_or_none(end_dt)

    # Plain text description is authoritative; HTML is derived (or take provided)
    desc_text = (body.get("description") or "").strip()
    desc_html = (body.get("descriptionHtml") or _text_to_html(desc_text)).strip()

    tools = _parse_tools(body)

    async with pool().acquire() as con:
        row = await con.fetchrow(
            """
            insert into experience (
                id, company, role, project, location,
                start_ym, end_ym, start_date, end_date,
                description, description_html, tech_tags, sort_order
            )
            values (
                gen_random_uuid(), $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11, $12
            )
            returning
                id, company, role, project, location,
                start_date, end_date,
                description, description_html,
                tech_tags, sort_order;
            """,
            body.get("company") or "",
            body.get("role") or "",
            body.get("project"),
            body.get("location"),
            start_ym,
            end_ym,
            start,
            end_dt,
            desc_text,
            desc_html,
            tools,
            body.get("sortOrder") or 0,
        )

    if not row:
        raise HTTPException(status_code=400, detail="Insert failed")
    return _read_row(row)

@router.put("/api/experience/{id}")
async def update_experience(id: str, body: dict, user=Depends(require_owner)):
    ok, start, err = try_parse_date_flexible(body.get("startDate"))
    if not ok:
        raise HTTPException(status_code=400, detail=f"startDate: {err}")

    if body.get("endDate"):
        end_ok, end_dt, _ = try_parse_date_flexible(body.get("endDate"))
        if not end_ok:
            raise HTTPException(
                status_code=400,
                detail="endDate: Unsupported date format. Use ISO, yyyy-MM-dd, yyyy-MM, or yyyy.",
            )
    else:
        end_dt = None

    start_ym = to_year_month(start)
    end_ym = to_year_month_or_none(end_dt)

    desc_text = (body.get("description") or "").strip()
    desc_html = (body.get("descriptionHtml") or _text_to_html(desc_text)).strip()
    tools = _parse_tools(body)

    async with pool().acquire() as con:
        row = await con.fetchrow(
            """
            update experience set
                company=$1,
                role=$2,
                project=$3,
                location=$4,
                start_ym=$5,
                end_ym=$6,
                start_date=$7,
                end_date=$8,
                description=$9,
                description_html=$10,
                tech_tags=$11,
                sort_order=$12
            where id=$13
            returning
                id, company, role, project, location,
                start_date, end_date,
                description, description_html,
                tech_tags, sort_order;
            """,
            body.get("company") or "",
            body.get("role") or "",
            body.get("project"),
            body.get("location"),
            start_ym,
            end_ym,
            start,
            end_dt,
            desc_text,
            desc_html,
            tools,
            body.get("sortOrder") or 0,
            id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_row(row)

@router.delete("/api/experience/{id}")
async def delete_experience(id: str, user=Depends(require_owner)):
    async with pool().acquire() as con:
        res = await con.execute("delete from experience where id=$1;", id)
    if res.endswith("0"):
        raise HTTPException(status_code=404, detail="Not found")
    return {}
