# app/db.py
import asyncpg
import ssl
from typing import Optional

# Prefer OS trust store; fall back to certifi; then default
def _make_sslctx():
    try:
        import truststore  # pip install truststore
        return truststore.SSLContext()
    except Exception:
        try:
            import certifi
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            return ssl.create_default_context()

_pool: Optional[asyncpg.Pool] = None
_sslctx = _make_sslctx()

async def init_pool(dsn: str):
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn,
            statement_cache_size=0,
            max_size=20,
            ssl=_sslctx,
        )

def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    return _pool
