# 🚀 Docker Quick Start Guide

> Быстрый старт Zaman Assistant в Docker за 5 минут

---

## ⚡ Минимальная установка (1 команда)

```bash
# Клонирование и запуск
git clone https://github.com/yourorg/zaman_assistant.git && \
cd zaman_assistant && \
cp backend/.env.example .env && \
docker-compose up -d && \
sleep 15 && \
curl http://localhost:8000/health | jq .
```

**Готово!** API работает на http://localhost:8000

---

## 📋 Структура файлов

После установки у вас будет:

```
zaman_assistant/
├── backend/              # Python код
├── infra/
│   ├── Dockerfile        # ✅ Создан
│   ├── docker-compose.yml # ✅ Создан
│   ├── nginx.conf        # ✅ Создан
│   └── init.sql          # ✅ Создан
├── .dockerignore         # ✅ Создан
├── .env                  # ⚠️ Создайте из .env.example
└── Makefile              # ✅ Создан (опционально)
```

---

## 🔧 Быстрая конфигурация

### 1. Минимальный .env для старта

```env
# .env
OPENAI_HUB_KEY=your_key_here
ADMIN_TOKEN=supersecret
MOCK_MODE=false
DEBUG=true
```

### 2. MOCK режим (без API ключа)

```env
# .env
MOCK_MODE=true
DEBUG=true
```

---

## 💻 Основные команды

### С Makefile

```bash
make up          # Запуск
make down        # Остановка
make logs        # Логи
make restart     # Перезапуск
make clean       # Полная очистка
make test        # Тестирование
```

### Без Makefile

```bash
docker-compose up -d      # Запуск
docker-compose down       # Остановка
docker-compose logs -f    # Логи
docker-compose restart    # Перезапуск
docker-compose ps         # Статус
```

---

## 🧪 Проверка работы

### 1. Health Check

```bash
curl http://localhost:8000/health | jq .
```

**Ожидаемый ответ:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "database": {
    "connected": true,
    "total_goals": 0
  },
  "embeddings": {
    "loaded": 7,
    "ready": true
  }
}
```

### 2. Создание тестовой цели

```bash
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тестовая цель",
    "target_amount": 1000000,
    "current_savings": 100000,
    "target_date": "2026-12-31",
    "income": 500000,
    "expenses": 300000
  }' | jq .
```

### 3. Тестовый чат

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Как начать копить?"}
    ]
  }' | jq .
```

---

## 📚 Документация API

После запуска доступна по адресам:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🐛 Troubleshooting

### Проблема: Порт 8000 занят

```bash
# Изменить порт в docker-compose.yml
ports:
  - "8001:8000"  # внешний:внутренний
```

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker-compose logs backend

# Пересоздать контейнер
docker-compose down
docker-compose up -d --force-recreate
```

### Проблема: База данных не подключается

```bash
# Проверить PostgreSQL
docker-compose ps postgres

