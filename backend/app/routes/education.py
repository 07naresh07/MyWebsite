# app/routes/education.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, Set, Tuple
from uuid import uuid4
import re

from ..db import pool
from ..auth import require_owner

router = APIRouter()

# --------------------------- helpers ---------------------------

async def _education_columns(con) -> Set[str]:
    rows = await con.fetch("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'education';
    """)
    return {r["column_name"] for r in rows}

def _as_int(x):
    try:
        if x is None or str(x).strip() == "":
            return None
        return int(x)
    except Exception:
        return None

def _as_float(x):
    try:
        if x is None or str(x).strip() == "":
            return None
        return float(x)
    except Exception:
        return None

def _split_ym(val) -> Tuple[int | None, int | None]:
    """Parse 'YYYY-MM' into (year, month). Returns (None, None) if invalid."""
    if not val:
        return None, None
    try:
        m = re.match(r"^\s*(\d{4})-(\d{2})\s*$", str(val))
        if not m:
            return None, None
        y = int(m.group(1))
        mm = int(m.group(2))
        if 1 <= mm <= 12:
            return y, mm
        return y, None
    except Exception:
        return None, None

def _read_row(r) -> dict:
    # The SELECT statements below guarantee these aliases always exist.
    return {
        "id": r["id"],
        "school": r["school"],
        "degree": r["degree"],
        "field": r["field"],
        "startYear": r["start_year"],
        "endYear": r["end_year"],
        "startMonth": r["start_month"],   # can be None if DB has NULL or column absent
        "endMonth": r["end_month"],       # can be None if DB has NULL or column absent
        "details": r["details"],
        "sortOrder": r["sort_order"],
        "thesis": r["thesis"],
        "description": r["description"],
        "level": r["level"],
        "gpa": r["gpa"],
    }

def _select_piece(cols: Set[str], name: str, alias: str, null_cast: str) -> str:
    """Return 'name as alias' if the column exists, else 'NULL::<type> as alias'."""
    return f"{name} AS {alias}" if name in cols else f"NULL::{null_cast} AS {alias}"

# --------------------------- queries ---------------------------

async def _select_row_by_id(con, row_id: str) -> Dict[str, Any]:
    cols = await _education_columns(con)

    # details can be in either details_html or details
    if "details_html" in cols:
        select_details = "details_html AS details"
    elif "details" in cols:
        select_details = "details AS details"
    else:
        select_details = "NULL::text AS details"

    # optional columns
    sel_thesis = _select_piece(cols, "thesis", "thesis", "text")
    sel_description = _select_piece(cols, "description", "description", "text")
    sel_level = _select_piece(cols, "level", "level", "text")
    sel_gpa = _select_piece(cols, "gpa", "gpa", "numeric")

    # months: if present return as-is (no COALESCE), else NULL
    sel_start_month = _select_piece(cols, "start_month", "start_month", "int2")
    sel_end_month = _select_piece(cols, "end_month", "end_month", "int2")

    row = await con.fetchrow(f"""
        SELECT id, school, degree, field,
               start_year, end_year,
               {sel_start_month}, {sel_end_month},
               {select_details},
               {sel_thesis}, {sel_description}, {sel_level}, {sel_gpa},
               sort_order
        FROM education
        WHERE id = $1
        LIMIT 1;
    """, row_id)
    return row

# --------------------------- routes ---------------------------

@router.get("/api/education")
async def list_education():
    async with pool().acquire() as con:
        cols = await _education_columns(con)

        if "details_html" in cols:
            select_details = "details_html AS details"
        elif "details" in cols:
            select_details = "details AS details"
        else:
            select_details = "NULL::text AS details"

        sel_thesis = _select_piece(cols, "thesis", "thesis", "text")
        sel_description = _select_piece(cols, "description", "description", "text")
        sel_level = _select_piece(cols, "level", "level", "text")
        sel_gpa = _select_piece(cols, "gpa", "gpa", "numeric")

        # months as-is (no COALESCE)
        sel_start_month = _select_piece(cols, "start_month", "start_month", "int2")
        sel_end_month = _select_piece(cols, "end_month", "end_month", "int2")

        rows = await con.fetch(f"""
            SELECT id, school, degree, field,
                   start_year, end_year,
                   {sel_start_month}, {sel_end_month},
                   {select_details},
                   {sel_thesis}, {sel_description}, {sel_level}, {sel_gpa},
                   sort_order
            FROM education
            ORDER BY sort_order ASC,
                     COALESCE(end_year, 9999) DESC,
                     COALESCE(start_year, 0) DESC;
        """)

    return [_read_row(r) for r in rows]

@router.post("/api/education")
async def create_education(body: dict, user=Depends(require_owner)):
    # Normalized inputs
    school = (body.get("school") or "").strip()
    degree = body.get("degree")
    field = body.get("field")
    start_year = _as_int(body.get("startYear"))
    end_year = _as_int(body.get("endYear"))
    details_val = body.get("details")
    thesis = body.get("thesis")
    description = body.get("description")
    level = body.get("level")
    gpa = _as_float(body.get("gpa"))
    sort_order = _as_int(body.get("sortOrder")) or 0

    # months from camel/snake case, with fallback to startYM/endYM
    start_month = _as_int(body.get("startMonth") or body.get("start_month"))
    end_month = _as_int(body.get("endMonth") or body.get("end_month"))

    sy2, sm2 = _split_ym(body.get("startYM") or body.get("start_ym"))
    ey2, em2 = _split_ym(body.get("endYM") or body.get("end_ym"))

    if start_year is None and sy2 is not None:
        start_year = sy2
    if start_month is None and sm2 is not None:
        start_month = sm2

    if end_year is None and ey2 is not None:
        end_year = ey2
    if end_month is None and em2 is not None:
        end_month = em2

    # Clamp invalid months to None (don't force Jan/Dec)
    if start_month is not None and not (1 <= int(start_month) <= 12):
        start_month = None
    if end_month is not None and not (1 <= int(end_month) <= 12):
        end_month = None

    new_id = str(uuid4())

    async with pool().acquire() as con:
        cols = await _education_columns(con)

        # Build dynamic INSERT with only existing columns
        insert_cols = ["id", "school", "degree", "field", "start_year", "end_year", "sort_order"]
        insert_vals = [new_id, school, degree, field, start_year, end_year, sort_order]

        if "start_month" in cols:
            insert_cols.append("start_month")
            insert_vals.append(start_month)
        if "end_month" in cols:
            insert_cols.append("end_month")
            insert_vals.append(end_month)

        details_col = "details_html" if "details_html" in cols else ("details" if "details" in cols else None)
        if details_col:
            insert_cols.append(details_col)
            insert_vals.append(details_val)

        if "thesis" in cols:
            insert_cols.append("thesis")
            insert_vals.append(thesis)
        if "description" in cols:
            insert_cols.append("description")
            insert_vals.append(description)
        if "level" in cols:
            insert_cols.append("level")
            insert_vals.append(level)
        if "gpa" in cols:
            insert_cols.append("gpa")
            insert_vals.append(gpa)

        placeholders = ", ".join(f"${i}" for i in range(1, len(insert_vals) + 1))
        collist = ", ".join(insert_cols)

        await con.execute(
            f"INSERT INTO education ({collist}) VALUES ({placeholders});",
            *insert_vals
        )

        row = await _select_row_by_id(con, new_id)

    if not row:
        raise HTTPException(status_code=400, detail="Insert failed")
    return _read_row(row)

@router.put("/api/education/{id}")
async def update_education(id: str, body: dict, user=Depends(require_owner)):
    school = (body.get("school") or "").strip()
    degree = body.get("degree")
    field = body.get("field")
    start_year = _as_int(body.get("startYear"))
    end_year = _as_int(body.get("endYear"))
    details_val = body.get("details")
    thesis = body.get("thesis")
    description = body.get("description")
    level = body.get("level")
    gpa = _as_float(body.get("gpa"))
    sort_order = _as_int(body.get("sortOrder")) or 0

    # months from camel/snake case, with fallback to startYM/endYM
    start_month = _as_int(body.get("startMonth") or body.get("start_month"))
    end_month = _as_int(body.get("endMonth") or body.get("end_month"))

    sy2, sm2 = _split_ym(body.get("startYM") or body.get("start_ym"))
    ey2, em2 = _split_ym(body.get("endYM") or body.get("end_ym"))

    if start_year is None and sy2 is not None:
        start_year = sy2
    if start_month is None and sm2 is not None:
        start_month = sm2

    if end_year is None and ey2 is not None:
        end_year = ey2
    if end_month is None and em2 is not None:
        end_month = em2

    # Clamp invalid months to None (don't force Jan/Dec)
    if start_month is not None and not (1 <= int(start_month) <= 12):
        start_month = None
    if end_month is not None and not (1 <= int(end_month) <= 12):
        end_month = None

    async with pool().acquire() as con:
        cols = await _education_columns(con)

        sets = ["school=$1", "degree=$2", "field=$3", "start_year=$4", "end_year=$5", "sort_order=$6"]
        vals = [school, degree, field, start_year, end_year, sort_order]
        n = 6

        if "start_month" in cols:
            n += 1; sets.append(f"start_month=${n}"); vals.append(start_month)
        if "end_month" in cols:
            n += 1; sets.append(f"end_month=${n}"); vals.append(end_month)

        details_col = "details_html" if "details_html" in cols else ("details" if "details" in cols else None)
        if details_col:
            n += 1; sets.append(f"{details_col}=${n}"); vals.append(details_val)

        if "thesis" in cols:
            n += 1; sets.append(f"thesis=${n}"); vals.append(thesis)
        if "description" in cols:
            n += 1; sets.append(f"description=${n}"); vals.append(description)
        if "level" in cols:
            n += 1; sets.append(f"level=${n}"); vals.append(level)
        if "gpa" in cols:
            n += 1; sets.append(f"gpa=${n}"); vals.append(gpa)

        n += 1
        vals.append(id)

        res = await con.execute(
            f"UPDATE education SET {', '.join(sets)} WHERE id=${n};",
            *vals
        )

        if res.endswith("0"):
            raise HTTPException(status_code=404, detail="Not found")

        row = await _select_row_by_id(con, id)

    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_row(row)

@router.delete("/api/education/{id}")
async def delete_education(id: str, user=Depends(require_owner)):
    async with pool().acquire() as con:
        res = await con.execute("DELETE FROM education WHERE id=$1;", id)
    if res.endswith("0"):
        raise HTTPException(status_code=404, detail="Not found")
    return {}
