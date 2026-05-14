FROM python:3.11-slim

# /srv is the working directory — the backend code lives in /srv/app/
# Running from /srv lets Python treat "app" as a package, which makes
# the relative imports (from .config, from .database, etc.) work correctly.
WORKDIR /srv

COPY requirements.txt /srv/app/requirements.txt
RUN pip install --no-cache-dir -r /srv/app/requirements.txt

COPY . /srv/app/

# Persistent data directory (mounted as a Docker volume in production)
RUN mkdir -p /srv/data

EXPOSE 8000

# "app.main:app" — uvicorn imports main as part of the "app" package,
# which satisfies all the relative imports in the codebase.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
