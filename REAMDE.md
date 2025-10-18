# 🏦 Zaman Assistant

AI-powered финансовый ассистент для Zaman Bank с функциями планирования целей, анализа расходов и рекомендации продуктов.

## 🎯 Основные возможности

### ✨ Для пользователей
- **Финансовые цели**: Создание и отслеживание целей накопления с AI-советами
- **Анализ расходов**: Автоматическая категоризация транзакций из CSV
- **Умные рекомендации**: Подбор банковских продуктов на основе ваших целей
- **Чат-ассистент**: Real-time общение с AI через WebSocket или REST API
- **FAQ**: Мгновенные ответы на типовые вопросы

### 🛠️ Для разработчиков
- **Clean Architecture**: Service layer, dependency injection
- **Type Safety**: Pydantic schemas для всех API
- **Caching**: Интеллектуальное кэширование с namespace isolation
- **Rate Limiting**: Per-IP ограничения с sliding window
- **Embeddings**: Семантический поиск продуктов
- **Observability**: Метрики, логи, health checks

---

## 🚀 Быстрый старт

### Требования
- Python 3.11+
- SQLite (или PostgreSQL для production)

### Установка

```bash
# 1. Клонирование
git clone https://github.com/yourorg/zaman_assistant.git
cd zaman_assistant

# 2. Виртуальное окружение
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows

# 3. Зависимости
pip install -r requirements.txt

# 4. Конфигурация
cp backend/.env.example backend/.env
# Отредактируйте .env - добавьте свои API ключи

# 5. Инициализация БД
cd backend
python database.py

# 6. Запуск
python main.py
```

Сервер запустится на `http://localhost:8000`

---

## 📁 Структура проекта

```
zaman_assistant/
├── backend/
│   ├── main.py                 # 🎯 Главный файл FastAPI (рефакторенный!)
│   ├── config.py               # ⚙️ Централизованная конфигурация
│   ├── database.py             # 💾 Модели БД (исправленные)
│   ├── embeddings.py           # 🔍 Векторный поиск
│   ├── analytics.py            # 📊 Анализ транзакций
│   ├── prompts.py              # 💬 LLM промпты
│   ├── schemas.py              # 📋 Pydantic models
│   ├── products.json           # 🏦 Банковские продукты
│   │
│   └── services/               # 🎨 Бизнес-логика
│       ├── goal_service.py     # Управление целями
│       ├── chat_service.py     # Чат с AI
│       ├── recommendation_service.py  # Рекомендации
│       ├── analytics_service.py       # Аналитика
│       ├── llm_client.py       # LLM клиент
│       ├── cache_manager.py    # Кэширование
│       └── rate_limiter.py     # Rate limiting
│
├── data/
│   └── product_embeddings.pkl  # Векторные представления (создаётся авто)
│
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

### Health & Status
```http
GET /health
```
Проверка состояния системы

### Goals (Цели)
```http
POST /goals/create          # Создание цели с AI-советами
GET /goals                  # Список целей (фильтры: user_id, status)
PUT /goals/{id}             # Обновление прогресса
DELETE /goals/{id}          # Удаление цели
```

### Chat (Чат)
```http
POST /chat                  # REST API чат
WS /ws/chat/{user_id}       # WebSocket real-time чат
```

### Recommendations (Рекомендации)
```http
POST /recommend             # Подбор продуктов для цели
GET /products               # Список всех продуктов
```

### Analytics (Аналитика)
```http
POST /analyze_expenses      # Анализ CSV с транзакциями
```

### Admin
```http
GET /admin/logs             # Логи (требует ADMIN_TOKEN)
DELETE /admin/reset_db      # Сброс БД (ОПАСНО!)
```

### Stats
```http
GET /stats/dashboard        # Дашборд статистики
GET /cache/stats            # Статистика кэша
```

---

## 💻 Примеры использования

### Python

```python
import httpx

