# api/dependencies.py - Dependency Injection
"""
Централизованное управление зависимостями для FastAPI endpoints.
Используется через Depends().
"""
from typing import Optional
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database import get_db
from services.cache_manager import CacheManager
from services.llm_client import LLMClient
from services.goal_service import GoalService
from services.chat_service import ChatService
from services.recommendation_service import RecommendationService
from services.analytics_service import AnalyticsService
from services.whisper_service import WhisperService
from services.rate_limiter import RateLimiter
from config import settings


# ===== SINGLETON INSTANCES =====
class ServicesManager:
    """
    Singleton менеджер всех сервисов.
    Инициализируется один раз при старте приложения.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Инициализация всех сервисов"""
        self.cache_manager = CacheManager(ttl_seconds=settings.CACHE_TTL_SECONDS)
        
        self.llm_client = LLMClient(
            url=settings.OPENAI_HUB_URL,
            api_key=settings.OPENAI_HUB_KEY,
            mock_mode=settings.MOCK_MODE
        )
        
        self.rate_limiter = RateLimiter(
            max_requests=settings.RATE_LIMIT_MAX_REQUESTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS
        )
        
        self.whisper_service = WhisperService(
            url=settings.OPENAI_HUB_URL,
            api_key=settings.OPENAI_HUB_KEY,
            mock_mode=settings.MOCK_MODE
        )


# Singleton instance
_services_manager = None


def get_services_manager() -> ServicesManager:
    """
    Получение singleton instance менеджера сервисов.
    
    Returns:
        ServicesManager: Глобальный менеджер сервисов
    """
    global _services_manager
    if _services_manager is None:
        _services_manager = ServicesManager()
    return _services_manager


# ===== DEPENDENCY FUNCTIONS =====

def get_goal_service(db: Session = Depends(get_db)) -> GoalService:
    """Dependency для GoalService"""
    manager = get_services_manager()
    return GoalService(db, manager.llm_client)


def get_chat_service(db: Session = Depends(get_db)) -> ChatService:
    """Dependency для ChatService"""
    manager = get_services_manager()
    return ChatService(db, manager.llm_client, manager.cache_manager)


def get_recommendation_service(db: Session = Depends(get_db)) -> RecommendationService:
    """Dependency для RecommendationService"""
    manager = get_services_manager()
    return RecommendationService(db, manager.llm_client)


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    """Dependency для AnalyticsService"""
    manager = get_services_manager()
    return AnalyticsService(db, manager.llm_client)


def get_cache_manager() -> CacheManager:
    """Dependency для CacheManager"""
    return get_services_manager().cache_manager


def get_rate_limiter() -> RateLimiter:
    """Dependency для RateLimiter"""
    return get_services_manager().rate_limiter


def get_whisper_service() -> WhisperService:
    """Dependency для WhisperService"""
    return get_services_manager().whisper_service


# ===== SECURITY DEPENDENCIES =====

async def verify_admin_token(x_admin_token: Optional[str] = Header(None)):
    """
    Проверка админ токена для защищенных endpoints.
    
    Args:
        x_admin_token: Токен из заголовка X-Admin-Token
    
    Raises:
        HTTPException: 403 если токен невалидный
    """
    if not settings.ADMIN_TOKEN:
        # Если токен не настроен - разрешаем (dev режим)
        return True
    
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Invalid admin token"
        )
    
    return True