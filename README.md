# 🏦 Zaman Assistant v3.0

> AI-powered финансовый ассистент для Zaman Bank с функциями планирования целей, анализа расходов и рекомендации продуктов.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.119-green.svg)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-Latest-blue.svg)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20Integration-brightgreen.svg)]()

---

## 🎯 Основные возможности

### ✨ Для пользователей
- **💰 Финансовые цели**: Создание и отслеживание целей с AI-советами
- **📊 Анализ расходов**: Автоматическая категоризация транзакций из CSV
- **🎯 Умные рекомендации**: Подбор банковских продуктов на основе целей
- **💬 Чат-ассистент**: Real-time общение с AI (WebSocket + REST)
- **🎤 Аудио**: Транскрибирование аудио с Whisper API
- **❓ FAQ**: Мгновенные ответы на типовые вопросы

### 🛠️ Для разработчиков
- **🏗️ Clean Architecture**: Service layer, dependency injection
- **🔒 Type Safety**: Pydantic schemas для всех API
- **⚡ Caching**: Namespace-aware кэш с TTL
- **🚦 Rate Limiting**: Sliding window per-IP
- **🧪 Testing**: Unit + Integration тесты (>80% coverage)
- **📈 Observability**: Health checks, metrics, логи

---

## 🚀 Быстрый старт

### Требования
- Python 3.11+
- Docker & Docker Compose (опционально)
- PostgreSQL 16 (production)

### Установка (Development)

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
cp .env.example .env
# Отредактируйте .env с вашими API ключами

# 5. БД инициализация
python database.py

# 6. Запуск
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**📚 API документация:** http://localhost:8000/docs

### Docker запуск (Recommended)

```bash
# Development
docker-compose -f infra/docker-compose.yml up

# Production с PostgreSQL + Redis
docker-compose -f infra/docker-compose.production.yml up

# Testing
docker-compose -f infra/docker-compose.test.yml up
```

**Выбранный Dockerfile:** `infra/Dockerfile.optimized` ✅
- Multi-stage build (меньше размер)
- Security scanner (Bandit)
- Production & Development targets
- Non-root user
- Лучше для production

---

## 📁 Структура проекта

```
zaman_assistant/
├── backend/
│   ├── main.py                 # 🎯 FastAPI приложение
│   ├── config.py               # ⚙️ Конфигурация
│   ├── database.py             # 💾 SQLAlchemy модели
│   ├── embeddings.py           # 🔍 Векторный поиск
│   ├── analytics.py            # 📊 Анализ расходов
│   ├── prompts.py              # 💬 LLM промпты
│   ├── schemas.py              # 📋 Pydantic моделиs
│   ├── products.json           # 🏦 Банковские продукты
│   │
│   ├── services/               # 🎨 Бизнес-логика
│   │   ├── llm_client.py             # LLM интеграция + MOCK
│   │   ├── chat_service.py           # Чат с FAQ
│   │   ├── goal_service.py           # Управление целями
│   │   ├── recommendation_service.py # Подбор продуктов
│   │   ├── analytics_service.py      # Аналитика расходов
│   │   ├── whisper_service.py        # Аудио транскрибирование
│   │   ├── cache_manager.py          # Кэширование
│   │   └── rate_limiter.py           # Rate limiting
│   │
│   ├── tests/                  # 🧪 Unit & Integration тесты
│   │   ├── test_services.py         # Сервисы
│   │   ├── test_api.py              # API endpoints
│   │   ├── conftest.py              # Fixtures
│   │   └── __init__.py
│   │
│   └── .env                    # 🔐 Environment variables
│
├── infra/
│   ├── Dockerfile              # Production образ
│   ├── Dockerfile.optimized    # ✅ Рекомендуемый (multi-stage)
│   ├── docker-compose.yml      # Development
│   ├── docker-compose.production.yml
│   ├── docker-compose.test.yml
│   │
│   ├── terraform/              # 🌐 AWS инфраструктура
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars.example
│   │
│   └── monitoring/             # 📊 Prometheus + Grafana
│       ├── prometheus.yml
│       └── alertmanager.yml
│
├── k8s/
│   └── deployment.yaml         # ☸️ Kubernetes
│
├── .github/workflows/
│   ├── ci.yml                  # CI pipeline
│   ├── cd.yml                  # CD pipeline
│   ├── security.yml            # Security scanning
│   └── monitoring.yml          # Мониторинг
│
├── requirements.txt            # Python зависимости
├── README.md                   # Этот файл
└── .gitignore
```

---

## 🔌 API Endpoints

