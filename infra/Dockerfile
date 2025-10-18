# ===== MULTI-STAGE DOCKER BUILD FOR ZAMAN ASSISTANT =====

# ===== STAGE 1: Builder =====
FROM python:3.11-slim as builder

# Метаданные
LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL description="Zaman Assistant - AI-powered Financial Assistant"
LABEL version="3.0.0"

# Рабочая директория
WORKDIR /build

# Установка системных зависимостей для компиляции
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements.txt
COPY requirements.txt .

# Установка Python зависимостей в виртуальное окружение
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Установка зависимостей
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ===== STAGE 2: Runtime =====
FROM python:3.11-slim

# Метаданные
LABEL maintainer="Zaman Bank AI Team <ai-team@zamanbank.kz>"
LABEL version="3.0.0"

# Переменные окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Создание пользователя для безопасности
RUN groupadd -r zaman && \
    useradd -r -g zaman -s /bin/bash -d /app zaman

# Рабочая директория
WORKDIR /app

# Копирование виртуального окружения из builder
COPY --from=builder /opt/venv /opt/venv

# Копирование кода приложения
COPY backend/ ./backend/
COPY requirements.txt .

# Создание необходимых директорий
RUN mkdir -p /app/data /app/logs && \
    chown -R zaman:zaman /app

# Переключение на непривилегированного пользователя
USER zaman

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=5)" || exit 1

# Expose порт
EXPOSE 8000

# Инициализация БД при первом запуске
RUN cd backend && python database.py || true

# Запуск приложения
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]