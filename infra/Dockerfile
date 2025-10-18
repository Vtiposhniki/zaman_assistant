# ===== MULTI-STAGE DOCKER BUILD FOR ZAMAN ASSISTANT =====
# Windows-совместимая версия

# ===== STAGE 1: Builder =====
FROM python:3.11-slim as builder

LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.0"

WORKDIR /build


# Установка системных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Установка Python зависимостей в venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ===== STAGE 2: Runtime =====
FROM python:3.11-slim

LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.0"

# Переменные окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Установка curl для healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копирование venv из builder
COPY --from=builder /opt/venv /opt/venv

# Копирование кода
COPY backend/*.py ./
COPY backend/products.json ./
COPY backend/services/ ./services/
COPY requirements.txt .

# Создание директорий
RUN mkdir -p /app/data /app/logs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

# Expose
EXPOSE 8000

# Инициализация БД (опционально)
RUN cd backend && python database.py || true

# ✅ ИСПРАВЛЕНО: правильный путь к модулю
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]