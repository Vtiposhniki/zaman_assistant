# services/chat_service.py — Сервис для чата с AI
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
        self.db = db
        self.llm = llm_client
        self.cache = cache_manager

    def _find_faq_answer(self, user_text: str) -> Optional[str]:
        """Поиск ответа в FAQ"""
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
        user_id: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> dict:
        """REST чат запрос"""
        user_text = next((m.get("content") for m in messages if m.get("role") == "user"), "")
        if not user_text:
            return {"reply": "Пожалуйста, отправьте сообщение.", "latency_ms": 0}

        # 1️⃣ Проверяем FAQ
        faq_answer = self._find_faq_answer(user_text)
        if faq_answer:
            return {"reply": faq_answer, "latency_ms": 0, "from_cache": False, "type": "faq"}

        # 2️⃣ Проверка кэша
        cached = await self.cache.get("chat", user_text)
        if cached:
            return {"reply": cached, "latency_ms": 3, "from_cache": True, "type": "cached"}

        # 3️⃣ Вызов LLM
        sys_prompt = {"role": "system", "content": system_prompt or SYSTEM_PROMPT}
        full_messages = [sys_prompt] + messages

        reply, latency = await self.llm.chat_completion(
            messages=full_messages,
            max_tokens=500,
            temperature=0.7
        )

        # Кэш
        await self.cache.set("chat", user_text, reply)

        # Лог
        if self.db:
            self._log_conversation_sync(user_id, "user", user_text)
            self._log_conversation_sync(user_id, "assistant", reply, latency)

        return {"reply": reply, "latency_ms": round(latency, 2)}

    async def process_websocket_message(
        self,
        message: dict,
        user_id: int,
        websocket: WebSocket,
        system_prompt: Optional[str] = None
    ):
        """WebSocket сообщение с режимами и стримингом"""
        content = message.get("content", "")
        if not content:
            await websocket.send_json({"error": "Пустое сообщение"})
            return

        # 1️⃣ Проверка FAQ
        faq_answer = self._find_faq_answer(content)
        if faq_answer:
            await websocket.send_json({"reply": faq_answer, "type": "faq", "from_cache": False})
            return

        # 2️⃣ Проверка кэша
        cached = await self.cache.get("chat", content)
        if cached:
            await websocket.send_json({"reply": cached, "type": "cached", "from_cache": True})
            return

        # 3️⃣ Генерация AI-ответа
        sys_prompt = {"role": "system", "content": system_prompt or SYSTEM_PROMPT}
        messages = [sys_prompt, {"role": "user", "content": content}]

        reply_text, latency = await self.llm.chat_completion(messages)
        logger.info(f"🤖 AI reply ready ({latency:.2f} ms): {reply_text[:100]}")

        # 4️⃣ Стриминг (эффект набора текста)
        chunk_size = 60
        full_reply = ""
        for i in range(0, len(reply_text), chunk_size):
            chunk = reply_text[i:i+chunk_size]
            full_reply += chunk
            done = (i + chunk_size) >= len(reply_text)

            await websocket.send_json({
                "type": "stream",
                "reply": chunk,
                "done": done,
                "latency_ms": latency if i == 0 else 0
            })
            await asyncio.sleep(0.02)

        # 5️⃣ Финальный ответ
        await websocket.send_json({
            "reply": full_reply,
            "done": True,
            "latency_ms": latency
        })

        # Кэш и лог
        await self.cache.set("chat", content, reply_text)
        asyncio.create_task(self._log_conversation_async(user_id, "user", content))
        asyncio.create_task(self._log_conversation_async(user_id, "assistant", reply_text, latency))
        return {"reply": reply_text, "latency_ms": latency}

    # ===== Логирование =====

    def _log_conversation_sync(self, user_id, role, content, latency_ms=None):
        if not self.db:
            return
        try:
            entry = ConversationLog(user_id=user_id, role=role, content=content, latency_ms=latency_ms)
            self.db.add(entry)
            self.db.commit()
        except Exception as e:
            logger.exception(f"Failed to log conversation: {e}")
            self.db.rollback()

    async def _log_conversation_async(self, user_id, role, content, latency_ms=None):
        from database import SessionLocal
        def save():
            db = SessionLocal()
            try:
                entry = ConversationLog(
                    user_id=user_id, role=role, content=content, latency_ms=latency_ms
                )
                db.add(entry)
                db.commit()
            except Exception as e:
                logger.exception(f"Async log failed: {e}")
                db.rollback()
            finally:
                db.close()

        await asyncio.to_thread(save)
