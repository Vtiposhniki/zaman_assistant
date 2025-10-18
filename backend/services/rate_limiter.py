# services/rate_limiter.py — Sliding window rate limiter
"""
Rate limiter с:
- Sliding window алгоритм
- Per-IP и per-user ограничения
- Автоматическая очистка старых записей
- Thread-safe
"""
import time
import asyncio
import logging
from typing import Dict, List, Optional
from collections import defaultdict
from fastapi import HTTPException

logger = logging.getLogger("rate_limiter")


class RateLimiter:
    """Sliding window rate limiter"""
    
    def __init__(
        self,
        max_requests: int = 200,
        window_seconds: int = 3600,
        burst_limit: Optional[int] = None
    ):
        """
        Args:
            max_requests: Максимум запросов в окне
            window_seconds: Размер окна в секундах
            burst_limit: Лимит для burst (опционально)
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.burst_limit = burst_limit or (max_requests // 10)  # 10% от лимита
        
        # key -> list of timestamps
        self.request_log: Dict[str, List[float]] = defaultdict(list)
        self.lock = asyncio.Lock()
        
        # Метрики
        self.total_requests = 0
        self.blocked_requests = 0
    
    async def check_limit(
        self,
        identifier: str,
        weight: int = 1
    ) -> bool:
        """
        Проверка rate limit.
        
        Args:
            identifier: IP или user_id для отслеживания
            weight: Вес запроса (для разных операций)
        
        Returns:
            True если разрешено
        
        Raises:
            HTTPException(429) если превышен лимит
        """
        now = time.time()
        
        async with self.lock:
            # Получение записей для идентификатора
            timestamps = self.request_log[identifier]
            
            # Удаление старых запросов (вне окна)
            cutoff = now - self.window_seconds
            self.request_log[identifier] = [
                ts for ts in timestamps if ts > cutoff
            ]
            
            current_count = len(self.request_log[identifier])
            
            # Проверка burst limit (последние 60 секунд)
            if self.burst_limit:
                burst_cutoff = now - 60
                burst_count = sum(1 for ts in self.request_log[identifier] if ts > burst_cutoff)
                
                if burst_count >= self.burst_limit:
                    self.blocked_requests += weight
                    logger.warning(
                        f"Burst limit exceeded for {identifier}: "
                        f"{burst_count}/{self.burst_limit} in 60s"
                    )
                    raise HTTPException(
                        status_code=429,
                        detail=f"Too many requests. Burst limit: {self.burst_limit}/min"
                    )
            
            # Проверка основного лимита
            if current_count >= self.max_requests:
                self.blocked_requests += weight
                
                # Расчёт времени до сброса
                oldest_in_window = min(self.request_log[identifier])
                reset_in = int(oldest_in_window + self.window_seconds - now)
                
                logger.warning(
                    f"Rate limit exceeded for {identifier}: "
                    f"{current_count}/{self.max_requests} in {self.window_seconds}s"
                )
                
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Try again in {reset_in} seconds",
                    headers={"Retry-After": str(reset_in)}
                )
            
            # Добавление текущего запроса
            for _ in range(weight):
                self.request_log[identifier].append(now)
            
            self.total_requests += weight
            
            return True
    
    async def get_usage(self, identifier: str) -> dict:
        """
        Получение текущего использования для идентификатора.
        
        Args:
            identifier: IP или user_id
        
        Returns:
            dict с информацией об использовании
        """
        now = time.time()
        cutoff = now - self.window_seconds
        
        async with self.lock:
            timestamps = self.request_log.get(identifier, [])
            current_count = sum(1 for ts in timestamps if ts > cutoff)
            
            remaining = max(0, self.max_requests - current_count)
            reset_in = 0
            
            if timestamps:
                oldest = min(t for t in timestamps if t > cutoff)
                reset_in = int(oldest + self.window_seconds - now)
            
            return {
                "limit": self.max_requests,
                "remaining": remaining,
                "used": current_count,
                "reset_in_seconds": reset_in,
                "window_seconds": self.window_seconds
            }
    
    async def reset_identifier(self, identifier: str):
        """Сброс лимита для конкретного идентификатора"""
        async with self.lock:
            self.request_log.pop(identifier, None)
            logger.info(f"Rate limit reset for {identifier}")
    
    async def cleanup_old_entries(self):
        """
        Очистка старых записей из памяти.
        Запускается периодически.
        """
        now = time.time()
        cutoff = now - self.window_seconds
        
        async with self.lock:
            # Удаление пустых и старых записей
            to_delete = []
            
            for identifier, timestamps in list(self.request_log.items()):
                # Фильтрация старых
                valid_timestamps = [ts for ts in timestamps if ts > cutoff]
                
                if not valid_timestamps:
                    # Все записи старые
                    to_delete.append(identifier)
                else:
                    self.request_log[identifier] = valid_timestamps
            
            # Удаление пустых
            for identifier in to_delete:
                del self.request_log[identifier]
            
            if to_delete:
                logger.debug(f"Cleaned up {len(to_delete)} rate limiter entries")
    
    def stats(self) -> dict:
        """Статистика rate limiter"""
        block_rate = 0.0
        if self.total_requests > 0:
            block_rate = self.blocked_requests / self.total_requests
        
        return {
            "max_requests": self.max_requests,
            "window_seconds": self.window_seconds,
            "burst_limit": self.burst_limit,
            "tracked_identifiers": len(self.request_log),
            "total_requests": self.total_requests,
            "blocked_requests": self.blocked_requests,
            "block_rate": round(block_rate, 3)
        }
    
    async def cleanup_task(self):
        """
        Фоновая задача для очистки.
        Запускается в startup event.
        """
        logger.info("Rate limiter cleanup task started")
        
        while True:
            try:
                # Очистка каждые 10 минут
                await asyncio.sleep(600)
                await self.cleanup_old_entries()
            except asyncio.CancelledError:
                logger.info("Rate limiter cleanup task cancelled")
                break
            except Exception as e:
                logger.exception(f"Rate limiter cleanup error: {e}")


# ===== MULTI-TIER RATE LIMITER =====
class TieredRateLimiter:
    """
    Rate limiter с разными лимитами для разных тиров пользователей.
    """
    
    def __init__(self):
        self.tiers = {
            "free": RateLimiter(max_requests=100, window_seconds=3600),
            "premium": RateLimiter(max_requests=500, window_seconds=3600),
            "admin": RateLimiter(max_requests=10000, window_seconds=3600)
        }
        self.default_tier = "free"
    
    def get_tier_for_user(self, user_id: Optional[int]) -> str:
        """
        Определение тира пользователя.
        В production здесь была бы логика проверки подписки.
        """
        # Placeholder
        if not user_id:
            return "free"
        
        # Пример: admin users (можно загрузить из БД)
        admin_users = {1, 2, 3}
        if user_id in admin_users:
            return "admin"
        
        return "free"
    
    async def check_limit(
        self,
        identifier: str,
        user_id: Optional[int] = None,
        weight: int = 1
    ):
        """Проверка с учётом тира"""
        tier = self.get_tier_for_user(user_id)
        limiter = self.tiers.get(tier, self.tiers[self.default_tier])
        
        return await limiter.check_limit(identifier, weight)


# ===== ENDPOINT-SPECIFIC RATE LIMITER =====
class EndpointRateLimiter:
    """
    Разные лимиты для разных endpoints.
    """
    
    def __init__(self):
        # Endpoint -> limiter config
        self.limiters = {
            "/chat": RateLimiter(max_requests=50, window_seconds=3600),
            "/create_goal": RateLimiter(max_requests=20, window_seconds=3600),
            "/recommend": RateLimiter(max_requests=30, window_seconds=3600),
            "/analyze_expenses": RateLimiter(max_requests=10, window_seconds=3600),
        }
        self.default = RateLimiter(max_requests=200, window_seconds=3600)
    
    async def check_limit(self, identifier: str, endpoint: str):
        """Проверка для конкретного endpoint"""
        limiter = self.limiters.get(endpoint, self.default)
        return await limiter.check_limit(identifier)


if __name__ == "__main__":
    # Тест
    async def test():
        limiter = RateLimiter(max_requests=5, window_seconds=10)
        
        # Нормальные запросы
        for i in range(5):
            try:
                await limiter.check_limit("test_user")
                print(f"Request {i+1}: OK")
            except HTTPException as e:
                print(f"Request {i+1}: BLOCKED - {e.detail}")
        
        # Превышение лимита
        try:
            await limiter.check_limit("test_user")
            print("Request 6: OK")
        except HTTPException as e:
            print(f"Request 6: BLOCKED - {e.detail}")
        
        # Статистика
        print("\nStats:", limiter.stats())
        print("Usage:", await limiter.get_usage("test_user"))
    
    asyncio.run(test())