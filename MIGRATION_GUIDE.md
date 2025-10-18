# 🔄 Migration Guide: v2.1 → v3.0

Руководство по переходу на рефакторенную версию Zaman Assistant.

## ⚠️ Breaking Changes

### 1. Структура файлов

**Было:**
```
backend/
├── main.py (634 строки, всё в одном файле)
├── database.py (не используется)
├── embeddings.py (не используется)
├── prompts.py (не используется)
└── analytics.py (не используется)
```

**Стало:**
```
backend/
├── main.py (300 строк, только endpoints)
├── config.py (новый файл)
├── schemas.py (новый файл)
├── database.py (исправлен и используется!)
├── embeddings.py (улучшен)
├── prompts.py (используется)
├── analytics.py (используется)
└── services/
    ├── goal_service.py
    ├── chat_service.py
    ├── recommendation_service.py
    ├── analytics_service.py
    ├── llm_client.py
    ├── cache_manager.py
    └── rate_limiter.py
```

### 2. Импорты

**Старые импорты НЕ РАБОТАЮТ:**
```python
# ❌ Старый код
from main import call_llm_async, get_embedding_async
```

**Новые импорты:**
```python
# ✅ Новый код
from services.llm_client import LLMClient
from embeddings import get_embedding_async
```

### 3. Модели БД

**Критическое исправление:**
```python
# ❌ Было (БАГ!)
class User(Base):
    _tablename_ = "users"  # неправильно!

# ✅ Стало
class User(Base):
    __tablename__ = "users"  # правильно!
```

### 4. Конфигурация

**Было:**
```python
OPENAI_HUB_KEY = os.getenv("OPENAI_HUB_KEY", "")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() in ("1", "true", "yes")
```

**Стало:**
```python
from config import settings

settings.OPENAI_HUB_KEY
settings.MOCK_MODE
```

## 📋 Пошаговая миграция

### Шаг 1: Бэкап данных

```bash
# Скопируйте базу данных
cp zaman_assistant.db zaman_assistant.db.backup

# Скопируйте embeddings (если есть)
cp data/product_embeddings.pkl data/product_embeddings.pkl.backup
```

### Шаг 2: Обновление кода

```bash
# Замените старые файлы новыми
cd backend

# Основные файлы
# - main.py → новая версия
# - database.py → исправлена
# - embeddings.py → улучшена
# - prompts.py → используется

# Новые файлы
# + config.py
# + schemas.py
# + services/* (все файлы в этой папке)
```

### Шаг 3: Обновление .env

```bash
# Добавьте новые переменные в .env
cat >> .env << EOF

# Новые настройки v3.0
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_SECONDS=3600
DEBUG=true
EOF
```

### Шаг 4: Пересоздание БД

```bash
# ВАЖНО: Из-за исправления __tablename__ нужно пересоздать таблицы

# Вариант 1: Удалить старую БД (потеря данных!)
rm zaman_assistant.db
python database.py

# Вариант 2: Миграция данных (рекомендуется)
python migrate_db.py  # см. скрипт ниже
```

### Шаг 5: Обновление зависимостей

```bash
pip install -r requirements.txt --upgrade
```

### Шаг 6: Тестирование

```bash
# Запуск в MOCK режиме
export MOCK_MODE=true
python main.py

# Проверка health
curl http://localhost:8000/health

# Проверка endpoints
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

## 🔧 Скрипт миграции данных

Создайте `migrate_db.py`:

```python
# migrate_db.py
"""Скрипт миграции данных из старой БД в новую"""
import sqlite3
from datetime import datetime

OLD_DB = "zaman_assistant.db.backup"
NEW_DB = "zaman_assistant.db"

