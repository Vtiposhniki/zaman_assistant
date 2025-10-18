# 🏦 Zaman Assistant

> AI-powered финансовый ассистент для Zaman Bank с функциями планирования целей, анализа расходов и рекомендации продуктов.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.119-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 Основные возможности

### ✨ Для пользователей
- **💰 Финансовые цели**: Создание и отслеживание целей накопления с AI-советами
- **📊 Анализ расходов**: Автоматическая категоризация транзакций из CSV
- **🎯 Умные рекомендации**: Подбор банковских продуктов на основе ваших целей
- **💬 Чат-ассистент**: Real-time общение с AI через WebSocket или REST API
- **❓ FAQ**: Мгновенные ответы на типовые вопросы

### 🛠️ Для разработчиков
- **🏗️ Clean Architecture**: Service layer, dependency injection
- **🔒 Type Safety**: Pydantic schemas для всех API
- **⚡ Caching**: Интеллектуальное кэширование с namespace isolation
- **🚦 Rate Limiting**: Per-IP ограничения с sliding window
- **🔍 Embeddings**: Семантический поиск продуктов
- **📈 Observability**: Метрики, логи, health checks

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
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 3. Зависимости
pip install -r requirements.txt

# 4. Конфигурация
cd backend
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Отредактируйте .env - добавьте свои API ключи

# 5. Инициализация БД
python database.py

# 6. Запуск
uvicorn main:app --host 0.0.0.0 --port 8000
```

Сервер запустится на `http://localhost:8000`

**📚 Документация API:** `http://localhost:8000/docs`

---

## 📁 Структура проекта

```
zaman_assistant/
├── backend/
│   ├── main.py                 # 🎯 FastAPI приложение
│   ├── config.py               # ⚙️ Централизованная конфигурация
│   ├── database.py             # 💾 Модели БД
│   ├── embeddings.py           # 🔍 Векторный поиск
│   ├── analytics.py            # 📊 Анализ транзакций
│   ├── prompts.py              # 💬 LLM промпты
│   ├── schemas.py              # 📋 Pydantic models
│   ├── products.json           # 🏦 Банковские продукты
│   │
│   ├── services/               # 🎨 Бизнес-логика
│   │   ├── goal_service.py           # Управление целями
│   │   ├── chat_service.py           # Чат с AI
│   │   ├── recommendation_service.py # Рекомендации
│   │   ├── analytics_service.py      # Аналитика
│   │   ├── llm_client.py             # LLM клиент
│   │   ├── cache_manager.py          # Кэширование
│   │   └── rate_limiter.py           # Rate limiting
│   │
│   └── .env                    # 🔐 Environment variables
│
├── data/
│   └── product_embeddings.pkl  # Векторные представления
│
├── requirements.txt
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

### Health & Status
```http
GET  /health              # Проверка состояния системы
GET  /stats/dashboard     # Дашборд статистики
GET  /cache/stats         # Статистика кэша
```

### Goals (Цели)
```http
POST   /goals/create      # Создание цели с AI-советами
GET    /goals             # Список целей (фильтры: user_id, status)
PUT    /goals/{id}        # Обновление прогресса
DELETE /goals/{id}        # Удаление цели
```

### Chat (Чат)
```http
POST /chat                # REST API чат
WS   /ws/chat/{user_id}   # WebSocket real-time чат
```

### Recommendations (Рекомендации)
```http
POST /recommend           # Подбор продуктов для цели
GET  /products            # Список всех продуктов
```

### Analytics (Аналитика)
```http
POST /analyze_expenses    # Анализ CSV с транзакциями
```

### Admin
```http
GET    /admin/logs        # Логи (требует ADMIN_TOKEN)
DELETE /admin/reset_db    # Сброс БД (ОПАСНО!)
```

---

## 💻 Примеры использования

### Python

```python
import httpx
import asyncio

async def create_goal():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/goals/create",
            json={
                "name": "Отпуск в Турции",
                "target_amount": 1000000,
                "current_savings": 200000,
                "target_date": "2025-07-01",
                "income": 500000,
                "expenses": 350000,
                "goal_type": "отпуск"
            }
        )
        print(response.json())

asyncio.run(create_goal())
```

### cURL

```bash
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

# Рекомендации
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "goal_amount": 5000000,
    "months": 24,
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
  
  if (data.type === 'stream') {
    console.log(data.content); // Streaming response
    
    if (data.done) {
      console.log('Message complete');
    }
  }
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
# DATABASE_URL=postgresql://user:pass@localhost/zaman_db  # Production

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

### Ключевые особенности v3.0

#### ✅ Исправленные баги
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

**Response:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2025-10-18T10:30:00",
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
- Производительность

---

## 🧪 Тестирование

### MOCK режим

Для тестов без реальных LLM вызовов:

