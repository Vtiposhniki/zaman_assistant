# 📘 Zaman Assistant API Cheatsheet

Быстрая справка по всем endpoints.

## 🏥 Health & Status

### GET /health
Проверка состояния системы
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "database": { "connected": true, "total_goals": 10 },
  "embeddings": { "loaded": 7, "ready": true }
}
```

---

## 🎯 Goals API

### POST /goals/create
Создание финансовой цели с AI-советами

```bash
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Отпуск в Турции",
    "target_amount": 1000000,
    "current_savings": 200000,
    "target_date": "2026-07-01",
    "user_id": 1,
    "income": 500000,
    "expenses": 350000,
    "goal_type": "отпуск"
  }'
```

### GET /goals
Список целей (с фильтрами)

```bash
# Все цели
curl http://localhost:8000/goals

# Цели пользователя
curl "http://localhost:8000/goals?user_id=1"

# Активные цели
curl "http://localhost:8000/goals?status=active"

# Комбинация
curl "http://localhost:8000/goals?user_id=1&status=active"
```

### PUT /goals/{id}
Обновление прогресса

```bash
curl -X PUT http://localhost:8000/goals/1 \
  -H "Content-Type: application/json" \
  -d '{"current_savings": 300000}'
```

### DELETE /goals/{id}
Удаление цели (soft delete)

```bash
curl -X DELETE http://localhost:8000/goals/1
```

---

## 💬 Chat API

### POST /chat
REST API чат

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Как начать копить?"}
    ],
    "user_id": 1
  }'
```

Response:
```json
{
  "reply": "Отлично! Начните с простого: ...",
  "latency_ms": 234.5,
  "from_cache": false,
  "type": "llm"
}
```

### WS /ws/chat/{user_id}
WebSocket real-time чат

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat/1');

ws.onopen = () => {
  ws.send(JSON.stringify({
    content: "Помоги создать бюджет"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: "faq" | "cached" | "stream"
  // data.content: часть ответа
  // data.done: true когда завершено
};
```

---

## 🎁 Recommendations API

### POST /recommend
Подбор продуктов для цели

```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "goal_amount": 5000000,
    "months": 24,
    "age": 30,
    "goal_type": "образование",
    "use_semantic_search": true
  }'
```

Response:
```json
{
  "recommendations": [
    {
      "product": {
        "id": "prod_5",
        "name": "Выгодный",
        "type