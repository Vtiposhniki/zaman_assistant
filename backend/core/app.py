# core/app.py - FastAPI Application Factory
"""
Создание и конфигурация FastAPI приложения.
Принцип: один файл = одна ответственность.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from core.events import startup_handler, shutdown_handler
from api.routes import (
    goals_router,
    chat_router,
    products_router,
    analytics_router,
    audio_router,
    health_router,
    admin_router
)


def create_app() -> FastAPI:
    """
    Фабрика приложения.
    Вызывается из main.py для получения app instance.
    
    Returns:
        FastAPI: Сконфигурированное приложение
    """
    # Создание приложения
    app = FastAPI(
        title="Zaman Assistant API",
        version="3.1.0",
        description="AI-powered финансовый ассистент для Zaman Bank",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # В production указать конкретные домены
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    
    # Регистрация роутеров
    app.include_router(health_router, tags=["Health"])
    app.include_router(goals_router, prefix="/goals", tags=["Goals"])
    app.include_router(chat_router, prefix="/chat", tags=["Chat"])
    app.include_router(products_router, prefix="/products", tags=["Products"])
    app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
    app.include_router(audio_router, prefix="/audio", tags=["Audio"])
    app.include_router(admin_router, prefix="/admin", tags=["Admin"])
    
    # Event handlers
    app.add_event_handler("startup", startup_handler)
    app.add_event_handler("shutdown", shutdown_handler)
    
    return app