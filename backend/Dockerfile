# Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (wheel builds, certs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy only the backend source (avoid shipping frontend/node_modules if present)
# If your repo layout is different, adjust these COPY lines
COPY app/ /app/app/

# 🔒 Build-time assertion: fail the build if bim.py is missing
RUN test -f /app/app/routes/bim.py || (echo 'FATAL: /app/app/routes/bim.py missing in image' && ls -R /app/app && exit 1)
# Optional: list routes directory for debugging
RUN ls -la /app/app/routes

# Start
CMD ["bash","-lc","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]
