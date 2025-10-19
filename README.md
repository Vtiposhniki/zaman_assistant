# 🏦 Zaman Assistant v4.0

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.119-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.1-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-Latest-2496ed?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-80%25%20Coverage-brightgreen?style=for-the-badge)]()
[![Made in Kazakhstan](https://img.shields.io/badge/Made%20in-Kazakhstan-blue?style=for-the-badge)](https://zamanbank.kz)

**AI-powered финансовый ассистент для Zaman Bank с функциями планирования целей, анализа расходов и рекомендации продуктов**

[🚀 Быстрый старт](#-быстрый-старт) • [📖 Документация](#-документация) • [🔧 API](#-api-endpoints) • [🐳 Docker](#-docker) • [📊 Мониторинг](#-мониторинг)

</div>

---

## 📋 Содержание

- [🎯 Основные возможности](#-основные-возможности)
- [🏗️ Архитектура системы](#️-архитектура-системы)
- [🚀 Быстрый старт](#-быстрый-старт)
- [📁 Структура проекта](#-структура-проекта)
- [🔌 API Endpoints](#-api-endpoints)
- [💻 Примеры использования](#-примеры-использования)
- [🧪 Тестирование](#-тестирование)
- [🔧 Конфигурация](#-конфигурация)
- [🐳 Docker](#-docker)
- [🚀 Deployment](#-deployment)
- [📊 Мониторинг](#-мониторинг)
- [🔒 Безопасность](#-безопасность)
- [❓ FAQ](#-faq)
- [🤝 Вклад в проект](#-вклад-в-проект)

---

## 🎯 Основные возможности

### ✨ Для пользователей

<table>
<tr>
<td width="50%">

**💰 Финансовые цели**
- Создание и отслеживание целей с AI-советами
- Автоматический расчет ежемесячных платежей
- Прогресс-трекинг с визуализацией

**📊 Анализ расходов**
- Автоматическая категоризация транзакций из CSV
- Детальная аналитика по категориям
- Рекомендации по оптимизации трат

**🎯 Умные рекомендации**
- Подбор банковских продуктов на основе целей
- Семантический поиск по продуктам
- Персонализированные предложения

</td>
<td width="50%">

**💬 Чат-ассистент**
- Real-time общение с AI (WebSocket + REST)
- Множественные режимы общения
- Кэширование ответов для быстрого отклика

**🎤 Аудио обработка**
- Транскрибирование аудио с Whisper API
- Поддержка множества форматов
- Перевод на английский язык

**❓ FAQ система**
- Мгновенные ответы на типовые вопросы
- Интеграция с банковскими продуктами
- Контекстно-зависимые советы

</td>
</tr>
</table>

### 🛠️ Для разработчиков

<table>
<tr>
<td width="50%">

**🏗️ Clean Architecture**
- Service layer с dependency injection
- Модульная структура компонентов
- Разделение бизнес-логики и API

**🔒 Type Safety**
- Pydantic schemas для всех API
- Строгая типизация данных
- Автоматическая валидация

**⚡ Производительность**
- Namespace-aware кэш с TTL
- Асинхронная обработка запросов
- Оптимизированные запросы к БД

</td>
<td width="50%">

**🚦 Безопасность**
- Rate limiting per-IP
- CORS настройки
- Валидация входных данных

**🧪 Тестирование**
- Unit + Integration тесты (>80% coverage)
- Автоматизированное тестирование
- Mock-режим для разработки

**📈 Observability**
- Health checks и метрики
- Структурированное логирование
- Prometheus + Grafana интеграция

</td>
</tr>
</table>

---

## 🏗️ Архитектура системы

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[React UI Components]
        WS[WebSocket Client]
        API[API Client]
    end
    
    subgraph "Backend (FastAPI)"
        subgraph "API Layer"
            REST[REST Endpoints]
            WS_SERVER[WebSocket Server]
        end
        
        subgraph "Service Layer"
            CHAT[Chat Service]
            GOAL[Goal Service]
            REC[Recommendation Service]
            ANAL[Analytics Service]
            AUDIO[Audio Service]
        end
        
        subgraph "Core Services"
            LLM[LLM Client]
            CACHE[Cache Manager]
            RATE[Rate Limiter]
            DB[Database]
        end
    end
    
    subgraph "External Services"
        OPENAI[OpenAI Hub API]
        WHISPER[Whisper API]
        REDIS[(Redis Cache)]
        POSTGRES[(PostgreSQL)]
    end
    
    UI --> REST
    WS --> WS_SERVER
    API --> REST
    
    REST --> CHAT
    REST --> GOAL
    REST --> REC
    REST --> ANAL
    REST --> AUDIO
    
    WS_SERVER --> CHAT
    
    CHAT --> LLM
    CHAT --> CACHE
    GOAL --> DB
    REC --> LLM
    ANAL --> DB
    AUDIO --> WHISPER
    
    LLM --> OPENAI
    CACHE --> REDIS
    DB --> POSTGRES
    
    RATE --> REST
```

---

## 🚀 Быстрый старт

### 📋 Требования

- **Python** 3.11+
- **Node.js** 18+ (для frontend)
- **Docker** & Docker Compose (рекомендуется)
- **PostgreSQL** 16 (для production)

### ⚡ Установка за 5 минут

#### Вариант 1: Docker (Рекомендуется) 🐳

```bash
# 1. Клонирование репозитория
git clone https://github.com/yourorg/zaman_assistant.git
cd zaman_assistant

# 2. Настройка окружения
cp .env.example .env
# Отредактируйте .env с вашими API ключами

# 3. Запуск всех сервисов
docker-compose -f infra/docker-compose.yml up -d

# 4. Проверка работы
curl http://localhost:8000/health
```

**🎉 Готово!** Приложение доступно по адресам:
- **API:** http://localhost:8000
- **Frontend:** http://localhost:3000
- **Документация:** http://localhost:8000/docs

#### Вариант 2: Локальная установка 💻

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r ../requirements.txt
cp .env.example .env
python database.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 2. Frontend (в новом терминале)
cd frontend
npm install
npm run dev
```

### 🔑 Настройка API ключей

Создайте файл `.env` в корне проекта:

```bash
# OpenAI Hub API (обязательно)
OPENAI_HUB_KEY=sk-your-key-here
OPENAI_HUB_URL=https://openai-hub.neuraldeep.tech

# База данных (опционально)
DATABASE_URL=sqlite:///./zaman_assistant.db

# Безопасность (обязательно измените!)
ADMIN_TOKEN=your-secret-token-here
```

---

## 📁 Структура проекта

```
zaman_assistant/
├── 📁 backend/                    # Backend API (FastAPI)
│   ├── 🎯 main.py                 # Точка входа приложения
│   ├── ⚙️ config.py               # Конфигурация и настройки
│   ├── 💾 database.py             # SQLAlchemy модели и миграции
│   ├── 🔍 embeddings.py           # Векторный поиск продуктов
│   ├── 📊 analytics.py            # Анализ расходов и транзакций
│   ├── 💬 prompts.py              # LLM промпты и шаблоны
│   ├── 📋 schemas.py              # Pydantic модели валидации
│   ├── 🏦 products.json           # База банковских продуктов
│   │
│   ├── 📁 api/                    # API слой
│   │   ├── dependencies.py        # Dependency injection
│   │   ├── middleware.py          # Middleware (CORS, rate limiting)
│   │   └── routes/                # API маршруты
│   │       ├── admin.py           # Административные функции
│   │       ├── analytics.py       # Аналитика расходов
│   │       ├── audio.py          # Аудио обработка
│   │       ├── chat.py           # Чат с AI
│   │       ├── goals.py          # Финансовые цели
│   │       ├── health.py         # Health checks
│   │       └── products.py      # Банковские продукты
│   │
│   ├── 📁 core/                   # Ядро приложения
│   │   ├── app.py                 # Фабрика приложения
│   │   ├── events.py              # События жизненного цикла
│   │   └── websocket.py           # WebSocket обработка
│   │
│   ├── 📁 services/               # Бизнес-логика
│   │   ├── llm_client.py          # LLM интеграция + MOCK режим
│   │   ├── chat_service.py        # Чат с FAQ и AI
│   │   ├── goal_service.py        # Управление финансовыми целями
│   │   ├── recommendation_service.py # Подбор банковских продуктов
│   │   ├── analytics_service.py   # Аналитика расходов
│   │   ├── whisper_service.py     # Аудио транскрибирование
│   │   ├── cache_manager.py       # Кэширование с namespace
│   │   ├── rate_limiter.py        # Rate limiting
│   │   └── redis_goals_service.py # Redis интеграция
│   │
│   ├── 📁 tests/                  # Тестирование
│   │   ├── test_services.py       # Unit тесты сервисов
│   │   ├── test_api.py           # Integration тесты API
│   │   └── conftest.py           # Pytest fixtures
│   │
│   └── 📁 data/                   # Данные и модели
│       └── product_embeddings.pkl # Векторные представления продуктов
│
├── 📁 frontend/                   # Frontend (React + Vite)
│   ├── 📁 src/
│   │   ├── 📁 components/         # React компоненты
│   │   │   ├── Analytics/         # Аналитика расходов
│   │   │   ├── Chat/             # Чат интерфейс
│   │   │   ├── Dashboard/        # Главная панель
│   │   │   ├── Goals/            # Финансовые цели
│   │   │   ├── Products/         # Банковские продукты
│   │   │   └── UI/               # UI компоненты
│   │   ├── 📁 hooks/             # React hooks
│   │   ├── 📁 services/          # API сервисы
│   │   └── 📁 config/            # Конфигурация
│   ├── package.json              # Frontend зависимости
│   └── vite.config.js            # Vite конфигурация
│
├── 📁 infra/                      # Инфраструктура
│   ├── 🐳 Dockerfile              # Production образ
│   ├── 🐳 Dockerfile.optimized    # ✅ Рекомендуемый (multi-stage)
│   ├── 🐳 docker-compose.yml      # Development окружение
│   ├── 🐳 docker-compose.production.yml # Production окружение
│   ├── 🐳 docker-compose.test.yml # Testing окружение
│   │
│   ├── 📁 terraform/              # AWS инфраструктура
│   │   ├── main.tf               # Основная конфигурация
│   │   ├── variables.tf          # Переменные
│   │   └── terraform.tfvars.example # Пример переменных
│   │
│   ├── 📁 monitoring/            # Мониторинг
│   │   ├── prometheus.yml        # Prometheus конфигурация
│   │   └── alertmanager.yml      # AlertManager конфигурация
│   │
│   └── 📁 load-test/             # Нагрузочное тестирование
│       ├── artillery-config.yml  # Artillery конфигурация
│       ├── locustfile.py         # Locust тесты
│       └── stress-test.js        # Stress тесты
│
├── 📁 k8s/                       # Kubernetes манифесты
│   └── deployment.yaml           # K8s deployment
│
├── 📄 requirements.txt           # Python зависимости
├── 📄 README.md                  # Этот файл
└── 📄 .gitignore                 # Git ignore правила
```

---

## 🔌 API Endpoints

### 🏥 Health & Status

| Метод | Endpoint | Описание | Ответ |
|-------|----------|----------|-------|
| `GET` | `/health` | Проверка состояния системы | `200 OK` |
| `GET` | `/stats/dashboard` | Статистика использования | JSON |
| `GET` | `/cache/stats` | Метрики кэширования | JSON |

### 🎯 Goals (Финансовые цели)

| Метод | Endpoint | Описание | Параметры |
|-------|----------|----------|-----------|
| `POST` | `/goals/create` | Создание цели с AI-советами | JSON body |
| `GET` | `/goals` | Список целей | `?user_id=1&status=active` |
| `GET` | `/goals/{id}` | Получить конкретную цель | Path parameter |
| `PUT` | `/goals/{id}` | Обновить прогресс цели | JSON body |
| `DELETE` | `/goals/{id}` | Удалить цель | Path parameter |

### 💬 Chat (Чат с AI)

| Метод | Endpoint | Описание | Тип |
|-------|----------|----------|-----|
| `POST` | `/chat` | REST API чат | JSON |
| `WS` | `/ws/chat/{user_id}` | WebSocket real-time | WebSocket |

**Режимы чата:**
- `mentor` - Финансовый наставник
- `analyst` - Аналитик расходов  
- `friend` - Дружеское общение
- `tech` - Техническая поддержка

### 📦 Recommendations (Рекомендации)

| Метод | Endpoint | Описание | Параметры |
|-------|----------|----------|-----------|
| `POST` | `/recommend` | Подбор продуктов для цели | JSON body |
| `GET` | `/products` | Все доступные продукты | Query filters |

### 📊 Analytics (Аналитика)

| Метод | Endpoint | Описание | Формат |
|-------|----------|----------|--------|
| `POST` | `/analyze_expenses` | Анализ CSV транзакций | Multipart form |

### 🎤 Audio (Аудио обработка)

| Метод | Endpoint | Описание | Поддержка |
|-------|----------|----------|-----------|
| `POST` | `/audio/transcribe` | Транскрибирование аудио | mp3, wav, m4a, flac |
| `POST` | `/audio/translate` | Перевод на английский | Все форматы |
| `POST` | `/audio/message` | Полный pipeline | Аудио → текст → ответ |
| `WS` | `/ws/audio/{user_id}` | Real-time обработка | WebSocket |

---

## 💻 Примеры использования

### 1️⃣ Создание финансовой цели

<details>
<summary><strong>Python (httpx)</strong></summary>

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
        print(f"✅ Goal created: {goal['goal_id']}")
        print(f"💰 Monthly needed: {goal['monthly_needed']} KZT")
        print(f"🤖 AI tips:\n{goal['ai_tips']}")

asyncio.run(create_goal())
```

**Ответ:**
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

</details>

<details>
<summary><strong>JavaScript (Fetch)</strong></summary>

```javascript
const createGoal = async () => {
  try {
    const response = await fetch('http://localhost:8000/goals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Ремонт квартиры",
        target_amount: 3000000,
        current_savings: 500000,
        target_date: "2026-06-01",
        income: 450000,
        expenses: 300000,
        goal_type: "ремонт"
      })
    });
    
    const data = await response.json();
    console.log(`💰 Monthly payment: ${data.monthly_needed} KZT`);
    console.log(`📈 Progress: ${data.progress_percent}%`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

createGoal();
```

</details>

<details>
<summary><strong>cURL</strong></summary>

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

</details>

### 2️⃣ WebSocket Чат

<details>
<summary><strong>JavaScript (Browser)</strong></summary>

```javascript
// Подключение к WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/chat/1');

ws.onopen = () => {
  console.log('✅ Connected to chat');
  
  // Отправка сообщения
  ws.send(JSON.stringify({
    content: "Какой депозит выбрать для накопления?",
    mode: "mentor"  // mentor, analyst, friend, tech
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'stream') {
    // Streaming response (эффект набора текста)
    document.getElementById('chat').innerHTML += data.reply;
    
    if (data.done) {
      console.log('✅ Message complete');
    }
  } else if (data.error) {
    console.error('❌ Error:', data.error);
  }
};

ws.onclose = () => console.log('❌ Disconnected');
```

</details>

<details>
<summary><strong>Python (websockets)</strong></summary>

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

</details>

### 3️⃣ Подбор банковских продуктов

<details>
<summary><strong>Запрос рекомендаций</strong></summary>

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

**Ответ:**
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

</details>

### 4️⃣ Анализ расходов

<details>
<summary><strong>Загрузка CSV файла</strong></summary>

```bash
curl -X POST http://localhost:8000/analyze_expenses \
  -F "file=@transactions.csv" \
  -F "monthly_income=500000"
```

**Формат CSV:**
```csv
date,amount,description
2025-01-01,10000,Магазин Carrefour
2025-01-02,5000,Такси Uber
2025-01-03,15000,Ресторан Павел's
2025-01-05,2000,Аптека
2025-01-07,30000,Счет за электричество
```

**Ответ:**
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

</details>

### 5️⃣ Аудио транскрибирование

<details>
<summary><strong>Обработка аудио файла</strong></summary>

```bash
curl -X POST http://localhost:8000/audio/transcribe \
  -F "file=@audio.mp3" \
  -F "language=ru"
```

**Поддерживаемые форматы:** mp3, wav, m4a, flac, ogg, webm (макс 25MB)

**Ответ:**
```json
{
  "text": "Здравствуйте! Я хочу начать копить на отпуск в Турции.",
  "filename": "audio.mp3",
  "language": "ru",
  "latency_ms": 2345.67,
  "status": "success"
}
```

</details>

---

## 🧪 Тестирование

### 🚀 Быстрый запуск тестов

```bash
# Все тесты
pytest tests/ -v

# С покрытием кода
pytest tests/ -v --cov=backend --cov-report=html

# Конкретный тест
pytest tests/test_services.py::TestGoalService::test_create_goal_valid -v

# Параллельное выполнение
pytest tests/ -v -n auto
```

### 📊 Покрытие тестами

| Компонент | Покрытие | Статус |
|-----------|----------|--------|
| **Services** | 85% | ✅ |
| **API Routes** | 78% | ✅ |
| **Core Logic** | 92% | ✅ |
| **Overall** | 82% | ✅ |

### 🧪 Доступные тесты

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

✅ test_api.py
  • TestHealthEndpoint - health checks
  • TestGoalsAPI - CRUD операции
  • TestChatAPI - REST и WebSocket
  • TestRecommendationsAPI - подбор продуктов
  • TestAnalyticsAPI - анализ расходов
  • TestAudioAPI - аудио обработка
```

### 📈 Генерация отчетов

```bash
# HTML отчет покрытия
pytest tests/ --cov=backend --cov-report=html

# Открыть отчет
open htmlcov/index.html      # macOS
start htmlcov/index.html     # Windows
xdg-open htmlcov/index.html  # Linux
```

---

## 🔧 Конфигурация

### 📄 .env файл

Создайте файл `.env` в корне проекта:

```bash
# ===== РЕЖИМ РАБОТЫ =====
MOCK_MODE=false           # true для тестов без LLM
DEBUG=true                # Auto-reload для разработки

# ===== OPENAI HUB API =====
OPENAI_HUB_KEY=sk-...     # Ваш API ключ (https://openai-hub.neuraldeep.tech)
OPENAI_HUB_URL=https://openai-hub.neuraldeep.tech
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_ANALYSIS_MODEL=gpt-4o
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_TIMEOUT_SECONDS=30
OPENAI_MAX_RETRIES=3

# ===== БАЗА ДАННЫХ =====
DATABASE_URL=sqlite:///./zaman_assistant.db
# DATABASE_URL=postgresql://user:pass@localhost/zaman_db  # Production

# ===== БЕЗОПАСНОСТЬ =====
ADMIN_TOKEN=supersecret_token  # ⚠️ ОБЯЗАТЕЛЬНО измените!

# ===== ПРОИЗВОДИТЕЛЬНОСТЬ =====
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_SECONDS=3600

# ===== ВЕКТОРНЫЙ ПОИСК =====
EMBEDDINGS_PATH=./data/product_embeddings.pkl
EMBED_DIM=1536

# ===== АУДИО ОБРАБОТКА =====
WHISPER_ENABLED=true
WHISPER_DEFAULT_LANGUAGE=ru
WHISPER_MAX_FILE_SIZE_MB=25
WHISPER_TIMEOUT_SECONDS=300

# ===== REDIS (Production) =====
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# ===== МОНИТОРИНГ =====
SENTRY_DSN=https://your-sentry-dsn
PROMETHEUS_ENABLED=true
```

### 🔧 Переменные окружения

| Переменная | Описание | По умолчанию | Обязательно |
|------------|----------|--------------|-------------|
| `OPENAI_HUB_KEY` | API ключ OpenAI Hub | - | ✅ |
| `DATABASE_URL` | URL базы данных | `sqlite:///./zaman_assistant.db` | ❌ |
| `ADMIN_TOKEN` | Токен администратора | - | ✅ |
| `MOCK_MODE` | Режим без LLM | `false` | ❌ |
| `DEBUG` | Режим отладки | `false` | ❌ |

---

## 🐳 Docker

### 🏆 Рекомендуемый Dockerfile

**`infra/Dockerfile.optimized`** ✅ (выбран для production)

**Преимущества:**
- 🏗️ Multi-stage build (меньше размер образа)
- 🔒 Security scanning с Bandit
- 🎯 Development & Production targets
- 👤 Non-root user для безопасности
- 📊 Resource limits и оптимизация

### 🔨 Сборка образов

```bash
# Development образ
docker build --target development -t zaman-dev .

# Production образ
docker build --target production -t zaman-prod .

# Optimized образ (рекомендуется)
docker build -f infra/Dockerfile.optimized --target production -t zaman:latest .
```

### 🚀 Запуск контейнеров

<details>
<summary><strong>Development</strong></summary>

```bash
docker run -p 8000:8000 \
  -e OPENAI_HUB_KEY=sk-... \
  -e MOCK_MODE=true \
  -v $(pwd)/backend:/app/backend \
  zaman-dev
```

</details>

<details>
<summary><strong>Production</strong></summary>

```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e OPENAI_HUB_KEY=sk-... \
  -e ADMIN_TOKEN=... \
  --memory=2g \
  --cpus=2 \
  zaman:latest
```

</details>

### 📦 Docker Compose

<details>
<summary><strong>Development</strong></summary>

```bash
# Запуск development окружения
docker-compose -f infra/docker-compose.yml up -d

# Просмотр логов
docker-compose logs -f backend

# Остановка
docker-compose down
```

</details>

<details>
<summary><strong>Production</strong></summary>

```bash
# Production с PostgreSQL + Redis
docker-compose -f infra/docker-compose.production.yml up -d

# Production с Monitoring (Prometheus + Grafana)
docker-compose -f infra/docker-compose.enhanced.yml up -d
```

</details>

---

## 🚀 Deployment

### 🐳 Docker Compose (Quick Start)

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

### ☸️ Kubernetes

```bash
# Deploy в Kubernetes
kubectl apply -f k8s/deployment.yaml

# Проверка статуса
kubectl get pods -n zaman-assistant
kubectl logs -f deployment/zaman-backend -n zaman-assistant

# Port forward для локального доступа
kubectl port-forward svc/zaman-backend 8000:8000 -n zaman-assistant
```

### ☁️ AWS ECS (Terraform)

```bash
cd infra/terraform

# Инициализация Terraform
terraform init

# Планирование изменений
terraform plan -var-file=terraform.tfvars

# Применение изменений
terraform apply -var-file=terraform.tfvars

# Получение outputs
terraform output
```

### 🌐 AWS Infrastructure

Terraform конфигурация включает:
- **ECS Cluster** с Fargate
- **Application Load Balancer**
- **RDS PostgreSQL** база данных
- **ElastiCache Redis** кэш
- **CloudWatch** логирование
- **Route 53** DNS

---

## 📊 Мониторинг

### 🏥 Health Check

```bash
curl http://localhost:8000/health
```

**Ответ:**
```json
{
  "status": "healthy",
  "version": "4.0.0",
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

### 📈 Prometheus + Grafana

```bash
# Запуск мониторинга
docker-compose -f infra/docker-compose.enhanced.yml up

# Доступ к сервисам
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
# AlertManager: http://localhost:9093
```

### 📊 Доступные метрики

| Метрика | Описание | Тип |
|---------|----------|-----|
| `http_requests_total` | Общее количество HTTP запросов | Counter |
| `http_request_duration_seconds` | Время выполнения запросов | Histogram |
| `websocket_connections_active` | Активные WebSocket соединения | Gauge |
| `cache_hits_total` | Попадания в кэш | Counter |
| `cache_misses_total` | Промахи кэша | Counter |
| `goals_created_total` | Созданные цели | Counter |
| `chat_messages_total` | Сообщения в чате | Counter |

### 🚨 Алерты

Настроенные алерты:
- **High Error Rate** - >5% ошибок за 5 минут
- **High Response Time** - >2 секунд средний ответ
- **Memory Usage** - >80% использования памяти
- **Disk Space** - <10% свободного места

---

## 🔒 Безопасность

### ✅ Реализованные меры

| Категория | Мера | Статус |
|-----------|------|--------|
| **Rate Limiting** | Per-IP sliding window | ✅ |
| **CORS** | Настроена для production | ✅ |
| **SQL Injection** | SQLAlchemy ORM защита | ✅ |
| **Secrets Management** | AWS SecretManager / .env | ✅ |
| **Docker Security** | Non-root user, multi-stage | ✅ |
| **Container Scanning** | Trivy для уязвимостей | ✅ |
| **HTTPS/TLS** | Через nginx + ACM | ✅ |
| **Input Validation** | Pydantic schemas | ✅ |
| **Authentication** | JWT токены | ✅ |
| **Password Hashing** | Bcrypt | ✅ |

### 🔐 Безопасность API

```python
# Rate limiting
@rate_limit(max_requests=100, window_seconds=3600)
async def protected_endpoint():
    pass

# Input validation
class GoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    target_amount: int = Field(..., gt=0)
    target_date: datetime = Field(..., gt=datetime.now())

# Authentication
@require_auth
async def admin_endpoint(token: str = Depends(get_token)):
    pass
```

### 🛡️ Docker Security

```dockerfile
# Multi-stage build
FROM python:3.11-slim as builder
# ... build stage

FROM python:3.11-slim as production
# Non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# Security scanning
RUN pip install bandit
RUN bandit -r /app/backend/
```

---

## ❓ FAQ

### 🤔 Часто задаваемые вопросы

<details>
<summary><strong>Как получить API ключ OpenAI Hub?</strong></summary>

1. Перейдите на https://openai-hub.neuraldeep.tech
2. Зарегистрируйтесь или войдите в аккаунт
3. Перейдите в раздел "API Keys"
4. Создайте новый ключ
5. Скопируйте ключ в файл `.env`

</details>

<details>
<summary><strong>Как работает MOCK_MODE?</strong></summary>

При `MOCK_MODE=true`:
- LLM запросы возвращают предустановленные ответы
- Не тратятся токены OpenAI
- Идеально для тестирования и разработки
- Все функции работают, кроме реального AI

</details>

<details>
<summary><strong>Как настроить PostgreSQL для production?</strong></summary>

```bash
# 1. Установите PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 2. Создайте базу данных
sudo -u postgres createdb zaman_db

# 3. Создайте пользователя
sudo -u postgres createuser zaman_user

# 4. Обновите .env
DATABASE_URL=postgresql://zaman_user:password@localhost/zaman_db
```

</details>

<details>
<summary><strong>Как масштабировать приложение?</strong></summary>

1. **Горизонтальное масштабирование:**
   ```bash
   # Kubernetes
   kubectl scale deployment zaman-backend --replicas=3
   ```

2. **Вертикальное масштабирование:**
   ```bash
   # Docker
   docker run --memory=4g --cpus=4 zaman:latest
   ```

3. **Кэширование:**
   ```bash
   # Redis cluster
   docker-compose -f infra/docker-compose.production.yml up
   ```

</details>

<details>
<summary><strong>Как отладить проблемы с WebSocket?</strong></summary>

1. Проверьте подключение:
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/ws/chat/1');
   ws.onerror = (error) => console.error('WebSocket error:', error);
   ```

2. Проверьте логи:
   ```bash
   docker-compose logs -f backend
   ```

3. Проверьте health:
   ```bash
   curl http://localhost:8000/health
   ```

</details>

<details>
<summary><strong>Как добавить новые банковские продукты?</strong></summary>

1. Отредактируйте `backend/products.json`
2. Пересоздайте embeddings:
   ```bash
   python backend/embeddings.py
   ```
3. Перезапустите приложение

</details>

### 🆘 Решение проблем

| Проблема | Решение |
|----------|---------|
| **Ошибка подключения к OpenAI** | Проверьте API ключ и интернет соединение |
| **Медленная работа** | Включите кэширование и проверьте Redis |
| **Ошибки в логах** | Проверьте переменные окружения в `.env` |
| **WebSocket не работает** | Проверьте CORS настройки и прокси |
| **Тесты не проходят** | Убедитесь что `MOCK_MODE=true` |

---

## 🤝 Вклад в проект

### 🚀 Как внести вклад

1. **Fork** репозиторий
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** изменения (`git commit -m 'Add amazing feature'`)
4. **Push** в branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### 📝 Code Style

- **Python:** PEP 8, Black, flake8
- **JavaScript:** ESLint, Prettier
- **Commits:** Conventional Commits
- **Tests:** Покрытие >80%

### 🧪 Перед отправкой PR

```bash
# Запустите тесты
pytest tests/ -v

# Проверьте код
black backend/
flake8 backend/

# Проверьте frontend
cd frontend
npm run lint
npm run build
```

---

## 📚 Дополнительные ресурсы

### 📖 Документация

- **FastAPI:** https://fastapi.tiangolo.com
- **SQLAlchemy:** https://www.sqlalchemy.org
- **Pydantic:** https://docs.pydantic.dev
- **React:** https://reactjs.org/docs
- **OpenAI Hub:** https://openai-hub.neuraldeep.tech

### 🏦 Банковские ресурсы

- **Zaman Bank:** https://zamanbank.kz
- **API документация:** http://localhost:8000/docs
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### 🛠️ Инструменты разработки

- **Docker:** https://docs.docker.com
- **Kubernetes:** https://kubernetes.io/docs
- **Terraform:** https://terraform.io/docs
- **Prometheus:** https://prometheus.io/docs

---

## 📝 Changelog

### 🎉 v4.0.0 (2025-01-18) - Major Refactor

**✨ Новые возможности:**
- 🏗️ Service layer архитектура с dependency injection
- 🧪 Comprehensive unit тесты (>80% coverage)
- ⚡ Thread-safe кэш с namespace поддержкой
- 🎤 Whisper Audio API интеграция
- 🐳 Enhanced Docker (multi-stage build)
- 🔒 Production-ready конфигурация безопасности

**🔧 Улучшения:**
- 📊 Улучшенная аналитика расходов
- 💬 Оптимизированный WebSocket чат
- 🎯 Более точные рекомендации продуктов
- 📈 Расширенный мониторинг

**🐛 Исправления:**
- Исправлены race conditions в кэше
- Улучшена обработка ошибок WebSocket
- Оптимизированы запросы к базе данных

### 📈 v3.1.0 (2025-01-15)
- WebSocket поддержка для real-time чата
- FAQ responses с кэшированием
- Улучшенная система рекомендаций

### 🚀 v3.0.0 (2025-01-10)
- Первая стабильная версия
- Базовая функциональность финансового ассистента

---

## 📄 License

MIT License - см. файл [LICENSE](LICENSE)

---

## 🆘 Support

### 📞 Контакты

- **Issues:** [GitHub Issues](https://github.com/yourorg/zaman_assistant/issues)
- **Email:** support@zamanbank.kz
- **API Docs:** http://localhost:8000/docs
- **Telegram:** [@zaman_dev_support](https://t.me/zaman_dev_support)

### 👥 Команда

- **Backend Lead:** Backend Team
- **ML Engineer:** ML Team  
- **DevOps:** DevOps Team
- **Frontend:** Frontend Team

---

<div align="center">

**Built with ❤️ for Zaman Bank**

[![Made in Kazakhstan](https://img.shields.io/badge/Made%20in-Kazakhstan-blue?style=for-the-badge)](https://zamanbank.kz)

</div>