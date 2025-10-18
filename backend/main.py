# main.py — ZAMAN Assistant Entry Point (Refactored v4.0)
"""
Точка входа приложения.
Теперь использует модульную архитектуру из core/ и api/routes/
"""
import uvicorn
from core.app import create_app

# Создаём приложение через фабрику
app = create_app()

if __name__ == "__main__":
    import os
    from config import settings
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=settings.DEBUG,
        log_level="info"
    )