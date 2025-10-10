# app/routes/__init__.py
from . import (
    posts, projects, profile, experience, education, skills, languages,
    certificates_gallery, contact, proxy, health, upload, home,
)

# Try importing bim, but don't fail if it's not there
try:
    from . import bim
except ImportError:
    pass

__all__ = [
    "posts", "projects", "profile", "experience", "education", "skills", 
    "languages", "certificates_gallery", "contact", "proxy", "health", 
    "upload", "home"
]