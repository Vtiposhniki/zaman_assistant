# 🐳 Docker Setup для Zaman Assistant

Полное руководство по запуску Zaman Assistant в Docker.

---

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Архитектура](#архитектура)
3. [Конфигурация](#конфигурация)
4. [Команды](#команды)
5. [Production deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Быстрый старт

### Проблема: Медленная работа API

```bash
# Проверить latency
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health

# curl-format.txt:
# time_total: %{time_total}s
# time_connect: %{time_connect}s

# Включить больше workers
# В Dockerfile изменить CMD:
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Пересобрать
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Проблема: WebSocket не работает

```bash
# Проверить что Nginx правильно проксирует
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8000/ws/chat/1

# Проверить логи
docker-compose logs backend | grep WebSocket

# Тестовый WebSocket клиент
docker-compose exec backend python -c "
import asyncio
import websockets
import json

async def test():
    uri = 'ws://localhost:8000/ws/chat/1'
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({'content': 'test'}))
        response = await ws.recv()
        print(response)

asyncio.run(test())
"
```

---

## 📊 Мониторинг и метрики

### Prometheus + Grafana (опционально)

**docker-compose.monitoring.yml:**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: zaman-prometheus
    volumes:
      - ./infra/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - zaman-network

  grafana:
    image: grafana/grafana:latest
    container_name: zaman-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - zaman-network

volumes:
  prometheus-data:
  grafana-data:

networks:
  zaman-network:
    external: true
```

Запуск:
```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Основные метрики для отслеживания

1. **Health Status**: `curl http://localhost:8000/health`
2. **Response Time**: `docker-compose logs backend | grep latency_ms`
3. **Error Rate**: `docker-compose logs backend | grep ERROR | wc -l`
4. **Database Connections**: `docker-compose exec postgres psql -U zaman -c "SELECT count(*) FROM pg_stat_activity;"`
5. **Cache Hit Rate**: `curl http://localhost:8000/cache/stats`

---

## 🔐 Безопасность

### Чеклист безопасности

- [ ] **Смените default пароли**
  ```bash
  # В .env
  ADMIN_TOKEN=$(openssl rand -hex 32)
  
  # В docker-compose.yml для PostgreSQL
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  ```

- [ ] **Используйте HTTPS в production**
  ```bash
  # Получите Let's Encrypt сертификат
  sudo certbot certonly --standalone -d your-domain.com
  ```

- [ ] **Ограничьте доступ к admin endpoints**
  ```nginx
  # В nginx.conf
  location /admin/ {
      allow 10.0.0.0/8;  # Только внутренняя сеть
      deny all;
      proxy_pass http://backend/admin/;
  }
  ```

- [ ] **Настройте firewall**
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw deny 5432/tcp  # PostgreSQL только внутри
  sudo ufw enable
  ```

- [ ] **Регулярные обновления**
  ```bash
  # Обновление base images
  docker-compose pull
  docker-compose build --no-cache
  docker-compose up -d
  ```

- [ ] **Secrets management**
  ```bash
  # Docker secrets (Swarm mode)
  echo "your_secret" | docker secret create openai_key -
  
  # Или используйте HashiCorp Vault, AWS Secrets Manager
  ```

- [ ] **Network isolation**
  ```yaml
  # Убедитесь что backend не expose порты напрямую
  # Только через Nginx
  services:
    backend:
      expose:
        - "8000"  # Не ports:!
  ```

---

## 🧪 Тестирование

### Unit тесты в контейнере

```bash
# Запуск тестов
docker-compose exec backend pytest backend/tests/ -v

# С coverage
docker-compose exec backend pytest --cov=backend backend/tests/

# Конкретный тест
docker-compose exec backend pytest backend/tests/test_goals.py::test_create_goal
```

### Integration тесты

```bash
# Создание тестового окружения
docker-compose -f docker-compose.test.yml up -d

# Запуск integration тестов
docker-compose -f docker-compose.test.yml exec backend pytest backend/tests/integration/

# Очистка
docker-compose -f docker-compose.test.yml down -v
```

### Load тесты

```bash
# Используя Apache Bench
ab -n 1000 -c 10 http://localhost:8000/health

# Используя wrk
wrk -t4 -c100 -d30s http://localhost:8000/health

# Используя Locust
docker run -p 8089:8089 -v $PWD/locustfile.py:/mnt/locust/locustfile.py \
  locustio/locust -f /mnt/locust/locustfile.py --host=http://backend:8000
```

---

## 📦 CI/CD Integration

### GitHub Actions

**Файл: `.github/workflows/docker.yml`**
```yaml
name: Docker Build & Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./infra/Dockerfile
        push: true
        tags: zamanbank/assistant:latest
        cache-from: type=registry,ref=zamanbank/assistant:buildcache
        cache-to: type=registry,ref=zamanbank/assistant:buildcache,mode=max
    
    - name: Deploy to production
      if: github.ref == 'refs/heads/main'
      run: |
        # SSH deploy script
        ssh deploy@server.com 'cd /opt/zaman && docker-compose pull && docker-compose up -d'
```

### GitLab CI

**Файл: `.gitlab-ci.yml`**
```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -f infra/Dockerfile -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  script:
    - docker-compose -f docker-compose.test.yml up -d
    - docker-compose -f docker-compose.test.yml exec -T backend pytest
    - docker-compose -f docker-compose.test.yml down

deploy:
  stage: deploy
  only:
    - main
  script:
    - ssh deploy@server.com "cd /opt/zaman && docker-compose pull && docker-compose up -d"
```

---

## 🌐 Multi-stage deployment

### Development → Staging → Production

```bash
# Development (локально)
docker-compose up -d

# Staging (тестовый сервер)
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production (боевой сервер)
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

**docker-compose.staging.yml:**
```yaml
version: '3.8'

services:
  backend:
    image: zamanbank/assistant:staging
    environment:
      - DEBUG=true
      - DATABASE_URL=postgresql://zaman:pass@staging-db:5432/zaman_staging
```

**docker-compose.production.yml:**
```yaml
version: '3.8'

services:
  backend:
    image: zamanbank/assistant:latest
    environment:
      - DEBUG=false
      - DATABASE_URL=postgresql://zaman:pass@prod-db:5432/zaman_prod
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## 📖 Best Practices

### 1. Версионирование образов

```bash
# Тегируйте каждый релиз
docker build -t zamanbank/assistant:3.0.0 .
docker build -t zamanbank/assistant:latest .

# В docker-compose.yml
services:
  backend:
    image: zamanbank/assistant:3.0.0  # Конкретная версия
```

### 2. Минимизация размера образа

```dockerfile
# Multi-stage build (уже реализовано)
FROM python:3.11-slim as builder
# ... compile dependencies

FROM python:3.11-slim
# ... только runtime
```

### 3. Health checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### 4. Логирование

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5. Resource limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 🔄 Обновление приложения

### Zero-downtime deployment

```bash
# 1. Pull новый образ
docker-compose pull backend

# 2. Создать новый контейнер
docker-compose up -d --no-deps --scale backend=2 --no-recreate backend

# 3. Подождать health check
sleep 30

# 4. Удалить старый контейнер
docker-compose up -d --no-deps --scale backend=1 --remove-orphans backend
```

### Rollback

```bash
# Откатиться на предыдущую версию
docker-compose down
docker tag zamanbank/assistant:3.0.0-backup zamanbank/assistant:latest
docker-compose up -d

# Или используйте конкретный тег
# В docker-compose.yml: image: zamanbank/assistant:2.1.0
```

---

## 📞 Поддержка

### Полезные команды для диагностики

```bash
# Полный дамп состояния системы
cat > diagnostic.sh << 'EOF'
#!/bin/bash
echo "=== Docker version ==="
docker version

echo "=== Docker Compose version ==="
docker-compose version

echo "=== Running containers ==="
docker-compose ps

echo "=== Container logs (last 50 lines) ==="
docker-compose logs --tail=50

echo "=== Health checks ==="
docker inspect --format='{{.State.Health.Status}}' zaman-backend

echo "=== Resource usage ==="
docker stats --no-stream

echo "=== Network ==="
docker network inspect zaman_zaman-network

echo "=== Volumes ==="
docker volume ls
EOF

chmod +x diagnostic.sh
./diagnostic.sh > diagnostic-report.txt
```

### Контакты

- **Issues**: [GitHub Issues](https://github.com/yourorg/zaman_assistant/issues)
- **Email**: ai-team@zamanbank.kz
- **Telegram**: @zaman_dev_support

---

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/docker/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)

---

**Готово! 🎉**

Теперь у вас есть полноценный Docker setup для Zaman Assistant. Требования

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM минимум
- Порты 8000, 5432 свободны

### Шаг 1: Клонирование

```bash
git clone https://github.com/yourorg/zaman_assistant.git
cd zaman_assistant
```

### Шаг 2: Конфигурация

```bash
# Копируйте пример конфигурации
cp .env.docker .env

# Отредактируйте .env
nano .env
```

**Минимальная конфигурация:**
```env
OPENAI_HUB_KEY=your_actual_key
ADMIN_TOKEN=your_strong_random_token
MOCK_MODE=false
```

### Шаг 3: Сборка и запуск

```bash
# Сборка образов
docker-compose build

# Запуск сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### Шаг 4: Проверка

```bash
# Health check
curl http://localhost:8000/health | jq .

# Создание тестовой цели
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Docker Test Goal",
    "target_amount": 100000,
    "current_savings": 0,
    "target_date": "2026-01-01"
  }' | jq .
```

**Готово! 🎉** API доступен на `http://localhost:8000`

---

## 🏗️ Архитектура

### Компоненты

```
┌─────────────────────────────────────────┐
│          Docker Compose Stack           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │   Backend    │  │   PostgreSQL   │  │
│  │  (FastAPI)   │◄─┤   Database     │  │
│  │  Port: 8000  │  │   Port: 5432   │  │
│  └──────┬───────┘  └────────────────┘  │
│         │                               │
│         │          ┌────────────────┐  │
│         └─────────►│     Redis      │  │
│                    │   (optional)   │  │
│                    └────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │           Nginx (prod)           │  │
│  │       Reverse Proxy + SSL        │  │
│  │         Port: 80, 443            │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Volumes

- **postgres-data**: База данных (persistent)
- **zaman-data**: Embeddings и файлы
- **zaman-logs**: Логи приложения
- **redis-data**: Redis cache (optional)

### Networks

- **zaman-network**: Внутренняя сеть для связи контейнеров

---

## ⚙️ Конфигурация

### Environment Variables

| Переменная | Обязательна | Описание | Default |
|------------|-------------|----------|---------|
| `OPENAI_HUB_KEY` | ✅ Да (если не MOCK) | API ключ | - |
| `OPENAI_HUB_URL` | ❌ Нет | URL OpenAI Hub | https://openai-hub.neuraldeep.tech |
| `ADMIN_TOKEN` | ✅ Да | Токен для админ endpoints | - |
| `DATABASE_URL` | ❌ Нет | PostgreSQL URL | auto (postgres:5432) |
| `MOCK_MODE` | ❌ Нет | Режим моков | false |
| `DEBUG` | ❌ Нет | Debug режим | false |
| `CACHE_TTL_SECONDS` | ❌ Нет | TTL кэша | 3600 |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ Нет | Лимит запросов | 200 |

### Профили Docker Compose

#### 1. **Базовый** (по умолчанию)
```bash
docker-compose up -d
```
Запускает: Backend + PostgreSQL

#### 2. **Full** (с Redis)
```bash
docker-compose --profile full up -d
```
Запускает: Backend + PostgreSQL + Redis

#### 3. **Production** (с Nginx)
```bash
docker-compose --profile production up -d
```
Запускает: Backend + PostgreSQL + Nginx

---

## 📜 Команды

### Использование Makefile

```bash
# Просмотр всех команд
make help

# Сборка образов
make build

# Запуск сервисов
make up

# Остановка
make down

# Логи backend
make logs

# Все логи
make logs-all

# Перезапуск
make restart

# Полная очистка (удалит volumes!)
make clean

# Инициализация БД
make db-init

# Shell в контейнере
make shell

# Тестирование
make test
```

### Без Makefile

```bash
# Сборка
docker-compose build

# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Логи
docker-compose logs -f backend

# Shell
docker-compose exec backend /bin/bash

# Перезапуск одного сервиса
docker-compose restart backend

# Просмотр ресурсов
docker stats
```

### Управление базой данных

```bash
# Подключение к PostgreSQL
docker-compose exec postgres psql -U zaman -d zaman_db

# Backup БД
docker-compose exec postgres pg_dump -U zaman zaman_db > backup.sql

# Restore БД
cat backup.sql | docker-compose exec -T postgres psql -U zaman zaman_db

# Инициализация таблиц
docker-compose exec backend python backend/database.py
```

### Мониторинг

```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Health checks
docker inspect --format='{{.State.Health.Status}}' zaman-backend

# Логи с фильтрацией
docker-compose logs backend | grep ERROR
```

---

## 🚢 Production Deployment

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
```

### 2. SSL Сертификаты

```bash
# Создание директории для SSL
mkdir -p infra/ssl

# Генерация self-signed (для теста)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/ssl/key.pem \
  -out infra/ssl/cert.pem

# Production: Let's Encrypt (рекомендуется)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/*.pem infra/ssl/
```

### 3. Production конфигурация

**Файл: `.env.production`**
```env
# ВАЖНО: Используйте сильные пароли!
OPENAI_HUB_KEY=your_production_key
ADMIN_TOKEN=$(openssl rand -hex 32)

# Production database
DATABASE_URL=postgresql://zaman_prod:strong_password@postgres:5432/zaman_prod

# Отключить mock и debug
MOCK_MODE=false
DEBUG=false

# Настроить лимиты
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_WINDOW_SECONDS=3600
CACHE_TTL_SECONDS=7200
```

### 4. Запуск production

```bash
# Используем production .env
cp .env.production .env

# Сборка с production профилем
docker-compose --profile production build

# Запуск
docker-compose --profile production up -d

# Проверка
curl https://your-domain.com/health
```

### 5. Автозапуск при перезагрузке

**Systemd service** (`/etc/systemd/system/zaman-assistant.service`):

```ini
[Unit]
Description=Zaman Assistant
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/zaman_assistant
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=zaman

[Install]
WantedBy=multi-user.target
```

```bash
# Активация
sudo systemctl enable zaman-assistant
sudo systemctl start zaman-assistant
sudo systemctl status zaman-assistant
```

### 6. Мониторинг и логирование

```bash
# Логи в файл
docker-compose logs -f > /var/log/zaman-assistant.log 2>&1 &

# Logrotate
cat > /etc/logrotate.d/zaman-assistant << EOF
/var/log/zaman-assistant.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF

# Prometheus metrics (TODO)
# Grafana dashboard (TODO)
```

### 7. Backup стратегия

```bash
# Скрипт автобэкапа (backup.sh)
#!/bin/bash
BACKUP_DIR="/backups/zaman"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump -U zaman zaman_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Embeddings backup
docker cp zaman-backend:/app/data/product_embeddings.pkl $BACKUP_DIR/embeddings_$DATE.pkl

# Rotate old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Cron job
# 0 2 * * * /opt/zaman_assistant/backup.sh
```

---

## 🔧 Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker-compose logs backend

# Проверить healthcheck
docker inspect zaman-backend | jq '.[0].State.Health'

# Пересоздать контейнер
docker-compose up -d --force-recreate backend
```

### Проблема: База данных не подключается

```bash
# Проверить что PostgreSQL запущен
docker-compose ps postgres

# Проверить connectivity
docker-compose exec backend nc -zv postgres 5432

# Пересоздать БД
docker-compose down -v
docker-compose up -d
```

### Проблема: Embeddings не загружаются

```bash
# Проверить volume
docker volume inspect zaman_zaman-data

# Пересоздать embeddings
docker-compose exec backend python -c "
from backend.embeddings import build_index_from_products
from backend.config import PRODUCTS
import asyncio
asyncio.run(build_index_from_products(PRODUCTS))
"
```

### Проблема: Высокое использование памяти

```bash
# Проверить использование
docker stats

# Ограничить память (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 1G

# Перезапуск
docker-compose restart backend
```

### Проблема: Порты заняты

```bash
# Найти процесс
sudo lsof -i :8000

# Изменить порт (docker-compose.yml)
ports:
  - "8001:8000"  # внешний:внутренний
```

###