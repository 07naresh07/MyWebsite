from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx
import urllib.parse as up

router = APIRouter()

# Strict allow-list to guard against SSRF
ALLOW = {
    "linkedin.com",
    "www.linkedin.com",
    "coursera.org",
    "www.coursera.org",
}

# Reasonable defaults and guards
UA = "Mozilla/5.0 (PortfolioBot/1.1)"
MAX_BYTES = 6 * 1024 * 1024  # 6 MB cap for proxy to avoid huge downloads
TIMEOUT = httpx.Timeout(15.0)  # connect/read/write total timeout


def _validate_url(raw_url: str) -> up.ParseResult:
    try:
        u = up.urlparse(raw_url.strip())
    except Exception:
        raise HTTPException(status_code=400, detail="invalid url")

    if u.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="unsupported scheme")
    if not u.netloc:
        raise HTTPException(status_code=400, detail="invalid host")
    host = (u.hostname or "").lower()
    if host not in ALLOW:
        raise HTTPException(status_code=400, detail="host not allowed")
    return u


@router.post("/api/certificates/resolve")
async def resolve_cert(url: str = Query(..., max_length=2048)):
    """
    Resolve a URL on an allow-list, following redirects,
    and return headers/metadata without downloading the full body.
    """
    _validate_url(url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT) as client:
        try:
            # Use stream=True so body is not preloaded
            r = await client.get(url, headers={"User-Agent": UA}, stream=True)
            ct = r.headers.get("content-type")
            ln = r.headers.get("content-length")
            # Close the stream since we don't need the body
            await r.aclose()
            return {
                "ok": r.is_success,
                "status": r.status_code,
                "finalUrl": str(r.url),
                "contentType": ct,
                "contentLength": int(ln) if ln and ln.isdigit() else None,
            }
        except httpx.TimeoutException as ex:
            return {"ok": False, "status": 504, "error": f"timeout: {ex}"}
        except httpx.HTTPError as ex:
            return {"ok": False, "status": 502, "error": str(ex)}


@router.get("/api/certificates/proxy")
async def proxy_cert(url: str = Query(..., max_length=2048)):
    """
    Stream the (small) remote resource through this server for CORS reasons.
    Only allow-listed hosts are permitted. Enforces a size cap.
    """
    _validate_url(url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT) as client:
        try:
            r = await client.get(url, headers={"User-Agent": UA}, stream=True)

            # Size guard (if server provides length)
            content_length = r.headers.get("content-length")
            if content_length and content_length.isdigit():
                if int(content_length) > MAX_BYTES:
                    await r.aclose()
                    raise HTTPException(status_code=413, detail="Upstream content too large")

            media_type = r.headers.get("content-type") or "application/octet-stream"

            async def _iter():
                total = 0
                async for chunk in r.aiter_bytes(chunk_size=65536):
                    total += len(chunk)
                    if total > MAX_BYTES:
                        # Stop streaming and close upstream; client receives partial body.
                        # Prefer guarding via content-length above where possible.
                        await r.aclose()
                        raise HTTPException(status_code=413, detail="Upstream content too large")
                    yield chunk
                await r.aclose()

            headers = {
                "Cache-Control": "public, max-age=3600",
                "X-Content-Type-Options": "nosniff",
            }

            return StreamingResponse(_iter(), media_type=media_type, headers=headers)

        except HTTPException:
            # Re-raise our size guard errors
            raise
        except httpx.TimeoutException as ex:
            raise HTTPException(status_code=504, detail=f"Upstream timeout: {ex}")
        except httpx.HTTPError as ex:
            raise HTTPException(status_code=502, detail=f"Upstream fetch failed: {ex}")
