# backend/services/redis_goals_service.py
"""
Redis Goals Service - Полнофункциональный сервис для управления целями через Redis
Поддерживает CRUD операции, Pub/Sub для real-time обновлений, экспорт и фильтрацию
"""
import redis.asyncio as aioredis
import json
import uuid
import logging
import asyncio
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Callable
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# Redis ключи
REDIS_GOALS_KEY = "goals"
REDIS_UPDATES_CHANNEL = "goals_updates"
REDIS_STATS_KEY = "goals_stats"

class RedisGoalsService:
    """
    Сервис для управления целями через Redis
    Поддерживает CRUD операции, Pub/Sub, экспорт и статистику
    """
    
    def __init__(self, client: aioredis.Redis):
        self.client = client
        self._pubsub = None
        self._subscription_task = None
    
    # ===== CRUD OPERATIONS =====
    
    async def create_goal(self, data: dict) -> Dict[str, Any]:
        """
        Создание новой цели
        
        Args:
            data: Данные цели (name, target_amount, target_date, user_id, etc.)
            
        Returns:
            Созданная цель с ID и метаданными
        """
        goal_id = f"goal_{uuid.uuid4().hex[:10]}"
        now = datetime.utcnow().isoformat()
        
        # Валидация обязательных полей
        required_fields = ["name", "target_amount", "target_date"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Создание цели с метаданными
        goal = {
            "id": goal_id,
            "created_at": now,
            "updated_at": now,
            "status": "active",
            "current_savings": data.get("current_savings", 0.0),
            **data
        }
        
        # Сохранение в Redis
        await self.client.hset(REDIS_GOALS_KEY, goal_id, json.dumps(goal))
        
        # Обновление статистики
        await self._update_stats("created")
        
        # Pub/Sub уведомление
        await self._publish_update("goal_created", goal)
        
        logger.info(f"Created goal {goal_id} for user {data.get('user_id', 'unknown')}")
        return goal
    
    async def get_goals(self, user_id: Optional[int] = None, 
                       status: Optional[str] = None,
                       goal_type: Optional[str] = None,
                       limit: Optional[int] = None,
                       offset: int = 0) -> List[Dict[str, Any]]:
        """
        Получение списка целей с фильтрацией
        
        Args:
            user_id: Фильтр по пользователю
            status: Фильтр по статусу (active, completed, cancelled)
            goal_type: Фильтр по типу цели
            limit: Максимальное количество записей
            offset: Смещение для пагинации
            
        Returns:
            Список целей
        """
        goals_raw = await self.client.hgetall(REDIS_GOALS_KEY)
        goals = [json.loads(v) for v in goals_raw.values()]
        
        # Применение фильтров
        if user_id is not None:
            goals = [g for g in goals if g.get("user_id") == user_id]
        
        if status:
            goals = [g for g in goals if g.get("status") == status]
        
        if goal_type:
            goals = [g for g in goals if g.get("goal_type") == goal_type]
        
        # Сортировка по дате создания (новые сначала)
        goals.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Пагинация
        if offset > 0:
            goals = goals[offset:]
        if limit:
            goals = goals[:limit]
        
        return goals
    
    async def get_goal(self, goal_id: str) -> Optional[Dict[str, Any]]:
        """
        Получение конкретной цели по ID
        
        Args:
            goal_id: ID цели
            
        Returns:
            Цель или None если не найдена
        """
        raw = await self.client.hget(REDIS_GOALS_KEY, goal_id)
        return json.loads(raw) if raw else None
    
    async def update_goal(self, goal_id: str, 
                         current_savings: Optional[float] = None,
                         status: Optional[str] = None,
                         **kwargs) -> Optional[Dict[str, Any]]:
        """
        Обновление цели
        
        Args:
            goal_id: ID цели
            current_savings: Новые накопления
            status: Новый статус
            **kwargs: Другие поля для обновления
            
        Returns:
            Обновленная цель или None если не найдена
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            return None
        
        # Обновление полей
        if current_savings is not None:
            goal["current_savings"] = current_savings
        
        if status:
            goal["status"] = status
        
        # Обновление дополнительных полей
        for key, value in kwargs.items():
            if value is not None:
                goal[key] = value
        
        goal["updated_at"] = datetime.utcnow().isoformat()
        
        # Сохранение
        await self.client.hset(REDIS_GOALS_KEY, goal_id, json.dumps(goal))
        
        # Обновление статистики
        await self._update_stats("updated")
        
        # Pub/Sub уведомление
        await self._publish_update("goal_updated", goal)
        
        logger.info(f"Updated goal {goal_id}")
        return goal
    
    async def delete_goal(self, goal_id: str) -> bool:
        """
        Мягкое удаление цели (изменение статуса на cancelled)
        
        Args:
            goal_id: ID цели
            
        Returns:
            True если цель была отменена
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            return False
        
        goal["status"] = "cancelled"
        goal["updated_at"] = datetime.utcnow().isoformat()
        
        await self.client.hset(REDIS_GOALS_KEY, goal_id, json.dumps(goal))
        
        # Обновление статистики
        await self._update_stats("cancelled")
        
        # Pub/Sub уведомление
        await self._publish_update("goal_cancelled", goal)
        
        logger.info(f"Cancelled goal {goal_id}")
        return True
    
    async def hard_delete_goal(self, goal_id: str) -> bool:
        """
        Жесткое удаление цели из Redis
        
        Args:
            goal_id: ID цели
            
        Returns:
            True если цель была удалена
        """
        removed = await self.client.hdel(REDIS_GOALS_KEY, goal_id)
        
        if removed > 0:
            # Обновление статистики
            await self._update_stats("deleted")
            
            # Pub/Sub уведомление
            await self._publish_update("goal_deleted", {"id": goal_id})
            
            logger.info(f"Hard deleted goal {goal_id}")
            return True
        
        return False
    
    # ===== BULK OPERATIONS =====
    
    async def bulk_update_goals(self, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Массовое обновление целей
        
        Args:
            updates: Список обновлений [{"goal_id": "...", "current_savings": 1000}, ...]
            
        Returns:
            Статистика обновлений
        """
        results = {"updated": 0, "failed": 0, "errors": []}
        
        for update in updates:
            try:
                goal_id = update.pop("goal_id")
                if await self.update_goal(goal_id, **update):
                    results["updated"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Goal {goal_id} not found")
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Error updating goal: {str(e)}")
        
        logger.info(f"Bulk update completed: {results['updated']} updated, {results['failed']} failed")
        return results
    
    # ===== EXPORT & STATISTICS =====
    
    async def export_goals_json(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Экспорт всех целей в JSON формате
        
        Args:
            user_id: Фильтр по пользователю (опционально)
            
        Returns:
            Список всех целей
        """
        goals = await self.get_goals(user_id=user_id)
        
        # Добавление вычисляемых полей
        for goal in goals:
            goal["progress_percent"] = self._calculate_progress(goal)
            goal["months_remaining"] = self._calculate_months_remaining(goal)
            goal["monthly_needed"] = self._calculate_monthly_needed(goal)
        
        logger.info(f"Exported {len(goals)} goals")
        return goals
    
    async def get_goals_statistics(self) -> Dict[str, Any]:
        """
        Получение статистики по целям
        
        Returns:
            Статистика целей
        """
        goals = await self.get_goals()
        
        stats = {
            "total_goals": len(goals),
            "active_goals": len([g for g in goals if g.get("status") == "active"]),
            "completed_goals": len([g for g in goals if g.get("status") == "completed"]),
            "cancelled_goals": len([g for g in goals if g.get("status") == "cancelled"]),
            "total_target_amount": sum(g.get("target_amount", 0) for g in goals),
            "total_current_savings": sum(g.get("current_savings", 0) for g in goals),
            "average_progress": 0,
            "goals_by_type": {},
            "goals_by_user": {}
        }
        
        # Расчет средней прогресса
        if goals:
            total_progress = sum(self._calculate_progress(g) for g in goals)
            stats["average_progress"] = total_progress / len(goals)
        
        # Группировка по типу
        for goal in goals:
            goal_type = goal.get("goal_type", "unknown")
            stats["goals_by_type"][goal_type] = stats["goals_by_type"].get(goal_type, 0) + 1
        
        # Группировка по пользователю
        for goal in goals:
            user_id = goal.get("user_id", "unknown")
            stats["goals_by_user"][str(user_id)] = stats["goals_by_user"].get(str(user_id), 0) + 1
        
        return stats
    
    # ===== PUB/SUB & WEBSOCKET INTEGRATION =====
    
    async def subscribe_to_updates(self, callback: Callable[[Dict[str, Any]], None]):
        """
        Подписка на обновления целей через Pub/Sub
        
        Args:
            callback: Функция для обработки обновлений
        """
        if self._pubsub is None:
            self._pubsub = self.client.pubsub()
            await self._pubsub.subscribe(REDIS_UPDATES_CHANNEL)
        
        try:
            async for msg in self._pubsub.listen():
                if msg["type"] == "message":
                    try:
                        data = json.loads(msg["data"])
                        await callback(data)
                    except Exception as e:
                        logger.error(f"Error processing pub/sub message: {e}")
        except Exception as e:
            logger.error(f"Pub/Sub subscription error: {e}")
    
    async def start_subscription_task(self, websocket_manager):
        """
        Запуск задачи подписки на обновления для WebSocket
        
        Args:
            websocket_manager: Менеджер WebSocket соединений
        """
        if self._subscription_task is None:
            self._subscription_task = asyncio.create_task(
                self._websocket_broadcast_loop(websocket_manager)
            )
            logger.info("Started Redis goals subscription task for WebSocket")
    
    async def stop_subscription_task(self):
        """Остановка задачи подписки"""
        if self._subscription_task:
            self._subscription_task.cancel()
            try:
                await self._subscription_task
            except asyncio.CancelledError:
                pass
            self._subscription_task = None
            logger.info("Stopped Redis goals subscription task")
    
    # ===== PRIVATE METHODS =====
    
    async def _publish_update(self, event_type: str, data: Dict[str, Any]):
        """Публикация обновления в Redis Pub/Sub"""
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.client.publish(REDIS_UPDATES_CHANNEL, json.dumps(message))
    
    async def _update_stats(self, action: str):
        """Обновление статистики действий"""
        await self.client.hincrby(REDIS_STATS_KEY, action, 1)
        await self.client.hset(REDIS_STATS_KEY, "last_updated", datetime.utcnow().isoformat())
    
    async def _websocket_broadcast_loop(self, websocket_manager):
        """Цикл для передачи обновлений в WebSocket"""
        async def websocket_callback(data):
            try:
                message = json.dumps({
                    "type": "goals_update",
                    "data": data
                })
                await websocket_manager.broadcast(message)
            except Exception as e:
                logger.error(f"WebSocket broadcast error: {e}")
        
        await self.subscribe_to_updates(websocket_callback)
    
    def _calculate_progress(self, goal: Dict[str, Any]) -> float:
        """Расчет прогресса цели в процентах"""
        target = goal.get("target_amount", 0)
        current = goal.get("current_savings", 0)
        return (current / target * 100) if target > 0 else 0
    
    def _calculate_months_remaining(self, goal: Dict[str, Any]) -> int:
        """Расчет оставшихся месяцев до цели"""
        try:
            target_date = datetime.strptime(goal.get("target_date", ""), "%Y-%m-%d").date()
            today = date.today()
            delta = target_date - today
            return max(0, delta.days // 30)
        except:
            return 0
    
    def _calculate_monthly_needed(self, goal: Dict[str, Any]) -> float:
        """Расчет необходимой ежемесячной суммы"""
        target = goal.get("target_amount", 0)
        current = goal.get("current_savings", 0)
        months = self._calculate_months_remaining(goal)
        return (target - current) / months if months > 0 else 0
    
    # ===== CONNECTION MANAGEMENT =====
    
    async def health_check(self) -> Dict[str, Any]:
        """Проверка здоровья Redis соединения"""
        try:
            # Проверка соединения
            await self.client.ping()
            
            # Получение базовой статистики
            goals_count = await self.client.hlen(REDIS_GOALS_KEY)
            
            return {
                "status": "healthy",
                "redis_connected": True,
                "goals_count": goals_count,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "redis_connected": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def close(self):
        """Закрытие соединений"""
        await self.stop_subscription_task()
        if self._pubsub:
            await self._pubsub.close()
        await self.client.close()


# ===== FACTORY FUNCTIONS =====

async def create_redis_goals_service(redis_url: str = None) -> RedisGoalsService:
    """
    Создание экземпляра RedisGoalsService
    
    Args:
        redis_url: URL Redis сервера (если None, берется из конфигурации)
        
    Returns:
        Настроенный сервис
    """
    from ..config import settings
    
    if redis_url is None:
        redis_url = settings.REDIS_URL
    
    # Создание клиента с настройками из конфигурации
    client = aioredis.from_url(
        redis_url,
        decode_responses=True,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
        retry_on_timeout=settings.REDIS_RETRY_ON_TIMEOUT,
        socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
        socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT
    )
    
    service = RedisGoalsService(client)
    
    # Проверка соединения
    health = await service.health_check()
    if not health["redis_connected"]:
        raise ConnectionError(f"Failed to connect to Redis: {health.get('error')}")
    
    logger.info(f"Redis Goals Service initialized successfully with URL: {redis_url}")
    return service


@asynccontextmanager
async def get_redis_goals_service(redis_url: str = None):
    """
    Контекстный менеджер для RedisGoalsService
    
    Args:
        redis_url: URL Redis сервера (если None, берется из конфигурации)
        
    Yields:
        RedisGoalsService
    """
    service = await create_redis_goals_service(redis_url)
    try:
        yield service
    finally:
        await service.close()
