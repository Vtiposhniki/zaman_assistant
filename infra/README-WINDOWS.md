# 🪟 Zaman Assistant - Запуск в Windows

> Пошаговое руководство для Windows 10/11

---

## ⚡ Быстрый старт (3 способа)

### 1️⃣ Самый простой (BAT файл)

```cmd
quick-start.bat
```

Этот скрипт автоматически:
- ✅ Проверит Docker
- ✅ Создаст `.env` файл
- ✅ Соберёт образы
- ✅ Запустит сервисы
- ✅ Проверит работоспособность

### 2️⃣ PowerShell скрипт

```powershell
# Разрешить выполнение скриптов (один раз)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Запуск
.\docker-run.ps1 start
```

### 3️⃣ Вручную через docker-compose

```cmd
cd infra
docker-compose up -d
```

---

## 📋 Требования

### Обязательно

- ✅ **Windows 10/11** (Pro, Enterprise или Education для Hyper-V)
- ✅ **Docker Desktop** - [Скачать](https://www.docker.com/products/docker-desktop/)
- ✅ **WSL 2** (рекомендуется) или Hyper-V
- ✅ **4GB RAM** минимум
- ✅ **10GB** свободного места

### Опционально

- Git for Windows
- PowerShell 7+ (для цветного вывода)
- Windows Terminal (удобнее)

---

## 🔧 Установка Docker Desktop

1. **Скачайте** Docker Desktop: https://www.docker.com/products/docker-desktop/

2. **Установите** с настройками по умолчанию

3. **Включите WSL 2** (если не включен):
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```

4. **Перезагрузите** компьютер

5. **Запустите** Docker Desktop
   - Подождите пока появится зелёный статус
   - Проверьте: `docker --version`

---

## 🚀 Пошаговая установка

### Шаг 1: Клонирование проекта

```cmd
git clone https://github.com/yourorg/zaman_assistant.git
cd zaman_assistant
```

Или скачайте ZIP и распакуйте.

### Шаг 2: Конфигурация

```cmd
REM Создать .env файл
copy backend\.env.example .env

REM Отредактировать в Блокноте
notepad .env
```

**Минимальная конфигурация:**
```env
OPENAI_HUB_KEY=sk-ваш-ключ-здесь
ADMIN_TOKEN=случайная-строка-32-символа
MOCK_MODE=false
DEBUG=true
```

💡 **Для тестов без API ключа** - оставьте `MOCK_MODE=true`

### Шаг 3: Запуск

**Вариант A: BAT файл**
```cmd
quick-start.bat
```

**Вариант B: PowerShell**
```powershell
.\docker-run.ps1 start
```

**Вариант C: docker-compose**
```cmd
cd infra
docker-compose build
docker-compose up -d
```

### Шаг 4: Проверка

Откройте браузер:
- API: http://localhost:8000/health
- Docs: http://localhost:8000/docs

Или в терминале:
```cmd
curl http://localhost:8000/health
```

---

## 📝 Основные команды

### PowerShell скрипт (рекомендуется)

```powershell
.\docker-run.ps1 start      # Запустить
.\docker-run.ps1 stop       # Остановить
.\docker-run.ps1 restart    # Перезапустить
.\docker-run.ps1 logs       # Показать логи
.\docker-run.ps1 health     # Проверка состояния
.\docker-run.ps1 shell      # Войти в контейнер
.\docker-run.ps1 clean      # Полная очистка (ОПАСНО!)
```

### docker-compose напрямую

```cmd
REM Запуск
docker-compose -f infra\docker-compose.yml up -d

REM Остановка
docker-compose -f infra\docker-compose.yml down

REM Логи
docker-compose -f infra\docker-compose.yml logs -f

REM Статус
docker-compose -f infra\docker-compose.yml ps

REM Перезапуск одного сервиса
docker-compose -f infra\docker-compose.yml restart backend
```

### Полезные команды Docker

```cmd
REM Статус контейнеров
docker ps

REM Использование ресурсов
docker stats

REM Логи backend
docker logs zaman-backend -f

REM Shell в контейнере
docker exec -it zaman-backend /bin/bash

REM Очистка
docker system prune -a --volumes
```

---

## 🧪 Тестирование

### Запуск тестов

```cmd
docker-compose -f infra\docker-compose.test.yml up --abort-on-container-exit
```

### Ручная проверка API

```powershell
# Health check
Invoke-RestMethod http://localhost:8000/health | ConvertTo-Json

# Создание цели
$body = @{
    name = "Тестовая цель"
    target_amount = 1000000
    current_savings = 100000
    target_date = "2026-12-31"
    income = 500000
    expenses = 300000
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/goals/create `
    -ContentType "application/json" -Body $body | ConvertTo-Json

# Чат
$chatBody = @{
    messages = @(
        @{ role = "user"; content = "Как начать копить?" }
    )
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/chat `
    -ContentType "application/json" -Body $chatBody | ConvertTo-Json
```

---

## 🐛 Troubleshooting (Windows-специфичные проблемы)

### Проблема: "Docker not running"

**Решение:**
```cmd
REM 1. Запустить Docker Desktop вручную
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

REM 2. Подождать 30 секунд

REM 3. Проверить
docker ps
```

### Проблема: "Порт 8000 занят"

**Найти процесс:**
```cmd
netstat -ano | findstr :8000
```

**Убить процесс:**
```cmd
taskkill /PID <номер_процесса> /F
```

**Или изменить порт:**
```yaml
# В infra\docker-compose.yml
ports:
  - "8001:8000"  # Используем 8001 вместо 8000
```

### Проблема: "Access denied" при монтировании volumes

**Решение:**
```cmd
REM 1. Открыть Docker Desktop
REM 2. Settings → Resources → File Sharing
REM 3. Добавить диск C:\ (или где проект)
REM 4. Apply & Restart
```

### Проблема: Line endings (CRLF vs LF)

**Симптомы:**
```
/bin/bash^M: bad interpreter
```

**Решение:**
```cmd
REM Настроить Git для правильных переводов строк
git config --global core.autocrlf input
git config --global core.eol lf

REM Переклонировать проект
cd ..
rmdir /s /q zaman_assistant
git clone https://github.com/yourorg/zaman_assistant.git
```

### Проблема: WSL 2 ошибки

**Решение:**
```powershell
# Обновить WSL
wsl --update

# Перезапустить WSL
wsl --shutdown

# Проверить версию
wsl -l -v

# Должно быть VERSION 2, если нет:
wsl --set-version Ubuntu 2
```

### Проблема: "Cannot connect to PostgreSQL"

**Проверка:**
```cmd
REM 1. Проверить что PostgreSQL запущен
docker ps | findstr postgres

REM 2. Проверить логи
docker logs zaman-postgres

REM 3. Пересоздать контейнер
docker-compose -f infra\docker-compose.yml down -v
docker-compose -f infra\docker-compose.yml up -d
```

### Проблема: "Out of memory" / "No space left on device"

**Решение:**
```cmd
REM 1. Очистить неиспользуемые образы
docker system prune -a

REM 2. Увеличить memory в Docker Desktop
REM    Settings → Resources → Advanced → Memory: 4GB+

REM 3. Очистить WSL disk
wsl --shutdown
REM Затем: Optimize-VHD в PowerShell (admin)
```

### Проблема: Медленная работа

**Оптимизация:**
```yaml
# В docker-compose.yml добавить:
services:
  backend:
    volumes:
      # Delegated mode для Windows
      - ../backend:/app/backend:delegated
```

**Или использовать без volume mounting:**
```yaml
# Закомментировать строку:
# - ../backend:/app/backend:rw
```

### Проблема: Healthcheck fails

**Проверка:**
```cmd
REM 1. Подождать дольше (первый запуск медленный)
timeout /t 60

REM 2. Проверить вручную
curl http://localhost:8000/health

REM 3. Проверить логи
docker logs zaman-backend --tail 50

REM 4. Зайти в контейнер
docker exec -it zaman-backend /bin/bash
curl localhost:8000/health
```

---

## 📊 Мониторинг

### Docker Desktop Dashboard

Самый простой способ:
1. Открыть Docker Desktop
2. Перейти в Containers
3. Кликнуть на `zaman-backend`
4. Вкладки: Logs, Stats, Files

### PowerShell мониторинг

```powershell
# Статус
.\docker-run.ps1 health

# Использование ресурсов
docker stats --no-stream

# Логи в реальном времени
docker-compose -f infra\docker-compose.yml logs -f backend
```

### Веб-интерфейсы

После запуска доступны:
- **API**: http://localhost:8000
- **Swagger**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health**: http://localhost:8000/health

---

## 💾 Backup и Restore

### Backup базы данных

```cmd
REM Вручную
docker exec -i zaman-postgres pg_dump -U zaman zaman_db > backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql

REM Через PowerShell (красивее)
```

```powershell
$date = Get-Date -Format "yyyyMMdd_HHmmss"
docker exec -i zaman-postgres pg_dump -U zaman zaman_db | Out-File -Encoding UTF8 "backup_$date.sql"
Write-Host "Backup saved to backup_$date.sql"
```

### Restore из backup

```cmd
REM Через cmd
type backup.sql | docker exec -i zaman-postgres psql -U zaman -d zaman_db

REM Через PowerShell
Get-Content backup.sql | docker exec -i zaman-postgres psql -U zaman -d zaman_db
```

### Автоматический backup (Task Scheduler)

Создайте файл `backup-task.bat`:
```batch
@echo off
cd C:\path\to\zaman_assistant
powershell -Command "$date = Get-Date -Format 'yyyyMMdd_HHmmss'; docker exec -i zaman-postgres pg_dump -U zaman zaman_db | Out-File -Encoding UTF8 'backups\backup_$date.sql'"
```

Затем в Task Scheduler:
1. Создать задачу
2. Триггер: Ежедневно в 2:00 AM
3. Действие: Запустить `backup-task.bat`

---

## 🔧 Конфигурация

### .env файл (основные параметры)

```env
# ===== API KEYS =====
OPENAI_HUB_KEY=sk-your-key-here
OPENAI_HUB_URL=https://openai-hub.neuraldeep.tech

# ===== ADMIN =====
ADMIN_TOKEN=your-strong-random-token-32-chars

# ===== DATABASE =====
# Автоматически задано в docker-compose.yml
# DATABASE_URL=postgresql://zaman:zamanpass@postgres:5432/zaman_db

# ===== MODES =====
MOCK_MODE=false         # true = тесты без API
DEBUG=true              # false в production

# ===== PERFORMANCE =====
CACHE_TTL_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_SECONDS=3600
```

### Профили docker-compose

**Базовый** (Backend + PostgreSQL):
```cmd
docker-compose -f infra\docker-compose.yml up -d
```

**Full** (+ Redis cache):
```cmd
docker-compose -f infra\docker-compose.yml --profile full up -d
```

**Production** (+ Nginx):
```cmd
docker-compose -f infra\docker-compose.yml --profile production up -d
```

---

## 🌐 Доступ из локальной сети

По умолчанию API доступен только на `localhost`. Для доступа с других устройств:

### 1. Узнать IP адрес

```cmd
ipconfig | findstr IPv4
```

### 2. Открыть порт в Firewall

```powershell
# Через PowerShell (от администратора)
New-NetFirewallRule -DisplayName "Zaman Assistant API" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### 3. Доступ с других устройств

```
http://192.168.x.x:8000/health
```

⚠️ **Безопасность**: Используйте Nginx с SSL для внешнего доступа!

---

## 🚀 Production Deployment

### Рекомендации для Windows Server

1. **Используйте Windows Server 2019/2022**
2. **Установите Docker EE** (Enterprise Edition)
3. **Настройте SSL через Nginx**
4. **Включите профиль production**

```cmd
REM Production запуск
docker-compose -f infra\docker-compose.yml --profile production up -d
```

5. **Настройте автозапуск через Task Scheduler**
6. **Настройте мониторинг** (Prometheus + Grafana)
7. **Регулярные backups**

### Checklist перед production

- [ ] Смените `ADMIN_TOKEN` на случайный
- [ ] `MOCK_MODE=false`
- [ ] `DEBUG=false`
- [ ] Сильные пароли для PostgreSQL
- [ ] SSL сертификаты настроены
- [ ] Firewall правила
- [ ] Backup автоматизирован
- [ ] Мониторинг настроен
- [ ] Resource limits установлены

---

## 📚 Дополнительные ресурсы

### Документация

- [Docker Desktop для Windows](https://docs.docker.com/desktop/windows/)
- [WSL 2 Setup](https://docs.microsoft.com/en-us/windows/wsl/install)
- [API Documentation](http://localhost:8000/docs)
- [Основной README](README.md)

### Полезные ссылки

- [Docker Desktop Download](https://www.docker.com/products/docker-desktop/)
- [Visual Studio Code](https://code.visualstudio.com/) - удобный редактор
- [Windows Terminal](https://aka.ms/terminal) - современный терминал
- [Git for Windows](https://git-scm.com/download/win)

### Community

- GitHub Issues: https://github.com/yourorg/zaman_assistant/issues
- Email: ai-team@zamanbank.kz
- Telegram: @zaman_dev_support

---

## 🎓 Примеры использования

### PowerShell

```powershell
# Health check
$response = Invoke-RestMethod http://localhost:8000/health
$response | ConvertTo-Json -Depth 3

# Создание цели
$goal = @{
    name = "Отпуск в Турции"
    target_amount = 1000000
    current_savings = 200000
    target_date = "2026-07-01"
    income = 500000
    expenses = 350000
} | ConvertTo-Json

$result = Invoke-RestMethod -Method Post `
    -Uri http://localhost:8000/goals/create `
    -ContentType "application/json" `
    -Body $goal

$result | ConvertTo-Json -Depth 3

# Список целей
Invoke-RestMethod http://localhost:8000/goals | ConvertTo-Json

# Чат
$chat = @{
    messages = @(
        @{ role = "user"; content = "Какой депозит выбрать?" }
    )
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
    -Uri http://localhost:8000/chat `
    -ContentType "application/json" `
    -Body $chat
```

### Python (из Windows)

```python
import requests

# Health check
health = requests.get("http://localhost:8000/health").json()
print(health)

# Создание цели
goal_data = {
    "name": "Новая машина",
    "target_amount": 5000000,
    "current_savings": 500000,
    "target_date": "2027-01-01",
    "income": 600000,
    "expenses": 400000
}

response = requests.post(
    "http://localhost:8000/goals/create",
    json=goal_data
)
print(response.json())

# Рекомендации
recommend_data = {
    "goal_amount": 3000000,
    "months": 24,
    "goal_type": "образование"
}

response = requests.post(
    "http://localhost:8000/recommend",
    json=recommend_data
)
print(response.json())
```

---

## ❓ FAQ

**Q: Нужен ли Docker Desktop Pro?**  
A: Нет, бесплатной версии достаточно для разработки.

**Q: Можно ли запустить без WSL 2?**  
A: Да, через Hyper-V, но WSL 2 быстрее и эффективнее.

**Q: Сколько RAM требуется?**  
A: Минимум 4GB, рекомендуется 8GB+.

**Q: Работает ли на Windows 10 Home?**  
A: Да, через WSL 2 (не требует Hyper-V Pro).

**Q: Как обновить приложение?**  
A: `git pull && docker-compose build --no-cache && docker-compose up -d`

**Q: Безопасно ли оставлять запущенным?**  
A: Для разработки - да. Для production - настройте SSL и firewall.

**Q: Как ускорить работу?**  
A: 1) Закройте volume mounting 2) Увеличьте RAM для Docker 3) Используйте SSD

---

## 📞 Поддержка

Если возникли проблемы:

1. **Проверьте [Troubleshooting](#-troubleshooting-windows-специфичные-проблемы)**
2. **Посмотрите логи**: `docker-compose -f infra\docker-compose.yml logs`
3. **Создайте issue**: [GitHub](https://github.com/yourorg/zaman_assistant/issues)
4. **Email**: ai-team@zamanbank.kz

---

## 📄 Лицензия

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  <b>🎉 Готово к работе в Windows!</b><br>
  <i>Built with ❤️ for Zaman Bank</i><br>
  <img src="https://img.shields.io/badge/Windows-Ready-blue?logo=windows" alt="Windows Ready">
  <img src="https://img.shields.io/badge/Docker-Enabled-blue?logo=docker" alt="Docker">
</p>