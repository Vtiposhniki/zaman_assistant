# services/chat_service.py — Сервис для чата с AI
"""
Обработка чат-запросов с:
- FAQ detection
- Кэшированием
- WebSocket streaming
- Логированием в БД
"""
import json
import asyncio
import logging
from typing import List, Dict, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session

from database import ConversationLog, Metric
from prompts import SYSTEM_PROMPT
from config import FAQ_RESPONSES

logger = logging.getLogger("chat_service")


class ChatService:
    """Сервис для обработки чат-сообщений"""
    
    def __init__(self, db: Optional[Session], llm_client, cache_manager):
        """
        Args:
            db: Database session (может быть None для WebSocket)
            llm_client: LLM клиент
            cache_manager: Кэш менеджер
        """
        self.db = db
        self.llm = llm_client
        self.cache = cache_manager
    
    def _find_faq_answer(self, user_text: str) -> Optional[str]:
        """
        Поиск ответа в FAQ.
        
        Args:
            user_text: Текст пользователя
        
        Returns:
            Ответ из FAQ или None
        """
        if not user_text:
            return None
        
        text_lower = user_text.lower()
        
        for pattern, answer in FAQ_RESPONSES.items():
            if pattern in text_lower:
                logger.info(f"FAQ match: '{pattern}'")
                return answer
        
        return None
    
    async def process_message(
        self,
        messages: List[Dict[str, str]],
        user_id: Optional[int] = None
    ) -> dict:
        """
        Обработка REST чат запроса.
        
        Args:
            messages: История сообщений
            user_id: ID пользователя
        
        Returns:
            dict с ответом и метаданными
        """
        # Извлечение последнего user message
        user_text = ""
        for msg in messages:
            if msg.get("role") == "user":
                user_text = msg.get("content", "")
        
        if not user_text:
            return {
                "reply": "Пожалуйста, отправьте сообщение.",
                "latency_ms": 0,
                "from_cache": False,
                "type": "error"
            }
        
        # 1. Проверка FAQ
        faq_answer = self._find_faq_answer(user_text)
        if faq_answer:
            # Логирование в БД
            if self.db and user_id:
                self._log_conversation_sync(user_id, "user", user_text)
                self._log_conversation_sync(user_id, "assistant", faq_answer, 0.0)
            
            return {
                "reply": faq_answer,
                "latency_ms": 0,
                "from_cache": False,
                "type": "faq"
            }
        
        # 2. Проверка кэша
        cached = await self.cache.get("chat", user_text)
        if cached:
            logger.debug(f"Cache hit for: {user_text[:50]}...")
            
            if self.db and user_id:
                self._log_conversation_sync(user_id, "user", user_text)
            
            return {
                "reply": cached,
                "latency_ms": 5,
                "from_cache": True,
                "type": "cached"
            }
        
        # 3. Вызов LLM
        system_msg = {"role": "system", "content": SYSTEM_PROMPT}
        full_messages = [system_msg] + messages
        
        reply, latency = await self.llm.chat_completion(
            messages=full_messages,
            max_tokens=500,
            temperature=0.7
        )
        
        # Кэширование ответа
        await self.cache.set("chat", user_text, reply)
        
        # Логирование в БД
        if self.db:
            self._log_conversation_sync(user_id, "user", user_text)
            self._log_conversation_sync(user_id, "assistant", reply, latency)
            self._log_metric("chat_request", 1.0)
            self._log_metric("llm_latency_ms", latency)
        
        return {
            "reply": reply,
            "latency_ms": round(latency, 2),
            "from_cache": False,
            "type": "llm"
        }
    
    async def process_websocket_message(
        self,
        message: dict,
        user_id: int,
        websocket: WebSocket
    ):
        """
        Обработка WebSocket сообщения со streaming.
        
        Args:
            message: Сообщение от клиента {"content": "..."}
            user_id: ID пользователя
            websocket: WebSocket connection
        """
        content = message.get("content", "")
        
        if not content:
            await websocket.send_text(json.dumps({
                "error": "Empty message"
            }))
            return
        
        # 1. Проверка FAQ
        faq_answer = self._find_faq_answer(content)
        if faq_answer:
            await websocket.send_text(json.dumps({
                "type": "faq",
                "content": faq_answer,
                "latency_ms": 0,
                "from_cache": False
            }))
            
            # Асинхронное логирование
            asyncio.create_task(self._log_conversation_async(user_id, "user", content))
            asyncio.create_task(self._log_conversation_async(user_id, "assistant", faq_answer, 0.0))
            return
        
        # 2. Проверка кэша
        cached = await self.cache.get("chat", content)
        if cached:
            await websocket.send_text(json.dumps({
                "type": "cached",
                "content": cached,
                "latency_ms": 5,
                "from_cache": True
            }))
            
            asyncio.create_task(self._log_conversation_async(user_id, "user", content))
            return
        
        # 3. Вызов LLM со streaming
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ]
        
        response_text, latency = await self.llm.chat_completion(messages)
        
        # Streaming по чанкам
        chunk_size = 60
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i+chunk_size]
            is_done = (i + chunk_size) >= len(response_text)
            
            await websocket.send_text(json.dumps({
                "type": "stream",
                "content": chunk,
                "latency_ms": latency if i == 0 else 0,
                "from_cache": False,
                "done": is_done
            }))
            
            # Небольшая задержка для эффекта typing
            await asyncio.sleep(0.01)
        
        # Кэширование
        await self.cache.set("chat", content, response_text)
        
        # Логирование
        asyncio.create_task(self._log_conversation_async(user_id, "user", content))
        asyncio.create_task(self._log_conversation_async(user_id, "assistant", response_text, latency))
    
    def _log_conversation_sync(
        self,
        user_id: Optional[int],
        role: str,
        content: str,
        latency_ms: Optional[float] = None
    ):
        """Синхронное логирование в БД"""
        if not self.db:
            return
        
        try:
            entry = ConversationLog(
                user_id=user_id,
                role=role,
                content=content,
                latency_ms=latency_ms
            )
            self.db.add(entry)
            self.db.commit()
        except Exception as e:
            logger.exception(f"Failed to log conversation: {e}")
            self.db.rollback()
    
    async def _log_conversation_async(
        self,
        user_id: int,
        role: str,
        content: str,
        latency_ms: Optional[float] = None
    ):
        """Асинхронное логирование (для WebSocket)"""
        await asyncio.to_thread(
            self._log_conversation_standalone,
            user_id, role, content, latency_ms
        )
    
    def _log_conversation_standalone(
        self,
        user_id: int,
        role: str,
        content: str,
        latency_ms: Optional[float] = None
    ):
        """Standalone логирование с отдельной сессией БД"""
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            entry = ConversationLog(
                user_id=user_id,
                role=role,
                content=content,
                latency_ms=latency_ms
            )
            db.add(entry)
            db.commit()
        except Exception as e:
            logger.exception(f"Failed to log conversation: {e}")
            db.rollback()
        finally:
            db.close()
    
    def _log_metric(self, name: str, value: float, metadata: dict = None):
        """Логирование метрики"""
        if not self.db:
            return
        
        try:
            metric = Metric(
                metric_name=name,
                value=value,
                metric_metadata=metadata
            )
            self.db.add(metric)
            self.db.commit()
        except Exception as e:
            logger.exception(f"Failed to log metric: {e}")
            self.db.rollback()
    
    async def get_conversation_history(
        self,
        user_id: int,
        limit: int = 50
    ) -> List[dict]:
        """
        Получение истории разговоров пользователя.
        
        Args:
            user_id: ID пользователя
            limit: Максимум сообщений
        
        Returns:
            Список сообщений
        """
        if not self.db:
            return []
        
        logs = self.db.query(ConversationLog)\
            .filter(ConversationLog.user_id == user_id)\
            .order_by(ConversationLog.timestamp.desc())\
            .limit(limit)\
            .all()
        
        return [
            {
                "role": log.role,
                "content": log.content,
                "timestamp": log.timestamp.isoformat(),
                "latency_ms": log.latency_ms
            }
            for log in reversed(logs)  # Обратный порядок для хронологии
        ]