### Health & Status
```bash
GET  /health              # Проверка состояния (200 OK)
GET  /stats/dashboard     # Статистика
GET  /cache/stats         # Метрики кэша
```

### 🎯 Goals (Финансовые цели)
```bash
POST   /goals/create      # Создание цели с AI-советами
GET    /goals?user_id=1   # Список целей (фильтры: user_id, status)
GET    /goals/1           # Получить одну цель
PUT    /goals/1           # Обновить прогресс
DELETE /goals/1           # Удалить цель
```

### 💬 Chat (Чат с AI)
```bash
POST /chat                # REST API чат
WS   /ws/chat/{user_id}   # WebSocket real-time
```

### 📦 Recommendations (Рекомендации)
```bash
POST /recommend           # Подбор продуктов для цели
GET  /products            # Все продукты
```

### 📊 Analytics (Аналитика)
```bash
POST /analyze_expenses    # Анализ CSV
```

### 🎤 Audio (Аудио)
```bash
POST /audio/transcribe       # Транскрибирование
POST /audio/translate        # Перевод на английский
POST /audio/message          # Full pipeline
WS   /ws/audio/{user_id}     # Real-time обработка
```

---

## 💻 Примеры использования

### 1️⃣ Создание финансовой цели

**Python:**
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
        goal = response.json()
        print(f"Goal created: {goal['goal_id']}")
        print(f"Monthly needed: {goal['monthly_needed']} KZT")
        print(f"AI tips:\n{goal['ai_tips']}")

asyncio.run(create_goal())
```

**cURL:**
```bash
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новая квартира",
    "target_amount": 10000000,
    "current_savings": 2000000,
    "target_date": "2027-12-31",
    "income": 600000,
    "expenses": 400000,
    "goal_type": "недвижимость"
  }'
```

**JavaScript/Fetch:**
```javascript
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
  console.log(`Monthly payment: ${data.monthly_needed} KZT`);
};

createGoal();
```

**Response:**
```json
{
  "goal_id": 1,
  "name": "Отпуск в Турции",
  "target_amount": 1000000,
  "current_savings": 200000,
  "monthly_needed": 66667,
  "progress_percent": 20.0,
  "ai_tips": "Отличная цель! При откладывании 67,000 KZT/мес за 12 месяцев...",
  "created_at": "2025-01-18T10:30:00"
}
```

---

### 2️⃣ WebSocket Чат

**JavaScript:**
```javascript
// Подключение к WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/chat/1');

