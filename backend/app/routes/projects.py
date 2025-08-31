from fastapi import APIRouter, Depends, HTTPException
from ..db import pool
from ..auth import require_owner
import json

router = APIRouter()

def _normalize_links(value):
    """Return (links_dict, url_str) from db value which may be dict/None/str."""
    links = value or {}
    if isinstance(links, str):
        try:
            links = json.loads(links) if links else {}
        except Exception:
            links = {}
    url = None
    if isinstance(links, dict):
        url = links.get("url") or links.get("link") or None
    return links if isinstance(links, dict) else {}, url

def _read_project_row(r) -> dict:
    links_dict, url = _normalize_links(r["links"])
    return {
        "id": r["id"],
        "name": r["name"],
        "slug": r["slug"],
        "summary": r["summary_html"],
        "techStack": r["tech_stack"] or [],
        "images": r["images"] or [],
        "links": links_dict,      # object for editors
        "url": url,               # convenience for anchors
        "projectUrl": url,        # convenience for forms
        "featured": r["featured"],
        "sortOrder": r["sort_order"],
        "client": r.get("client") or "",
        "role": r.get("role") or "",
        "location": r.get("location") or "",
        "startDate": r.get("start_date") or "",
        "endDate": r.get("end_date"),
        "status": r.get("status") or "In Progress",
    }

async def _ensure_columns(con):
    ddl = """
    alter table if exists projects
        add column if not exists summary_html text,
        add column if not exists links jsonb,
        add column if not exists client text,
        add column if not exists role text,
        add column if not exists location text,
        add column if not exists start_date text,
        add column if not exists end_date text,
        add column if not exists status text;
    """
    await con.execute(ddl)

@router.get("/api/projects")
async def list_projects():
    async with pool().acquire() as con:
        await _ensure_columns(con)
        rows = await con.fetch("""
            select id, name, slug, summary_html, tech_stack, images,
                   coalesce(links,'{}'::jsonb) as links,
                   featured, sort_order,
                   client, role, location, start_date, end_date, status
            from projects
            order by sort_order asc, name asc;
        """)
    return [_read_project_row(r) for r in rows]

def _incoming_links_from_body(body: dict):
    """
    Accept either:
      - links: {"url": "..."}  (object)
      - projectUrl: "..."      (string)
    Return a python object (dict) or None if not provided.
    """
    if "links" in body:
        return body.get("links")
    if body.get("projectUrl"):
        return {"url": str(body["projectUrl"]).strip()}
    return None

@router.post("/api/projects")
async def create_project(body: dict, user=Depends(require_owner)):
    name = (body.get("name") or "").strip()
    final_slug = (body.get("slug") or None) or (name.lower().replace(" ", "-") if name else None)

    incoming_links = _incoming_links_from_body(body)  # dict or None
    links_json = json.dumps(incoming_links) if incoming_links is not None else None

    async with pool().acquire() as con:
        await _ensure_columns(con)
        row = await con.fetchrow("""
            insert into projects (
                id, name, slug, summary_html, tech_stack, images, links,
                featured, sort_order,
                client, role, location, start_date, end_date, status
            )
            values (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb,
                $7, $8,
                $9, $10, $11, $12, $13, $14
            )
            returning id, name, slug, summary_html, tech_stack, images,
                      coalesce(links,'{}'::jsonb) as links,
                      featured, sort_order,
                      client, role, location, start_date, end_date, status;
        """,
        name,
        final_slug,
        body.get("summary"),
        body.get("techStack") or [],
        body.get("images") or [],
        links_json,  # NULL if not provided
        body.get("featured") or False,
        body.get("sortOrder") or 0,
        body.get("client") or "",
        body.get("role") or "",
        body.get("location") or "",
        body.get("startDate") or "",
        body.get("endDate"),
        body.get("status") or "In Progress"
        )
    if not row:
        raise HTTPException(status_code=400, detail="Insert failed")
    return _read_project_row(row)

@router.put("/api/projects/{id}")
async def update_project(id: str, body: dict, user=Depends(require_owner)):
    name = (body.get("name") or "").strip()
    final_slug = (body.get("slug") or None) or (name.lower().replace(" ", "-") if name else None)

    # Will we touch `links`?
    links_key_present = ("links" in body) or ("projectUrl" in body)
    incoming_links = _incoming_links_from_body(body)  # dict or None (clear) or None (absent)
    links_json = json.dumps(incoming_links) if (links_key_present and incoming_links is not None) else None

    sets = []
    vals = []

    def add_set(col, val, cast: str = ""):
        idx = len(vals) + 1
        sets.append(f"{col}=${idx}{cast}")
        vals.append(val)

    add_set("name", name)
    add_set("slug", final_slug)
    add_set("summary_html", body.get("summary"))
    add_set("tech_stack", body.get("techStack") or [])
    add_set("images", body.get("images") or [])
    add_set("featured", body.get("featured") or False)
    add_set("sort_order", body.get("sortOrder") or 0)
    add_set("client", body.get("client") or "")
    add_set("role", body.get("role") or "")
    add_set("location", body.get("location") or "")
    add_set("start_date", body.get("startDate") or "")
    add_set("end_date", body.get("endDate"))  # nullable
    add_set("status", body.get("status") or "In Progress")

    if links_key_present:
        # set json or NULL if caller wants to clear
        add_set("links", links_json, "::jsonb")

    # id placeholder index (after the sets)
    id_idx = len(vals) + 1
    vals.append(id)

    # Build SQL without placing '{}' inside an f-string
    sql = (
        "update projects set\n"
        f"    {', '.join(sets)}\n"
        f"where id=${id_idx}\n"
        "returning id, name, slug, summary_html, tech_stack, images,\n"
        "          coalesce(links,'{}'::jsonb) as links,\n"
        "          featured, sort_order,\n"
        "          client, role, location, start_date, end_date, status;"
    )

    async with pool().acquire() as con:
        await _ensure_columns(con)
        row = await con.fetchrow(sql, *vals)

    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return _read_project_row(row)

@router.delete("/api/projects/{id}")
async def delete_project(id: str, user=Depends(require_owner)):
    async with pool().acquire() as con:
        res = await con.execute("delete from projects where id=$1;", id)
    if res.endswith("0"):
        raise HTTPException(status_code=404, detail="Not found")
    return {}