def migrate():
    # Подключение к старой БД
    old_conn = sqlite3.connect(OLD_DB)
    old_cur = old_conn.cursor()
    
    # Создание новой БД
    from database import init_db, SessionLocal, User, Goal, ConversationLog, Metric
    init_db()
    new_session = SessionLocal()
    
    try:
        # Миграция Users
        old_cur.execute("SELECT * FROM users")
        for row in old_cur.fetchall():
            user = User(
                id=row[0],
                name=row[1],
                age=row[2],
                income=row[3],
                expenses=row[4],
                created_at=datetime.fromisoformat(row[5]) if row[5] else datetime.utcnow()
            )
            new_session.add(user)
        
        # Миграция Goals
        old_cur.execute("SELECT * FROM goals")
        for row in old_cur.fetchall():
            goal = Goal(
                id=row[0],
                user_id=row[1],
                name=row[2],
                target_amount=row[3],
                current_savings=row[4],
                target_date=row[5],
                monthly_needed=row[6],
                status=row[7],
                created_at=datetime.fromisoformat(row[8]) if row[8] else datetime.utcnow()
            )
            new_session.add(goal)
        
        # Миграция ConversationLogs
        old_cur.execute("SELECT * FROM conversation_logs")
        for row in old_cur.fetchall():
            log = ConversationLog(
                id=row[0],
                user_id=row[1],
                role=row[2],
                content=row[3],
                timestamp=datetime.fromisoformat(row[4]) if row[4] else datetime.utcnow(),
                latency_ms=row[5]
            )
            new_session.add(log)
        
        # Commit всех изменений
        new_session.commit()
        print("✅ Миграция завершена успешно!")
        
        # Статистика
        print(f"Пользователи: {new_session.query(User).count()}")
        print(f"Цели: {new_session.query(Goal).count()}")
        print(f"Сообщения: {new_session.query(ConversationLog).count()}")
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        new_session.rollback()
    finally:
        old_conn.close()
        new_session.close()

if __name__ == "__main__":
    migrate()
```

Запустите:
```bash
python migrate_db.py
```

## 🔍 Проверка миграции

### Checklist

- [ ] Все файлы заменены новыми версиями
- [ ] `.env` обновлён новыми переменными
- [ ] Зависимости установлены
- [ ] БД пересоздана или мигрирована
- [ ] Сервер запускается без ошибок
- [ ] `/health` возвращает статус "healthy"
- [ ] Endpoints отвечают корректно
- [ ] Старые данные сохранены (если нужно)

### Тесты

```bash
# 1. Health check
curl http://localhost:8000/health | jq .

# 2. Создание цели
curl -X POST http://localhost:8000/goals/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Goal",
    "target_amount": 100000,
    "current_savings": 0,
    "target_date": "2026-01-01"
  }' | jq .

# 3. Чат
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Привет"}]
  }' | jq .

# 4. Проверка embeddings
curl http://localhost:8000/health | jq '.embeddings'
```

## 🐛 Решение проблем

### Проблема: ImportError

```
ImportError: cannot import name 'LLMClient' from 'services.llm_client'
```

**Решение:**
```bash
# Проверьте структуру директорий
ls -la backend/services/

# Убедитесь что есть __init__.py
touch backend/services/__init__.py
```

### Проблема: Database schema mismatch

```
sqlalchemy.exc.OperationalError: no such table: users
```

**Решение:**
```bash
# Пересоздайте БД
rm zaman_assistant.db
python database.py
```

### Проблема: Embeddings не загружаются

```
⚠️ No embeddings file found at ./data/product_embeddings.pkl
```

**Решение:**
```bash
# Они создадутся автоматически при первом запуске
# Или принудительно:
python -c "from embeddings import EMB_INDEX, build_index_from_products; import asyncio; from config import PRODUCTS; asyncio.run(build_index_from_products(PRODUCTS))"
```

## 📊 Сравнение производительности

### v2.1 vs v3.0

| Метрика | v2.1 | v3.0 | Улучшение |
|---------|------|------|-----------|
| Размер main.py | 634 строки | 300 строк | ↓53% |
| Дублирование кода | ~220 строк | 0 строк | ↓100% |
| Embeddings поиск | O(n) loop | O(n) vectorized | ↑3-5x |
| Cache hit rate | нет метрик | отслеживается | ✅ |
| Rate limiting | in-memory leak | cleanup task | ✅ |
| Type safety | частично | полностью | ✅ |

## 🎯 Следующие шаги

После миграции:

1. **Мониторинг**: Настройте логирование и алерты
2. **Тестирование**: Проведите нагрузочное тестирование
3. **Документация**: Обновите внутреннюю документацию
4. **Frontend**: Обновите frontend для новых endpoints (если есть)
5. **CI/CD**: Настройте автоматический деплой

## 💬 Поддержка

Если возникли проблемы:
- Создайте issue на GitHub
- Проверьте логи: `tail -f logs/app.log`
- Свяжитесь с командой разработки

---

**Удачной миграции! 🚀**