# Создание цели
async def create_goal():
    async with httpx.AsyncClient() as client:
        response = await client.post("http://localhost:8000/goals/create", json={
            "name": "Отпуск в Турции",
            "target_amount": 1000000,
            "current_savings": 200000,
            "target_date": "2025-07-01",
            "user_id": 1,
            "income": 500000,
            "expenses": 350000,
            "goal_type": "отпуск"
        })
        print(response.json())

# Чат
async def chat():
    async with httpx.AsyncClient() as client:
        response = await client.post("http://localhost:8000/chat", json={
            "messages": [
                {"role": "user", "content": "Как начать копить на машину?"}
            ],
            "user_id": 1
        })
        print(response.json()["reply"])

# Анализ расходов
async def analyze():
    async with httpx.AsyncClient() as client:
        with open("transactions.csv", "rb") as f:
            response = await client.post(
                "http://localhost:8000/analyze_expenses",
                files={"file": f},
                params={"monthly_income": 500000}
            )
        print(response.json())
```

### cURL

```bash
# Health check
curl http://localhost:8000/health

# Создание цели
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новая квартира",
    "target_amount": 10000000,
    "current_savings": 2000000,
    "target_date": "2027-12-31",
    "income": 600000,
    "expenses": 400000
  }'

# Чат
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Какой депозит выбрать?"}
    ]
  }'

# Рекомендации продуктов
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "goal_amount": 5000000,
    "months": 24,
    "age": 30,
    "goal_type": "образование"
  }'
```

### JavaScript/Fetch

```javascript
// Создание цели
const createGoal = async () => {
  const response = await fetch('http://localhost:8000/goals/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Ремонт квартиры",
      target_amount: 3000000,
      current_savings: 500000,
      target_date: "2026-06-01",
      income: 450000,
      expenses: 300000
    })
  });
  const data = await response.json();
  console.log(data);
};

// WebSocket чат
const ws = new WebSocket('ws://localhost:8000/ws/chat/1');

