import os
import secrets
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from ..auth import require_owner
from ..config import settings

router = APIRouter()

# Limits & allow list
MAX_BYTES = 10 * 1024 * 1024  # 10MB hard cap for profile images
# We intentionally disallow SVG for profile images (XSS vector in some renderers)
ALLOWED_DETECTED = {"jpeg": ".jpg", "png": ".png", "gif": ".gif", "webp": ".webp"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

CHUNK_SIZE = 1024 * 1024  # 1MB


def _resolve_upload_root() -> str:
    # Prefer configured root; else use local /uploads next to backend
    webroot = settings.web_root or os.path.join(
        os.path.dirname(__file__), "..", "..", "uploads"
    )
    webroot = os.path.abspath(webroot)
    os.makedirs(webroot, exist_ok=True)
    return webroot


def _sniff_image_ext(first_bytes: bytes) -> Optional[str]:
    """
    Try to determine image type from header.
    Returns a safe extension (including dot) or None.
    """
    try:
        import imghdr

        kind = imghdr.what(None, h=first_bytes)
        if kind in ALLOWED_DETECTED:
            return ALLOWED_DETECTED[kind]
    except Exception:
        # imghdr failure — fall through
        pass
    return None


def _content_type_ok(ct: Optional[str]) -> bool:
    return (ct or "").lower() in ALLOWED_CONTENT_TYPES


@router.post("/api/upload/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...), user=Depends(require_owner)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file provided.")

    # Read a small header to validate type and also start counting size
    head = await file.read(512)
    if not head:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Validate content type (from client) AND try to sniff
    client_ct = (file.content_type or "").lower()
    if not _content_type_ok(client_ct):
        # Some browsers may send generic types; allow if we can sniff safely
        sniff_ext = _sniff_image_ext(head)
        if not sniff_ext:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image type. Allowed: JPEG, PNG, GIF, WEBP.",
            )
        # Map sniffed type back to a content type for response
        ct_by_ext = {
            ".jpg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        server_ct = ct_by_ext.get(sniff_ext, "application/octet-stream")
    else:
        # Content type looks fine; still prefer sniffed ext if we can
        sniff_ext = _sniff_image_ext(head)
        if not sniff_ext:
            # If sniffing failed, fall back to CT-derived extension
            sniff_ext = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp",
            }.get(client_ct, ".bin")
        server_ct = client_ct

    # Generate safe name with our own extension (ignore user-supplied name/ext)
    fname = f"{secrets.token_hex(16)}{sniff_ext}"

    # Write stream to disk with limit enforcement
    webroot = _resolve_upload_root()
    full_path = os.path.join(webroot, fname)

    bytes_written = 0
    try:
        with open(full_path, "wb") as out:
            # write head we already read
            out.write(head)
            bytes_written += len(head)
            if bytes_written > MAX_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large (> {MAX_BYTES // (1024*1024)}MB).",
                )

            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                out.write(chunk)
                bytes_written += len(chunk)
                if bytes_written > MAX_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (> {MAX_BYTES // (1024*1024)}MB).",
                    )
    except HTTPException:
        # Remove partial file on limit/type errors
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
        finally:
            raise
    except Exception as ex:
        # Clean up and return 500-ish
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
        finally:
            raise HTTPException(status_code=500, detail=f"Upload failed: {ex}")

    # Build public URL; your static server should map /uploads -> webroot
    public_url = f"/uploads/{fname}"

    return {
        "url": public_url,
        "filename": fname,
        "size": bytes_written,
        "contentType": server_ct,
    }
