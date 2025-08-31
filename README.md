# Python FastAPI backend (C# parity)

This FastAPI app mirrors your existing .NET minimal API: routes, payloads, and behavior.
It targets PostgreSQL and expects the same tables. Where necessary, it creates tables
(or missing columns) at runtime, similar to the C# helpers.

## Quick start

```bash
# 1) Create and activate a virtualenv (optional)
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2) Install deps
pip install -r requirements.txt

# 3) Configure environment (see .env.example) or export environment variables
cp .env.example .env
# edit .env with your DB URL and secrets

# 4) Run
uvicorn app.main:app --reload --port 5174
```

The API will serve static files from `./uploads` (created automatically).

## Config (.env)

- `DATABASE_URL` (e.g. `postgres://user:pass@host:5432/dbname` or `postgresql://...`)
- `ALLOWED_ORIGINS` (comma-separated; exact-match CORS allowlist)
- `OWNER_PASS` (owner login password for `/api/auth/owner`)
- `JWT_SECRET` (>= 32 chars)
- `TOKEN_MINUTES` (default 120)
- `WEB_ROOT` (optional; default = project `uploads/`)

## Parity notes

- Endpoints: `/api/health`, `/api/auth/owner`, `/api/auth/me`, `/api/posts` CRUD, `/api/projects` CRUD,
  `/api/profile` GET/PUT, `/api/experience` CRUD, `/api/education` CRUD (flexible `details` column),
  `/api/skills` CRUD, `/api/languages` GET, `/api/certificates` CRUD, `/api/gallery` CRUD (compat mapping),
  `/contact` POST, `/api/certificates/resolve` + `/api/certificates/proxy`, `/api/upload/profile-image`.
- JSON field names are camelCase to match your frontend.
- Slugify, excerpt, flexible date parsing, and data-URL image saving match the .NET behavior.
