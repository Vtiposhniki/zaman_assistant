# api/routes/__init__.py - Router Aggregator
"""
Экспорт всех роутеров для удобного импорта в app.py.
"""
from api.routes.goals import router as goals_router
# from api.routes.redis_goals import router as redis_goals_router
from api.routes.chat import router as chat_router
from api.routes.products import router as products_router
from api.routes.analytics import router as analytics_router
from api.routes.audio import router as audio_router
from api.routes.health import router as health_router
from api.routes.admin import router as admin_router

__all__ = [
    "goals_router",
    "redis_goals_router",
    "chat_router",
    "products_router",
    "analytics_router",
    "audio_router",
    "health_router",
    "admin_router"
]