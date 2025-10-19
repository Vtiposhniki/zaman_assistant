# Redis Setup для Zaman Assistant Goals Service

## Обзор

Redis Goals Service предоставляет полнофункциональную систему управления целями через Redis с поддержкой:
- CRUD операции для целей
- Real-time обновления через WebSocket
- Pub/Sub для синхронизации
- Экспорт данных
- Статистика и аналитика

## Быстрый старт

### 1. Запуск через Docker Compose

```bash
# Запуск с Redis
docker-compose --profile full up -d

# Или только Redis
docker-compose up redis -d
```

### 2. Локальная установка Redis

#### Windows
```bash
# Через Chocolatey
choco install redis-64

# Или скачать с https://github.com/microsoftarchive/redis/releases
```

#### Linux/macOS
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Запуск
redis-server
```

### 3. Проверка подключения

```bash
# Тест подключения
redis-cli ping
# Должен вернуть: PONG

# Проверка конфигурации
redis-cli config get appendonly
redis-cli config get save
```

## Конфигурация

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Redis настройки
REDIS_URL=redis://localhost:6379
REDIS_MAX_CONNECTIONS=10
REDIS_RETRY_ON_TIMEOUT=true
REDIS_SOCKET_TIMEOUT=5
REDIS_SOCKET_CONNECT_TIMEOUT=5
```

### Docker Compose профили

```bash
# Только backend (без Redis)
docker-compose up backend -d

# Backend + Redis
docker-compose --profile full up -d

# Полная система (включая PostgreSQL)
docker-compose --profile production up -d
```

## API Endpoints

### Основные операции

```bash
# Создание цели
POST /redis-goals/
{
  "name": "Покупка автомобиля",
  "target_amount": 5000000,
  "target_date": "2024-12-31",
  "user_id": 1,
  "goal_type": "автомобиль"
}

# Получение целей
GET /redis-goals/?user_id=1&status=active&limit=10

# Обновление цели
PUT /redis-goals/{goal_id}
{
  "current_savings": 1000000,
  "status": "active"
}

# Удаление цели
DELETE /redis-goals/{goal_id}?hard=false
```

### WebSocket

```javascript
// Подключение к WebSocket
const ws = new WebSocket('ws://localhost:8000/redis-goals/ws');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

### Экспорт и статистика

```bash
# Экспорт всех целей
GET /redis-goals/export/json

# Статистика
GET /redis-goals/statistics

# Проверка здоровья
GET /redis-goals/health
```

## Структура данных в Redis

### Хранение целей

```
Key: "goals"
Type: Hash
Fields: goal_id -> JSON string

Example:
HSET goals "goal_abc123" '{"id":"goal_abc123","name":"Автомобиль","target_amount":5000000,...}'
```

### Pub/Sub каналы

```
Channel: "goals_updates"
Messages: JSON с типом события и данными

Example:
{
  "type": "goal_created",
  "data": {...},
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Статистика

```
Key: "goals_stats"
Type: Hash
Fields: action -> count

Example:
HSET goals_stats "created" 5
HSET goals_stats "updated" 12
HSET goals_stats "last_updated" "2024-01-01T12:00:00Z"
```

## Мониторинг и отладка

### Redis CLI команды

```bash
# Просмотр всех целей
redis-cli HGETALL goals

# Подсчет целей
redis-cli HLEN goals

# Просмотр статистики
redis-cli HGETALL goals_stats

# Мониторинг Pub/Sub
redis-cli MONITOR

# Подписка на обновления
redis-cli SUBSCRIBE goals_updates
```

### Логи

```bash
# Docker логи
docker-compose logs redis
docker-compose logs backend

# Локальные логи
tail -f /var/log/redis/redis-server.log
```

## Персистентность

### Настройки AOF (Append Only File)

```conf
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### RDB Snapshots

```conf
save 900 1    # 15 минут
save 300 10   # 5 минут
save 60 10000 # 1 минута
```

### Восстановление данных

```bash
# Проверка целостности AOF
redis-check-aof --fix /data/goals.aof

# Проверка RDB
redis-check-rdb /data/goals.rdb

# Восстановление из backup
cp backup/goals.rdb /data/
redis-server /usr/local/etc/redis/redis.conf
```

## Производительность

### Рекомендации

1. **Память**: 256MB достаточно для ~10,000 целей
2. **Соединения**: Максимум 10 одновременных подключений
3. **Таймауты**: 5 секунд для операций
4. **Политика вытеснения**: allkeys-lru

### Мониторинг

```bash
# Использование памяти
redis-cli INFO memory

# Статистика команд
redis-cli INFO stats

# Медленные запросы
redis-cli SLOWLOG GET 10
```

## Безопасность

### Production настройки

```conf
# Отключение опасных команд
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""

# Аутентификация (если нужно)
requirepass your_strong_password
```

### Сетевая безопасность

```conf
# Привязка к localhost только
bind 127.0.0.1

# Ограничение клиентов
maxclients 100
```

## Troubleshooting

### Частые проблемы

1. **Connection refused**
   ```bash
   # Проверить статус Redis
   redis-cli ping
   
   # Проверить порт
   netstat -tlnp | grep 6379
   ```

2. **Memory limit exceeded**
   ```bash
   # Очистить память
   redis-cli FLUSHALL
   
   # Проверить использование
   redis-cli INFO memory
   ```

3. **WebSocket не работает**
   ```bash
   # Проверить логи backend
   docker-compose logs backend
   
   # Проверить Pub/Sub
   redis-cli PUBLISH goals_updates '{"test": "message"}'
   ```

### Отладка

```bash
# Включить verbose логирование
redis-cli CONFIG SET loglevel debug

# Мониторинг команд в реальном времени
redis-cli MONITOR

# Проверка конфигурации
redis-cli CONFIG GET "*"
```

## Миграция данных

### Из SQLite в Redis

```python
# Скрипт миграции (пример)
import sqlite3
import redis
import json

# Подключение к SQLite
sqlite_conn = sqlite3.connect('zaman_assistant.db')
cursor = sqlite_conn.cursor()

# Подключение к Redis
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Миграция целей
cursor.execute("SELECT * FROM goals")
goals = cursor.fetchall()

for goal in goals:
    goal_data = {
        "id": f"goal_{goal[0]}",
        "name": goal[1],
        "target_amount": goal[2],
        # ... другие поля
    }
    redis_client.hset("goals", goal_data["id"], json.dumps(goal_data))

print(f"Migrated {len(goals)} goals to Redis")
```

## Заключение

Redis Goals Service предоставляет высокопроизводительную и надежную систему управления целями с поддержкой real-time обновлений. Настройка персистентности обеспечивает сохранность данных, а WebSocket интеграция позволяет создавать интерактивные пользовательские интерфейсы.