```bash
# В .env
MOCK_MODE=true
```

В этом режиме:
- ✅ LLM ответы генерируются локально
- ✅ Embeddings детерминированные (hash-based)
- ✅ Латентность ~150ms
- ✅ Нет расхода токенов

### Ручное тестирование

```bash
# 1. Запуск сервера
python main.py

# 2. В другом терминале - тесты
curl http://localhost:8000/health

# 3. Создание тестовой цели
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Goal",
    "target_amount": 100000,
    "current_savings": 0,
    "target_date": "2026-01-01"
  }'

# 4. Проверка FAQ
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "как начать копить"}
    ]
  }'
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

### Production Checklist

**Security:**
- [ ] Установить сильный `ADMIN_TOKEN`
- [ ] Использовать PostgreSQL вместо SQLite
- [ ] Настроить HTTPS/SSL
- [ ] Добавить authentication на WebSocket
- [ ] Настроить CORS для production domains

**Performance:**
- [ ] Увеличить connection pool size
- [ ] Настроить Redis для кэша (опционально)
- [ ] Добавить rate limiting на nginx
- [ ] Использовать Gunicorn/Uvicorn workers

**Monitoring:**
- [ ] Настроить логирование (Sentry, Datadog)
- [ ] Регулярное резервное копирование БД
- [ ] Мониторинг метрик (Prometheus/Grafana)
- [ ] Настроить health check alerts

**Configuration:**
- [ ] Отключить DEBUG режим
- [ ] Проверить все environment variables
- [ ] Настроить log rotation

---

## 🤝 Contributing

### Структура коммитов

```
feat: добавлена поддержка экспорта целей в PDF
fix: исправлена ошибка в расчёте monthly_needed
refactor: вынесена логика embeddings в отдельный сервис
docs: обновлён README с примерами API
test: добавлены unit тесты для goal_service
```

### Code Style

- **Python**: PEP 8
- **Docstrings**: Google style
- **Type hints**: везде где возможно
- **Максимальная длина строки**: 120

### Добавление нового endpoint

1. Создать schema в `schemas.py`
2. Добавить логику в соответствующий service
3. Добавить endpoint в `main.py`
4. Обновить документацию
5. Написать тесты

---

## 📝 Changelog

### v3.0.0 (2025-10-18) - Major Refactor

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
- ✨ WebSocket streaming

### v2.1.0 (2025-01-10)
- WebSocket поддержка
- FAQ responses
- Кэширование

### v2.0.0 (2025-01-05)
- Начальная версия

---

## 🐛 Известные проблемы

### SQLite Limitations
- Не подходит для высоконагруженных систем
- Нет concurrent writes
- **Решение**: PostgreSQL для production

### Embeddings в памяти
- При большом количестве продуктов (>10K) может быть проблема
- **Решение**: Использовать FAISS для ANN search

### WebSocket без auth
- Любой может подключиться к чужому user_id
- **Решение**: Добавить token authentication (в roadmap)

---

## 🗺️ Roadmap

### Q1 2025
- [ ] Unit & Integration тесты (coverage >80%)
- [ ] PostgreSQL миграция
- [ ] Docker compose setup
- [ ] CI/CD pipeline (GitHub Actions)

### Q2 2025
- [ ] WebSocket authentication
- [ ] User management система
- [ ] API versioning (/v1/, /v2/)
- [ ] Prometheus metrics export

### Q3 2025
- [ ] FAISS для embeddings
- [ ] Multi-language support
- [ ] Mobile app integration
- [ ] Advanced analytics dashboard

### Q4 2025
- [ ] ML-based fraud detection
- [ ] Personalized recommendations v2
- [ ] Voice assistant integration
- [ ] Blockchain integration (опционально)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🆘 Support

**Issues:** [GitHub Issues](https://github.com/yourorg/zaman_assistant/issues)

**Email:** support@zamanbank.kz

**Documentation:** 
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

**Telegram:** [@zaman_dev_support](https://t.me/zaman_dev_support)

---

## 🙏 Acknowledgments

- **FastAPI** — современный Python web framework
- **OpenAI API** — LLM inference
- **SQLAlchemy** — ORM
- **Pydantic** — data validation
- **Uvicorn** — ASGI server

---

## 👥 Team

- **Backend Lead:** [Your Name](https://github.com/yourname)
- **ML Engineer:** [ML Lead](https://github.com/mlname)
- **DevOps:** [DevOps Lead](https://github.com/devopsname)

---

## 📞 Contact

**Zaman Bank AI Team**  
📧 ai-team@zamanbank.kz  
🌐 https://zamanbank.kz  
📍 Astana, Kazakhstan

---

<p align="center">
  <b>Built with ❤️ for Zaman Bank</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Kazakhstan-blue?style=for-the-badge" alt="Made in Kazakhstan">
</p>
