# app/db.py
import asyncpg
import ssl
from typing import Optional

# Prefer OS trust store; fall back to certifi; then default
def _make_sslctx():
    try:
        import truststore  # pip install truststore (optional but nice)
        return truststore.SSLContext()
    except Exception:
        try:
            import certifi
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            return ssl.create_default_context()

_sslctx = _make_sslctx()

# The live pool lives here once initialized
_pool: Optional[asyncpg.Pool] = None

async def init_pool(dsn: str) -> asyncpg.Pool:
    """
    Create the global asyncpg pool if it doesn't exist yet.
    Returns the pool so callers can await this in startup tasks.
    """
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn,
            statement_cache_size=0,  # safer with migrations
            max_size=20,
            ssl=_sslctx,
        )
    return _pool

# ---- Accessors (DO NOT RAISE if not ready) ----

def get_pool() -> Optional[asyncpg.Pool]:
    """
    Return the pool if initialized, else None.
    The BIM router knows to treat None as "503 Service Unavailable".
    """
    return _pool

# Back-compat: some modules import `pool` as a function.
# Keep it and make it return None until ready.
def pool() -> Optional[asyncpg.Pool]:
    return _pool

# Optional convenience alias for resolvers that look for a variable
pool_instance: Optional[asyncpg.Pool] = None  # set alongside _pool below (kept for completeness)

# If you want to keep pool_instance mirrored:
def _sync_set_pool_alias():
    global pool_instance
    pool_instance = _pool

# Call this after init (not required, but harmless)
# _sync_set_pool_alias()

async def close_pool():
    """Gracefully close and clear the global pool."""
    global _pool, pool_instance
    p = _pool
    _pool = None
    pool_instance = None
    if p is not None:
        await p.close()