ws.onopen = () => {
  ws.send(JSON.stringify({
    content: "Помоги составить финансовый план"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.content); // Streaming response
};
```

---

## 🔧 Конфигурация

### Переменные окружения (.env)

```bash
# API ключи
OPENAI_HUB_KEY=your_key_here
OPENAI_HUB_URL=https://openai-hub.neuraldeep.tech
ADMIN_TOKEN=strong_random_token

# База данных
DATABASE_URL=sqlite:///./zaman_assistant.db

# Режимы
MOCK_MODE=false          # true для тестов без LLM
DEBUG=true               # Auto-reload при изменениях

# Производительность
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_SECONDS=3600

# Embeddings
EMBEDDINGS_PATH=./data/product_embeddings.pkl
EMBED_DIM=1536
```

---

## 🎨 Архитектура

### Слои приложения

```
┌─────────────────────────────────────────┐
│         FastAPI Endpoints               │  ← main.py
├─────────────────────────────────────────┤
│         Service Layer                   │  ← services/*
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ Goal        │  │ Chat            │  │
│  │ Service     │  │ Service         │  │
│  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │Recommend    │  │ Analytics       │  │
│  │Service      │  │ Service         │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│       Infrastructure Layer              │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │LLMClient │ │CacheMan. │ │RateLim. ││
│  └──────────┘ └──────────┘ └─────────┘│
├─────────────────────────────────────────┤
│         Data Layer                      │
│  ┌──────────┐ ┌────────────────────┐  │
│  │SQLAlchemy│ │ EmbeddingIndex     │  │
│  │ Models   │ │ (Vector Search)    │  │
│  └──────────┘ └────────────────────┘  │
└─────────────────────────────────────────┘
```

### Ключевые улучшения v3.0

#### ✅ Исправлены баги
- `__tablename__` вместо `_tablename_` в моделях БД
- Удалено дублирование кода (модели, embeddings, промпты)
- Thread-safe кэш и rate limiter
- Правильные транзакции БД

#### ✅ Новая архитектура
- Service layer для бизнес-логики
- Dependency injection через `get_services()`
- Централизованная конфигурация (`config.py`)
- Pydantic schemas для валидации

#### ✅ Производительность
- Векторизованный поиск embeddings
- Кэширование с hit rate tracking
- Асинхронная обработка
- Batch embeddings generation

#### ✅ Observability
- Метрики в БД
- Structured logging
- Health checks
- Cache/rate limiter stats

---

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2025-01-15T10:30:00",
  "mock_mode": false,
  "database": {
    "connected": true,
    "total_goals": 42,
    "total_users": 15
  },
  "cache": {
    "entries": 127,
    "hit_rate": 0.68
  },
  "embeddings": {
    "loaded": 7,
    "ready": true
  },
  "websockets": {
    "active_connections": 3
  }
}
```

### Dashboard Stats

```bash
curl http://localhost:8000/stats/dashboard
```

Возвращает:
- Общая статистика по целям
- Недавние цели
- Системная информация

---

## 🧪 Тестирование

### MOCK режим

Для тестов без реальных LLM вызовов:

```bash
# В .env
MOCK_MODE=true
```

В этом режиме:
- LLM ответы генерируются локально
- Embeddings детерминированные (hash-based)
- Латентность ~150ms
- Нет расхода токенов

### Ручное тестирование

```bash
# Запуск сервера
python main.py

# В другом терминале
curl http://localhost:8000/health

# Тест создания цели
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "target_amount": 100000, "current_savings": 0, "target_date": "2026-01-01"}'
```

---

## 🚢 Deployment

### Docker (TODO)

```bash
# Build
docker build -t zaman-assistant .

# Run
docker run -p 8000:8000 \
  -e OPENAI_HUB_KEY=your_key \
  -e DATABASE_URL=postgresql://... \
  zaman-assistant
```

### Production checklist

- [ ] Установить сильный `ADMIN_TOKEN`
- [ ] Использовать PostgreSQL вместо SQLite
- [ ] Настроить HTTPS/SSL
- [ ] Добавить rate limiting на nginx/reverse proxy
- [ ] Настроить логирование (Sentry, Datadog)
- [ ] Регулярное резервное копирование БД
- [ ] Мониторинг метрик (Prometheus/Grafana)
- [ ] Настроить CORS для production domains
- [ ] Отключить DEBUG режим
- [ ] Проверить все environment variables

---

## 🤝 Contributing

### Структура коммитов

```
feat: добавлена поддержка экспорта целей в PDF
fix: исправлена ошибка в расчёте monthly_needed
refactor: вынесена логика embeddings в отдельный сервис
docs: обновлён README с примерами API
```

### Code style

- Python: PEP 8
- Docstrings: Google style
- Type hints везде где возможно
- Максимальная длина строки: 120

### Добавление нового endpoint

1. Создать schema в `schemas.py`
2. Добавить логику в соответствующий service
3. Добавить endpoint в `main.py`
4. Обновить документацию

---

## 📝 Changelog

### v3.0.0 (2025-01-15) - Refactored

**Breaking changes:**
- Переработана архитектура (service layer)
- API остаётся совместимым

**Исправления:**
- ✅ `__tablename__` в моделях БД
- ✅ Удалено дублирование кода
- ✅ Thread-safe кэш
- ✅ Правильные транзакции

**Новое:**
- ✨ Service layer
- ✨ Dependency injection
- ✨ Pydantic schemas
- ✨ Rate limiter
- ✨ Улучшенный embeddings

### v2.1.0 (2025-01-10)
- WebSocket поддержка
- FAQ responses
- Кэширование

### v2.0.0 (2025-01-05)
- Начальная версия

---

## 📄 License

MIT License - see LICENSE file

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourorg/zaman_assistant/issues)
- **Email**: support@zamanbank.kz
- **Docs**: [API Documentation](http://localhost:8000/docs) (запустите сервер)

---

## 🙏 Acknowledgments

- FastAPI framework
- OpenAI API
- SQLAlchemy ORM
- Pydantic validation

---

**Built with ❤️ for Zaman Bank**