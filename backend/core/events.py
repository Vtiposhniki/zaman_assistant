# core/events.py - Application Lifecycle Events
"""
Startup и shutdown handlers.
Инициализация БД, embeddings, фоновых задач.
"""
import asyncio
import logging

from database import init_db
from embeddings import EMB_INDEX, build_index_from_products
from config import settings, PRODUCTS
from api.dependencies import get_services_manager

logger = logging.getLogger("events")


async def startup_handler():
    """Инициализация при запуске приложения"""
    logger.info("🚀 Starting Zaman Assistant v3.1")
    
    # 1. Инициализация БД
    try:
        init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Database init failed: {e}")
        raise
    
    # 2. Загрузка продуктов и embeddings
    if PRODUCTS:
        logger.info(f"📦 Loading embeddings for {len(PRODUCTS)} products...")
        asyncio.create_task(build_index_from_products(PRODUCTS))
    else:
        logger.warning("⚠️ No products loaded from products.json")
    
    # 3. Инициализация сервисов
    services_manager = get_services_manager()
    logger.info("✅ Services manager initialized")
    
    # 4. Запуск фоновых задач
    asyncio.create_task(services_manager.rate_limiter.cleanup_task())
    asyncio.create_task(services_manager.cache_manager.cleanup_task())
    logger.info("✅ Background tasks started")
    
    # 5. Конфигурация
    logger.info(f"🔧 MOCK_MODE: {settings.MOCK_MODE}")
    logger.info(f"💾 Database: {settings.DATABASE_URL.split('?')[0]}")  # Hide credentials
    logger.info(f"🎤 Whisper: {'Enabled' if settings.WHISPER_ENABLED else 'Disabled'}")
    
    logger.info("✅ Zaman Assistant ready!")


async def shutdown_handler():
    """Graceful shutdown"""
    logger.info("🛑 Shutting down Zaman Assistant...")
    
    # Сохранение embeddings
    if EMB_INDEX.index:
        try:
            EMB_INDEX.save()
            logger.info("💾 Embeddings saved")
        except Exception as e:
            logger.error(f"Failed to save embeddings: {e}")
    
    logger.info("✅ Shutdown complete")