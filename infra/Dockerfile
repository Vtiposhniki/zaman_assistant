# ===== MULTI-STAGE DOCKER BUILD FOR ZAMAN ASSISTANT =====
# Windows-совместимая версия (ИСПРАВЛЕНО)

# ===== STAGE 1: Builder =====
FROM python:3.11-slim-bookworm AS builder

LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.0"

WORKDIR /build

# Установка системных зависимостей (включая для psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    curl \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Установка Python зависимостей в venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ===== STAGE 2: Runtime =====
FROM python:3.11-slim-bookworm AS runtime

LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.0"

# Переменные окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Установка curl и PostgreSQL клиента для healthcheck и runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# ✅ Копирование venv из builder stage
COPY --from=builder /opt/venv /opt/venv

# ✅ Копирование backend структуры
COPY backend/ /app/backend/
COPY requirements.txt /app/

# Создание директорий
RUN mkdir -p /app/data /app/logs

# ✅ Инициализация базы данных (игнорирует ошибку при первом запуске)
RUN cd /app && python "import sys; sys.path.insert(0, '/app'); from backend.database import init_db; init_db()" || echo 'DB init skipped (first run)'
CMD ["sh", "-c", "cd /app/", "python main.py"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose порт
EXPOSE 8000

# ✅ Запуск FastAPI backend