# Пересоздать БД
docker-compose down -v
docker-compose up -d
```

### Проблема: "Permission denied"

```bash
# Дать права на выполнение скриптов
chmod +x scripts/*.sh

# Или запустить от sudo
sudo docker-compose up -d
```

---

## 🔄 Обновление

```bash
# Pull последних изменений
git pull origin main

# Пересборка образов
docker-compose build --no-cache

# Перезапуск
docker-compose down
docker-compose up -d
```

---

## 🗑️ Полная очистка

```bash
# Остановить и удалить всё
docker-compose down -v

# Удалить образы
docker rmi $(docker images -q zamanbank/assistant)

# Очистить Docker
docker system prune -a --volumes -f
```

---

## 📊 Мониторинг

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Последние 100 строк
docker-compose logs --tail=100 backend

# С фильтрацией
docker-compose logs backend | grep ERROR
```

### Использование ресурсов

```bash
# Real-time статистика
docker stats

# Одноразовый снимок
docker stats --no-stream
```

### Вход в контейнер

```bash
# Bash shell
docker-compose exec backend /bin/bash

# Python shell
docker-compose exec backend python

# Database shell
docker-compose exec postgres psql -U zaman zaman_db
```

---

## 🌐 Доступ из сети

### Локальная сеть

По умолчанию API доступен только на localhost. Для доступа из сети:

```yaml
# docker-compose.yml
services:
  backend:
    ports:
      - "0.0.0.0:8000:8000"  # Слушать на всех интерфейсах
```

⚠️ **Внимание**: В production используйте Nginx + SSL!

### С Nginx (рекомендуется)

```bash
# Запуск с Nginx профилем
docker-compose --profile production up -d
```

Доступ:
- HTTP: http://your-server-ip:80/api/
- HTTPS: https://your-domain.com/api/

---

## 📦 Бэкап и восстановление

### Быстрый бэкап

```bash
# Создать бэкап
./scripts/backup.sh

# Или вручную
docker-compose exec -T postgres pg_dump -U zaman zaman_db > backup.sql
```

### Восстановление

```bash
# Из бэкапа
./scripts/restore.sh 20250118_143000

# Или вручную
cat backup.sql | docker-compose exec -T postgres psql -U zaman zaman_db
```

---

## 🚀 Production Checklist

Перед деплоем в production:

- [ ] Смените `ADMIN_TOKEN` на случайный
- [ ] Используйте сильный пароль для PostgreSQL
- [ ] Включите HTTPS (Let's Encrypt)
- [ ] Отключите `DEBUG=false`
- [ ] Настройте firewall (UFW/iptables)
- [ ] Настройте автобэкапы (cron)
- [ ] Добавьте мониторинг (Prometheus/Grafana)
- [ ] Настройте логирование (ELK/Loki)
- [ ] Проверьте resource limits
- [ ] Настройте health check алерты

---

## 🔗 Полезные ссылки

- **Полная документация**: [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **API документация**: [API_CHEATSHEET.md](API_CHEATSHEET.md)
- **Миграция**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Основной README**: [README.md](README.md)

---

## 💡 Примеры использования

### Python

```python
import httpx
import asyncio

async def test_api():
    async with httpx.AsyncClient() as client:
        # Health check
        health = await client.get("http://localhost:8000/health")
        print(health.json())
        
        # Create goal
        goal = await client.post(
            "http://localhost:8000/goals/create",
            json={
                "name": "Отпуск",
                "target_amount": 500000,
                "current_savings": 50000,
                "target_date": "2026-06-01"
            }
        )
        print(goal.json())

asyncio.run(test_api())
```

### JavaScript

```javascript
// Health check
fetch('http://localhost:8000/health')
  .then(res => res.json())
  .then(data => console.log(data));

// Create goal
fetch('http://localhost:8000/goals/create', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    name: "Новая машина",
    target_amount: 5000000,
    current_savings: 500000,
    target_date: "2027-01-01"
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL

```bash
# List goals
curl http://localhost:8000/goals | jq .

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Какой депозит выбрать?"}]}' \
  | jq .

# Recommendations
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "goal_amount": 3000000,
    "months": 24,
    "goal_type": "образование"
  }' | jq .
```

---

## 🎯 Следующие шаги

1. **Изучите API**: http://localhost:8000/docs
2. **Создайте первую цель**: Используйте `/goals/create`
3. **Протестируйте чат**: Используйте `/chat` или WebSocket
4. **Настройте мониторинг**: Prometheus + Grafana
5. **Деплой в production**: См. [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

## 📞 Поддержка

**Проблемы?**

1. Проверьте [Troubleshooting](#troubleshooting)
2. Посмотрите логи: `docker-compose logs`
3. Создайте issue: [GitHub Issues](https://github.com/yourorg/zaman_assistant/issues)
4. Email: ai-team@zamanbank.kz

---

## 📄 Лицензия

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  <b>🎉 Готово к использованию!</b><br>
  <i>Built with ❤️ for Zaman Bank</i>
</p>