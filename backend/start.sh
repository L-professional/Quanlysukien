#!/usr/bin/env bash
set -e

echo "=== Running database migrations ==="
alembic upgrade head

echo "=== Seeding initial database data ==="
python -m app.initial_data

echo "=== Starting FastAPI service ==="
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
