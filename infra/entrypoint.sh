#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
sleep 5

echo "Initializing database..."
python -c "from backend.database import init_db; init_db()"

echo "Starting application..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