ws.onopen = () => {
  console.log('✅ Connected');
  
  // Отправка сообщения
  ws.send(JSON.stringify({
    content: "Какой депозит выбрать?",
    mode: "mentor"  // mentor, analyst, friend, tech
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'stream') {
    // Streaming response (эффект набора текста)
    process.stdout.write(data.reply);
    
    if (data.done) {
      console.log('\n✅ Message complete');
    }
  } else if (data.error) {
    console.error('❌ Error:', data.error);
  }
};

ws.onclose = () => console.log('❌ Disconnected');
```

**Python (asyncio):**
```python
import asyncio
import websockets
import json

async def chat_websocket():
    uri = "ws://localhost:8000/ws/chat/1"
    async with websockets.connect(uri) as websocket:
        # Отправка сообщения
        message = {
            "content": "Помоги составить финансовый план",
            "mode": "mentor"
        }
        await websocket.send(json.dumps(message))
        
        # Получение streaming ответа
        async for response in websocket:
            data = json.loads(response)
            print(data.get('reply', ''), end='', flush=True)
            
            if data.get('done'):
                print('\n✅ Done')
                break

asyncio.run(chat_websocket())
```

---

### 3️⃣ REST Чат

**Request:**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "как начать копить"}
    ],
    "user_id": 1
  }'
```

**Response:**
```json
{
  "reply": "Отлично! Начните с простого: 1) Определите цель и сумму 2) Установите ежемесячный платёж 3) Выберите депозит 'Выгодный' (17% годовых). Давайте создадим ваш финансовый план?",
  "latency_ms": 145.32,
  "from_cache": false,
  "type": "llm"
}
```

---

### 4️⃣ Подбор продуктов

**Request:**
```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "goal_amount": 5000000,
    "months": 24,
    "age": 35,
    "goal_type": "автомобиль",
    "use_semantic_search": true
  }'
```

**Response:**
```json
{
  "recommendations": [
    {
      "product": {
        "id": "prod_5",
        "name": "Выгодный",
        "type": "Депозитный",
        "short_desc": "Депозит с повышенной доходностью 17% годовых"
      },
      "score": 0.854,
      "conditions": "доходность ~17%, от 500,000 KZT, срок 3-12 мес",
      "explanation": "Этот депозит идеально подходит для вашей цели автомобиля..."
    }
  ],
  "total_analyzed": 7,
  "semantic_search_used": true
}
```

---

### 5️⃣ Анализ расходов

**Upload CSV:**
```bash
curl -X POST http://localhost:8000/analyze_expenses \
  -F "file=@transactions.csv" \
  -F "monthly_income=500000"
```

**CSV формат:**
```csv
date,amount,description
2025-01-01,10000,Магазин Carrefour
2025-01-02,5000,Такси Uber
2025-01-03,15000,Ресторан Павел's
2025-01-05,2000,Аптека
2025-01-07,30000,Счет за электричество
```

**Response:**
```json
{
  "categories": [
    {"category": "ЖКХ", "amount": 30000, "percentage": 50.0},
    {"category": "Развлечения", "amount": 15000, "percentage": 25.0},
    {"category": "Продукты", "amount": 10000, "percentage": 16.7},
    {"category": "Транспорт", "amount": 5000, "percentage": 8.3}
  ],
  "total_spending": 60000,
  "total_transactions": 5,
  "advice": [
    "У вас наибольшие траты на ЖКХ (30,000 KZT). Проверьте счета...",
    "В категории 'Развлечения' можно найти ненужные подписки..."
  ],
  "top_merchants": [
    {"merchant": "Электричество", "total": 30000},
    {"merchant": "Ресторан Павел's", "total": 15000}
  ]
}
```

---

### 6️⃣ Аудио транскрибирование

**Request:**
```bash
curl -X POST http://localhost:8000/audio/transcribe \
  -F "file=@audio.mp3" \
  -F "language=ru"
```

**Поддерживаемые форматы:** mp3, wav, m4a, flac, ogg, webm (макс 25MB)

**Response:**
```json
{
  "text": "Здравствуйте! Я хочу начать копить на отпуск в Турции.",
  "filename": "audio.mp3",
  "language": "ru",
  "latency_ms": 2345.67,
  "status": "success"
}
```

---

## 🧪 Тестирование

### Запуск unit тестов

```bash
# Все тесты
pytest tests/ -v

# С coverage
pytest tests/ -v --cov=backend --cov-report=html

# Конкретный тест
pytest tests/test_services.py::TestGoalService::test_create_goal_valid -v

# Параллельно
pytest tests/ -v -n auto
```

### Доступные тесты

```
✅ test_services.py
  • TestLLMClient - LLM интеграция, embeddings
  • TestCacheManager - кэширование, TTL, namespace
  • TestRateLimiter - rate limiting, блокировка
  • TestGoalService - создание целей, расчеты
  • TestChatService - FAQ, кэш, сообщения
  • TestRecommendationService - скоринг продуктов
  • TestAnalyticsService - анализ CSV, категоризация
  • TestIntegration - flow тесты
  • TestPerformance - производительность
  • TestErrorHandling - обработка ошибок
```

### Coverage

```bash
# Генерация HTML report
pytest tests/ --cov=backend --cov-report=html

# Открыть report
open htmlcov/index.html  # macOS
start htmlcov/index.html  # Windows
xdg-open htmlcov/index.html  # Linux
```

**Целевой coverage:** >80%

---

## 🔧 Конфигурация

### .env файл

```bash
# ===== РЕЖИМ =====
MOCK_MODE=false           # true для тестов без LLM
DEBUG=true                # Auto-reload

# ===== OPENAI HUB =====
OPENAI_HUB_KEY=sk-...     # Ваш API ключ (https://openai-hub.neuraldeep.tech)
OPENAI_HUB_URL=https://openai-hub.neuraldeep.tech
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_ANALYSIS_MODEL=gpt-4o
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_TIMEOUT_SECONDS=30
OPENAI_MAX_RETRIES=3

# ===== DATABASE =====
DATABASE_URL=sqlite:///./zaman_assistant.db
# DATABASE_URL=postgresql://user:pass@localhost/zaman_db  # Production

# ===== SECURITY =====
ADMIN_TOKEN=supersecret_token  # ⚠️ ОБЯЗАТЕЛЬНО измените!

# ===== PERFORMANCE =====
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_SECONDS=3600

# ===== EMBEDDINGS =====
EMBEDDINGS_PATH=./data/product_embeddings.pkl
EMBED_DIM=1536

# ===== WHISPER =====
WHISPER_ENABLED=true
WHISPER_DEFAULT_LANGUAGE=ru
WHISPER_MAX_FILE_SIZE_MB=25
WHISPER_TIMEOUT_SECONDS=300
```

---

## 🐳 Docker

### Рекомендуемый Dockerfile

**`infra/Dockerfile.optimized`** ✅ (выбран)

**Преимущества:**
- Multi-stage build (меньше размер)
- Security scanning с Bandit
- Development & Production targets
- Non-root user
- Resource limits

### Сборка

```bash
# Development
docker build --target development -t zaman-dev .

# Production
docker build --target production -t zaman-prod .

# Optimized
docker build -f infra/Dockerfile.optimized --target production -t zaman:latest .
```

### Запуск контейнера

```bash
# Development
docker run -p 8000:8000 \
  -e OPENAI_HUB_KEY=sk-... \
  -e MOCK_MODE=true \
  -v $(pwd)/backend:/app/backend \
  zaman-dev

# Production
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e OPENAI_HUB_KEY=sk-... \
  -e ADMIN_TOKEN=... \
  --memory=2g \
  --cpus=2 \
  zaman:latest
```

---

## 🚀 Deployment

### Docker Compose (Quick Start)

```bash
# Development
docker-compose -f infra/docker-compose.yml up -d

# Production с PostgreSQL + Redis
docker-compose -f infra/docker-compose.production.yml up -d

# Production с Monitoring (Prometheus + Grafana)
docker-compose -f infra/docker-compose.enhanced.yml up -d

# Logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Kubernetes

```bash
# Deploy
kubectl apply -f k8s/deployment.yaml

# Check
kubectl get pods -n zaman-assistant
kubectl logs -f deployment/zaman-backend -n zaman-assistant

# Port forward
kubectl port-forward svc/zaman-backend 8000:8000 -n zaman-assistant
```

### AWS ECS (Terraform)

```bash
cd infra/terraform

# Init
terraform init

# Plan
terraform plan -var-file=terraform.tfvars

# Apply
terraform apply -var-file=terraform.tfvars

# Outputs
terraform output
```

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
  "database": {
    "connected": true,
    "total_goals": 42
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

### Prometheus + Grafana

```bash
# Запуск мониторинга
docker-compose -f infra/docker-compose.enhanced.yml up

# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
# AlertManager: http://localhost:9093
```

---

## 🔒 Security Features

- ✅ **Rate Limiting** - per-IP sliding window
- ✅ **CORS** - настроена для production
- ✅ **SQL Injection Prevention** - SQLAlchemy ORM
- ✅ **Secrets Management** - AWS SecretManager / .env
- ✅ **Docker Security** - non-root user, multi-stage
- ✅ **Container Scanning** - Trivy для уязвимостей
- ✅ **HTTPS/TLS** - через nginx + ACM
- ✅ **Input Validation** - Pydantic schemas

---

## 📚 Полезные команды

```bash
# Development
make help                    # Справка по командам
make build                   # Сборка образов
make up                      # Запуск
make logs                    # Логи
make test                    # Тесты
make clean                   # Очистка

# Health
curl http://localhost:8000/health

# Документация
# Swagger UI: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc

# Database
python backend/database.py   # Инициализация

# Тесты
pytest tests/ -v --cov=backend
pytest tests/test_services.py::TestGoalService -v
```

---

## 🎓 Дополнительные ресурсы

- **FastAPI документация:** https://fastapi.tiangolo.com
- **SQLAlchemy:** https://www.sqlalchemy.org
- **Pydantic:** https://docs.pydantic.dev
- **OpenAI Hub:** https://openai-hub.neuraldeep.tech
- **Zaman Bank:** https://zamanbank.kz

---

## 📝 Changelog

### v3.0.0 (2025-01-18) - Major Refactor
- ✅ Service layer архитектура
- ✅ Dependency injection
- ✅ Comprehensive unit тесты (>80%)
- ✅ Thread-safe кэш с namespace
- ✅ Whisper Audio API интеграция
- ✅ Enhanced Docker (multi-stage)
- ✅ Production-ready конфигурация

### v2.1.0 (2025-01-10)
- WebSocket поддержка
- FAQ responses
- Кэширование

### v2.0.0 (2025-01-05)
- Начальная версия

---

## 🤝 Contribution

1. Fork репозиторий
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

**Code style:** PEP 8, Black, flake8

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/yourorg/zaman_assistant/issues)
- **Email:** support@zamanbank.kz
- **API Docs:** http://localhost:8000/docs
- **Telegram:** [@zaman_dev_support](https://t.me/zaman_dev_support)

---

## 👥 Team

- **Backend Lead:** Backend Team
- **ML Engineer:** ML Team
- **DevOps:** DevOps Team

---

<p align="center">
  <b>Built with ❤️ for Zaman Bank</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Kazakhstan-blue?style=for-the-badge" alt="Made in Kazakhstan">
</p>