\
import re
import base64
import os
from datetime import datetime, timezone
from typing import Optional, Tuple

_slug_re = re.compile(r"[^a-z0-9-]")

def slugify(s: str) -> str:
    if not s or not s.strip():
        return os.urandom(8).hex()
    s = s.strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = _slug_re.sub("-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or os.urandom(8).hex()

def compute_excerpt(html: Optional[str]) -> str:
    if not html:
        return ""
    txt = re.sub("<.*?>", " ", html)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt if len(txt) <= 240 else txt[:240] + "…"

def try_parse_date_flexible(s: Optional[str]) -> Tuple[bool, Optional[datetime], Optional[str]]:
    if not s or not s.strip():
        return False, None, "Date is required."
    s = s.strip()
    # Try ISO first
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=timezone.utc)
        return True, dt.astimezone(timezone.utc), None
    except Exception:
        pass
    fmts = ["%Y-%m-%d", "%Y-%m", "%Y"]
    for f in fmts:
        try:
            dt = datetime.strptime(s, f).replace(tzinfo=timezone.utc)
            # Normalize year/month to 1st day at 00:00Z for coarse inputs
            if f == "%Y":
                dt = dt.replace(month=1, day=1)
            if f == "%Y-%m":
                dt = dt.replace(day=1)
            return True, dt, None
        except Exception:
            continue
    return False, None, "Unsupported date format. Use ISO, yyyy-MM-dd, yyyy-MM, or yyyy."

def to_year_month(dt: datetime) -> str:
    return dt.strftime("%Y-%m")

def to_year_month_or_none(dt: Optional[datetime]) -> Optional[str]:
    return dt.strftime("%Y-%m") if dt else None

def save_data_url_image(data_url: str, folder_abs: str) -> Optional[str]:
    m = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", data_url or "")
    if not m:
        return None
    mime = m.group(1).lower()
    b64 = m.group(2)
    try:
        raw = base64.b64decode(b64)
    except Exception:
        return None
    ext = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(mime, ".bin")
    os.makedirs(folder_abs, exist_ok=True)
    name = f"{os.urandom(16).hex()}{ext}"
    path = os.path.join(folder_abs, name)
    with open(path, "wb") as f:
        f.write(raw)
    return f"/uploads/{name}"
