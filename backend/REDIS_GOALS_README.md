# Redis Goals Service - Документация

## Обзор

Redis Goals Service - это полнофункциональная система управления финансовыми целями, построенная на Redis. Предоставляет CRUD операции, real-time обновления через WebSocket, экспорт данных и статистику.

## Основные возможности

### ✅ CRUD операции
- `create_goal()` - создание новой цели
- `get_goals()` - получение списка целей с фильтрацией
- `get_goal()` - получение конкретной цели
- `update_goal()` - обновление цели
- `delete_goal()` - мягкое удаление (отмена)
- `hard_delete_goal()` - жесткое удаление

### ✅ Дополнительные функции
- `bulk_update_goals()` - массовое обновление
- `export_goals_json()` - экспорт в JSON
- `get_goals_statistics()` - статистика целей
- `health_check()` - проверка здоровья сервиса

### ✅ Real-time обновления
- Pub/Sub канал `goals_updates`
- WebSocket endpoint `/redis-goals/ws`
- Автоматическая синхронизация изменений

## Быстрый старт

### 1. Запуск Redis

```bash
# Docker
docker-compose --profile full up -d

# Локально
redis-server
```

### 2. Тестирование

```bash
# Запуск тестов
cd backend
python test_redis_goals.py
```

### 3. API использование

```bash
# Создание цели
curl -X POST "http://localhost:8000/redis-goals/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Покупка автомобиля",
    "target_amount": 5000000,
    "target_date": "2024-12-31",
    "user_id": 1,
    "goal_type": "автомобиль"
  }'

# Получение целей
curl "http://localhost:8000/redis-goals/?user_id=1&status=active"

# WebSocket подключение
ws://localhost:8000/redis-goals/ws
```

## Структура данных

### Цель (Goal)
```json
{
  "id": "goal_abc123",
  "name": "Покупка автомобиля",
  "target_amount": 5000000,
  "current_savings": 1000000,
  "target_date": "2024-12-31",
  "status": "active",
  "user_id": 1,
  "goal_type": "автомобиль",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### Вычисляемые поля
- `progress_percent` - прогресс в процентах
- `months_remaining` - оставшиеся месяцы
- `monthly_needed` - необходимая ежемесячная сумма

## API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/redis-goals/` | Создание цели |
| GET | `/redis-goals/` | Список целей |
| GET | `/redis-goals/{id}` | Конкретная цель |
| PUT | `/redis-goals/{id}` | Обновление цели |
| DELETE | `/redis-goals/{id}` | Удаление цели |
| POST | `/redis-goals/bulk-update` | Массовое обновление |
| GET | `/redis-goals/export/json` | Экспорт JSON |
| GET | `/redis-goals/statistics` | Статистика |
| GET | `/redis-goals/health` | Проверка здоровья |
| WS | `/redis-goals/ws` | WebSocket |

## WebSocket события

### Подключение
```javascript
const ws = new WebSocket('ws://localhost:8000/redis-goals/ws');
```

### Получение обновлений
```javascript
ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
  
  // data.type: "goals_update"
  // data.data: { type: "goal_created", data: {...}, timestamp: "..." }
};
```

## Конфигурация

### Переменные окружения
```env
REDIS_URL=redis://localhost:6379
REDIS_MAX_CONNECTIONS=10
REDIS_RETRY_ON_TIMEOUT=true
REDIS_SOCKET_TIMEOUT=5
REDIS_SOCKET_CONNECT_TIMEOUT=5
```

### Redis настройки
```conf
# Персистентность
appendonly yes
save 900 1
save 300 10

# Память
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Мониторинг

### Проверка здоровья
```bash
curl http://localhost:8000/redis-goals/health
```

### Redis CLI
```bash
# Количество целей
redis-cli HLEN goals

# Просмотр целей
redis-cli HGETALL goals

# Статистика
redis-cli HGETALL goals_stats
```

## Примеры использования

### Python
```python
from services.redis_goals_service import create_redis_goals_service

async def example():
    service = await create_redis_goals_service()
    
    # Создание цели
    goal = await service.create_goal({
        "name": "Отпуск",
        "target_amount": 500000,
        "target_date": "2024-06-01",
        "user_id": 1
    })
    
    # Получение целей пользователя
    goals = await service.get_goals(user_id=1)
    
    # Обновление накоплений
    await service.update_goal(goal['id'], current_savings=100000)
    
    await service.close()
```

### JavaScript (Frontend)
```javascript
// Создание цели
const response = await fetch('/redis-goals/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Покупка квартиры',
    target_amount: 15000000,
    target_date: '2025-12-31',
    user_id: 1
  })
});

// WebSocket для real-time обновлений
const ws = new WebSocket('ws://localhost:8000/redis-goals/ws');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateGoalsList(update.data);
};
```

## Производительность

### Рекомендации
- **Память**: 256MB для ~10,000 целей
- **Соединения**: Максимум 10 одновременных
- **Таймауты**: 5 секунд для операций
- **Персистентность**: AOF + RDB snapshots

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

# Аутентификация
requirepass your_strong_password

# Привязка к localhost
bind 127.0.0.1
```

## Troubleshooting

### Частые проблемы

1. **Connection refused**
   ```bash
   redis-cli ping  # Проверить Redis
   ```

2. **Memory limit exceeded**
   ```bash
   redis-cli INFO memory  # Проверить память
   ```

3. **WebSocket не работает**
   ```bash
   docker-compose logs backend  # Проверить логи
   ```

## Миграция данных

### Из SQLite в Redis
```python
# Пример скрипта миграции
import sqlite3
import redis
import json

# Подключения
sqlite_conn = sqlite3.connect('zaman_assistant.db')
redis_client = redis.Redis(decode_responses=True)

# Миграция
cursor = sqlite_conn.cursor()
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
```

## Заключение

Redis Goals Service предоставляет высокопроизводительную систему управления целями с поддержкой real-time обновлений. Настройка персистентности обеспечивает надежность, а WebSocket интеграция позволяет создавать интерактивные интерфейсы.

### Ключевые преимущества:
- ⚡ Высокая производительность Redis
- 🔄 Real-time обновления через WebSocket
- 💾 Надежная персистентность данных
- 📊 Встроенная статистика и аналитика
- 🔧 Простая интеграция с существующим кодом
- 📈 Масштабируемость и отказоустойчивость
