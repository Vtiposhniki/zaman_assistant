# services/cache_manager.py — Thread-safe namespace-aware cache
"""
Кэш-менеджер с поддержкой:
- Namespace isolation (chat, products, recommendations)
- TTL expiration
- Hit rate tracking
- Async cleanup task
"""
import time
import asyncio
import hashlib
import logging
from typing import Optional, Dict, Set
from collections import defaultdict

logger = logging.getLogger("cache_manager")


class CacheManager:
    """Thread-safe кэш с namespace и TTL"""
    
    def __init__(self, ttl_seconds: int = 3600):
        """
        Args:
            ttl_seconds: Время жизни кэша (по умолчанию 1 час)
        """
        self.cache: Dict[str, tuple] = {}  # key -> (value, timestamp)
        self.ttl = ttl_seconds
        self.namespace_map: Dict[str, Set[str]] = defaultdict(set)  # namespace -> keys
        self.lock = asyncio.Lock()
        
        # Метрики
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.evictions = 0
    
    def _make_key(self, namespace: str, data: str) -> str:
        """
        Генерация ключа из namespace + data.
        Использует SHA256 для детерминированности.
        """
        content = f"{namespace}:{data}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    async def get(self, namespace: str, key_data: str) -> Optional[str]:
        """
        Получение значения из кэша.
        
        Args:
            namespace: Категория (chat, products, etc)
            key_data: Данные для ключа
        
        Returns:
            Закэшированное значение или None
        """
        key = self._make_key(namespace, key_data)
        
        async with self.lock:
            entry = self.cache.get(key)
            
            if not entry:
                self.misses += 1
                return None
            
            value, timestamp = entry
            
            # Проверка TTL
            if time.time() - timestamp >= self.ttl:
                # Expired
                await self._delete_key_unsafe(namespace, key)
                self.misses += 1
                self.evictions += 1
                return None
            
            self.hits += 1
            return value
    
    async def set(self, namespace: str, key_data: str, value: str):
        """
        Сохранение значения в кэш.
        
        Args:
            namespace: Категория
            key_data: Данные для ключа
            value: Значение для кэширования
        """
        key = self._make_key(namespace, key_data)
        
        async with self.lock:
            self.cache[key] = (value, time.time())
            self.namespace_map[namespace].add(key)
            self.sets += 1
    
    async def delete(self, namespace: str, key_data: str):
        """Удаление конкретного ключа"""
        key = self._make_key(namespace, key_data)
        
        async with self.lock:
            await self._delete_key_unsafe(namespace, key)
    
    async def _delete_key_unsafe(self, namespace: str, key: str):
        """Удаление ключа без lock (для внутреннего использования)"""
        self.cache.pop(key, None)
        
        if namespace in self.namespace_map:
            self.namespace_map[namespace].discard(key)
    
    async def clear_namespace(self, namespace: str):
        """
        Очистка всех ключей в namespace.
        
        Args:
            namespace: Категория для очистки
        """
        async with self.lock:
            keys = list(self.namespace_map.get(namespace, []))
            
            for key in keys:
                self.cache.pop(key, None)
            
            self.namespace_map.pop(namespace, None)
            
            logger.info(f"Cleared namespace '{namespace}': {len(keys)} keys")
    
    async def clear_all(self):
        """Полная очистка кэша"""
        async with self.lock:
            self.cache.clear()
            self.namespace_map.clear()
            
            # Сброс метрик
            self.hits = 0
            self.misses = 0
            self.sets = 0
            self.evictions = 0
            
            logger.info("Cache cleared completely")
    
    def stats(self) -> dict:
        """
        Статистика кэша.
        
        Returns:
            dict с метриками
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests) if total_requests > 0 else 0.0
        
        # Размер по namespace
        namespace_sizes = {
            ns: len(keys) 
            for ns, keys in self.namespace_map.items()
        }
        
        return {
            "total_entries": len(self.cache),
            "namespaces": len(self.namespace_map),
            "namespace_sizes": namespace_sizes,
            "ttl_seconds": self.ttl,
            "hits": self.hits,
            "misses": self.misses,
            "sets": self.sets,
            "evictions": self.evictions,
            "hit_rate": round(hit_rate, 3)
        }
    
    async def cleanup_expired(self):
        """
        Удаление просроченных записей.
        Вызывается периодически фоновой задачей.
        """
        now = time.time()
        expired_keys = []
        
        async with self.lock:
            for key, (value, timestamp) in list(self.cache.items()):
                if now - timestamp >= self.ttl:
                    expired_keys.append(key)
            
            # Удаление expired
            for key in expired_keys:
                self.cache.pop(key, None)
                
                # Удаление из namespace map
                for namespace, keys in list(self.namespace_map.items()):
                    if key in keys:
                        keys.discard(key)
                        break
            
            self.evictions += len(expired_keys)
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    async def cleanup_task(self):
        """
        Фоновая задача для периодической очистки.
        Запускается в startup event.
        """
        logger.info("Cache cleanup task started")
        
        while True:
            try:
                await asyncio.sleep(300)  # Каждые 5 минут
                await self.cleanup_expired()
            except asyncio.CancelledError:
                logger.info("Cache cleanup task cancelled")
                break
            except Exception as e:
                logger.exception(f"Cache cleanup error: {e}")


# ===== DIFFERENTIATED TTL STRATEGY =====
class SmartCacheManager(CacheManager):
    """
    Расширенный кэш с разными TTL для разных namespace.
    """
    
    def __init__(self):
        super().__init__(ttl_seconds=3600)  # Default 1 hour
        
        # Специфичные TTL
        self.namespace_ttls = {
            "products": 86400,      # 24 hours (меняются редко)
            "chat": 1800,           # 30 minutes
            "recommendations": 3600, # 1 hour
            "faq": None,            # Never expire
            "embeddings": None      # Never expire
        }
    
    async def get(self, namespace: str, key_data: str) -> Optional[str]:
        """Override для учёта namespace TTL"""
        key = self._make_key(namespace, key_data)
        
        async with self.lock:
            entry = self.cache.get(key)
            
            if not entry:
                self.misses += 1
                return None
            
            value, timestamp = entry
            
            # Получение TTL для namespace
            ttl = self.namespace_ttls.get(namespace, self.ttl)
            
            # Never expire namespaces
            if ttl is None:
                self.hits += 1
                return value
            
            # Проверка TTL
            if time.time() - timestamp >= ttl:
                await self._delete_key_unsafe(namespace, key)
                self.misses += 1
                self.evictions += 1
                return None
            
            self.hits += 1
            return value


if __name__ == "__main__":
    # Тест
    async def test():
        cache = CacheManager(ttl_seconds=2)
        
        # Set
        await cache.set("test", "key1", "value1")
        print("Set:", await cache.get("test", "key1"))
        
        # TTL expiration
        await asyncio.sleep(3)
        print("After TTL:", await cache.get("test", "key1"))
        
        # Stats
        print("Stats:", cache.stats())
    
    asyncio.run(test())