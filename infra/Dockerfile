# ===== MULTI-STAGE DOCKER BUILD FOR ZAMAN ASSISTANT =====
# Optimized for Linux/WSL Debian

# ===== STAGE 1: Builder =====
FROM python:3.11-slim-bookworm AS builder

LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.1"

WORKDIR /build

# Установка системных зависимостей для компиляции
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Создание и активация virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Установка Python зависимостей
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt


# ===== STAGE 2: Runtime =====
FROM python:3.11-slim-bookworm AS runtime

LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.1"

# Переменные окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TZ=Asia/Almaty

# Установка runtime зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Создание пользователя для безопасности (не root)
RUN groupadd -r zaman && useradd -r -g zaman zaman

# Рабочая директория
WORKDIR /app

# Копирование venv из builder stage
COPY --from=builder /opt/venv /opt/venv

# ✅ Копирование backend структуры
# Копируем все Python файлы в корень /app
COPY backend/*.py /app/
COPY backend/services/ /app/services/
COPY backend/products.json /app/
COPY requirements.txt /app/

# Создание директорий для данных с правильными правами
RUN mkdir -p /app/data /app/logs && \
    chown -R zaman:zaman /app

# Переключение на непривилегированного пользователя
USER zaman

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose порт
EXPOSE 8000

# ✅ Запуск через uvicorn (production-ready)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]