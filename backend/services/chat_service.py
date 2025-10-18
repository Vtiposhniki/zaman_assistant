# services/chat_service.py — Сервис для чата с AI (v2.2 Stable)
import json
import asyncio
import logging
from typing import List, Dict, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session

from database import ConversationLog
from prompts import SYSTEM_PROMPT
from config import FAQ_RESPONSES

logger = logging.getLogger("chat_service")


class ChatService:
    """Главный сервис чата для Zaman Assistant."""

    def __init__(self, db: Optional[Session], llm_client, cache_manager):
        self.db = db
        self.llm = llm_client
        self.cache = cache_manager

    # =====================================================
    # 🔍 FAQ быстрые ответы
    # =====================================================
    def _find_faq_answer(self, user_text: str) -> Optional[str]:
        if not user_text:
            return None

        text_lower = user_text.lower()
        for pattern, answer in FAQ_RESPONSES.items():
            if pattern in text_lower:
                logger.info(f"💡 FAQ match: '{pattern}' → {answer[:60]}...")
                return answer
        return None

    # =====================================================
    # 📩 REST чат (POST /chat)
    # =====================================================
    async def process_message(
        self,
        messages: List[Dict[str, str]],
        user_id: Optional[int] = None,
        system_prompt: Optional[str] = None,
        context: Optional[dict] = None
    ) -> dict:
        """Обработка обычного REST-запроса чата."""
        user_text = next((m.get("content") for m in messages if m.get("role") == "user"), "")
        if not user_text:
            return {"reply": "Пожалуйста, отправьте сообщение.", "latency_ms": 0}

        # 1️⃣ Проверка FAQ
        faq_answer = self._find_faq_answer(user_text)
        if faq_answer:
            return {"reply": faq_answer, "type": "faq", "latency_ms": 0}

        # 2️⃣ Проверка кэша
        cached = await self.cache.get("chat", user_text)
        if cached:
            logger.info("⚡ Взято из кэша.")
            return {"reply": cached, "type": "cached", "latency_ms": 3}

        # 3️⃣ Подготовка запроса к LLM
        sys_prompt = {"role": "system", "content": self._build_system_prompt(system_prompt, context)}
        full_messages = [sys_prompt] + messages

        logger.info(f"🧠 Отправляем запрос в LLMClient: {user_text[:100]}...")
        reply, latency = await self.llm.chat_completion(full_messages)
        logger.info(f"✅ Ответ от LLM ({latency:.2f} ms): {reply[:150]}")

        # 4️⃣ Кэш и логирование
        await self.cache.set("chat", user_text, reply)
        if self.db:
            asyncio.create_task(self._log_conversation_async(user_id, "user", user_text))
            asyncio.create_task(self._log_conversation_async(user_id, "assistant", reply, latency))

        return {"reply": reply, "latency_ms": round(latency, 2)}

    # =====================================================
    # 💬 WebSocket чат с потоковой передачей
    # =====================================================
    async def process_websocket_message(
        self,
        message: dict,
        user_id: int,
        websocket: WebSocket,
        system_prompt: Optional[str] = None,
        context: Optional[dict] = None
    ):
        """Обработка WebSocket-сообщения с поддержкой стриминга."""
        logger.info(f"💬 [ChatService] process_websocket_message вызван (user_id={user_id})")

        content = message.get("content", "")
        if not content:
            await websocket.send_json({"error": "Пустое сообщение"})
            return

        logger.info(f"🧾 Входящее сообщение: {content}")

        # 1️⃣ FAQ
        faq_answer = self._find_faq_answer(content)
        if faq_answer:
            await websocket.send_json({"reply": faq_answer, "type": "faq", "from_cache": False})
            return

        # 2️⃣ Кэш
        cached = await self.cache.get("chat", content)
        if cached:
            await websocket.send_json({"reply": cached, "type": "cached", "from_cache": True})
            return

        # 3️⃣ Подготовка сообщений
        sys_prompt = {"role": "system", "content": self._build_system_prompt(system_prompt, context)}
        messages = [sys_prompt, {"role": "user", "content": content}]

        logger.info(f"⚙️ Запрос в LLMClient...")
        reply_text, latency = await self.llm.chat_completion(messages)
        logger.info(f"✅ Ответ от LLMClient ({latency:.2f} ms): {reply_text[:150]}")

        # 4️⃣ Стриминг частями
        chunk_size = 80
        full_reply = ""
        for i in range(0, len(reply_text), chunk_size):
            chunk = reply_text[i:i + chunk_size]
            full_reply += chunk
            done = (i + chunk_size) >= len(reply_text)

            await websocket.send_json({
                "type": "stream",
                "reply": chunk,
                "done": done,
                "latency_ms": latency if i == 0 else 0
            })
            await asyncio.sleep(0.03)

        # 5️⃣ Финальное сообщение
        await websocket.send_json({
            "type": "stream",
            "reply": full_reply,
            "done": True,
            "latency_ms": latency
        })

        # 6️⃣ Кэш и лог
        await self.cache.set("chat", content, reply_text)
        asyncio.create_task(self._log_conversation_async(user_id, "user", content))
        asyncio.create_task(self._log_conversation_async(user_id, "assistant", reply_text, latency))

        logger.info(f"📤 Ответ отправлен пользователю {user_id}. Длина: {len(reply_text)}")

        return {"reply": reply_text, "latency_ms": latency}

    # =====================================================
    # 🧩 Формирование System Prompt
    # =====================================================
    def _build_system_prompt(self, base_prompt: Optional[str], context: Optional[dict]) -> str:
        """Добавляет финансовый контекст пользователя к system prompt."""
        prompt = base_prompt or SYSTEM_PROMPT
        if context:
            try:
                ctx_text = json.dumps(context, ensure_ascii=False, indent=2)
                prompt += f"\n\n📊 Контекст пользователя:\n{ctx_text}"
            except Exception as e:
                logger.warning(f"⚠️ Ошибка сериализации контекста: {e}")
        return prompt

    # =====================================================
    # 🧾 Логирование
    # =====================================================
    async def _log_conversation_async(self, user_id, role, content, latency_ms=None):
        """Асинхронное логирование в базу."""
        from database import SessionLocal

        def save():
            db = SessionLocal()
            try:
                entry = ConversationLog(user_id=user_id, role=role, content=content, latency_ms=latency_ms)
                db.add(entry)
                db.commit()
            except Exception as e:
                logger.exception(f"❌ Ошибка логирования: {e}")
                db.rollback()
            finally:
                db.close()

        await asyncio.to_thread(save)
