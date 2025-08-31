\
import os
from dataclasses import dataclass
from typing import List
from dotenv import load_dotenv
load_dotenv()

def _split_csv(s: str) -> List[str]:
    return [x.rstrip("/") for x in (s or "").split(",") if x.strip()]

@dataclass
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")
    allowed_origins: List[str] = None  # exact-match, no trailing slash
    owner_pass: str = os.getenv("OWNER_PASS", "owner-dev-pass")
    jwt_secret: str = os.getenv("JWT_SECRET", "uS0m5p4d3d-32char-minimum-secret-key-123456")
    token_minutes: int = int(os.getenv("TOKEN_MINUTES", "120"))
    web_root: str = os.getenv("WEB_ROOT", "")  # if blank, default inside project

    def __post_init__(self):
        self.allowed_origins = _split_csv(os.getenv("ALLOWED_ORIGINS", "http://localhost:5173"))
        if len(self.jwt_secret) < 32:
            self.jwt_secret = (self.jwt_secret + ("0" * 32))[:32]

settings = Settings()
