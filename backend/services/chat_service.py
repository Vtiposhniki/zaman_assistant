# services/chat_service.py — Сервис для чата с AI (v2.3 FIXED)
import json
import asyncio
import logging
import time
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
    # 💬 WebSocket чат с потоковой передачей (FIXED)
    # =====================================================
    async def process_websocket_message(
        self,
        message: dict,
        user_id: int,
        websocket: WebSocket,
        system_prompt: Optional[str] = None,
        context: Optional[dict] = None
    ) -> Optional[dict]:
        """
        Обработка WebSocket-сообщения с поддержкой стриминга.
        
        ВАЖНО: Этот метод сам отправляет ответ через websocket!
        Возвращает результат только для логирования.
        """
        logger.info(f"💬 [ChatService] process_websocket_message вызван (user_id={user_id})")

        content = message.get("content", "").strip()
        if not content:
            logger.warning("⚠️ Пустое содержимое сообщения")
            await websocket.send_json({"error": "Пустое сообщение"})
            return None

        logger.info(f"🧾 Входящее сообщение: {content[:100]}...")

        try:
            # 1️⃣ Проверка FAQ
            faq_answer = self._find_faq_answer(content)
            if faq_answer:
                logger.info(f"📋 FAQ ответ найден")
                await websocket.send_json({
                    "type": "faq",
                    "reply": faq_answer,
                    "done": True
                })
                asyncio.create_task(
                    self._log_conversation_async(user_id, "user", content)
                )
                asyncio.create_task(
                    self._log_conversation_async(user_id, "assistant", faq_answer, 0)
                )
                return {"reply": faq_answer, "type": "faq"}

            # 2️⃣ Проверка кэша
            cached = await self.cache.get("chat", content)
            if cached:
                logger.info(f"⚡ Кэш попадание для: {content[:50]}...")
                await websocket.send_json({
                    "type": "cached",
                    "reply": cached,
                    "done": True
                })
                asyncio.create_task(
                    self._log_conversation_async(user_id, "user", content)
                )
                asyncio.create_task(
                    self._log_conversation_async(user_id, "assistant", cached, 0)
                )
                return {"reply": cached, "type": "cached"}

            # 3️⃣ Подготовка сообщений для LLM
            sys_prompt = {
                "role": "system",
                "content": self._build_system_prompt(system_prompt, context)
            }
            messages = [sys_prompt, {"role": "user", "content": content}]

            logger.info(f"⚙️ Запрос в LLMClient для user_id={user_id}...")
            
            start_time = time.time()
            reply_text, latency = await self.llm.chat_completion(messages)
            logger.info(f"✅ Ответ от LLMClient ({latency:.2f} ms): {reply_text[:150]}")

            # 4️⃣ Стриминг ответа частями через WebSocket
            chunk_size = 80
            full_reply = ""
            
            for i in range(0, len(reply_text), chunk_size):
                chunk = reply_text[i:i + chunk_size]
                full_reply += chunk
                is_last = (i + chunk_size) >= len(reply_text)

                try:
                    await websocket.send_json({
                        "type": "stream",
                        "reply": chunk,
                        "done": is_last,
                        "latency_ms": latency if i == 0 else 0
                    })
                    logger.debug(f"📤 Отправлен чанк {i//chunk_size + 1}")
                except Exception as e:
                    logger.error(f"❌ Ошибка отправки чанка: {e}")
                    break
                
                # Имитация потока (небольшая задержка)
                await asyncio.sleep(0.03)

            # 5️⃣ Финальное завершающее сообщение
            try:
                await websocket.send_json({
                    "type": "stream",
                    "reply": full_reply,
                    "done": True,
                    "latency_ms": latency
                })
                logger.info(f"✅ Финальный ответ отправлен пользователю {user_id}")
            except Exception as e:
                logger.error(f"❌ Ошибка отправки финального сообщения: {e}")

            # 6️⃣ Кэширование и логирование
            await self.cache.set("chat", content, full_reply)
            asyncio.create_task(
                self._log_conversation_async(user_id, "user", content)
            )
            asyncio.create_task(
                self._log_conversation_async(user_id, "assistant", full_reply, latency)
            )

            logger.info(f"📊 Обработка завершена. Ответ: {len(full_reply)} символов")
            
            return {
                "reply": full_reply,
                "latency_ms": latency,
                "status": "success"
            }

        except Exception as e:
            logger.exception(f"💥 Ошибка обработки WebSocket сообщения: {e}")
            try:
                await websocket.send_json({
                    "error": f"Внутренняя ошибка: {str(e)}",
                    "type": "error"
                })
            except Exception as send_err:
                logger.error(f"❌ Не удалось отправить ошибку: {send_err}")
            return None

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
    async def _log_conversation_async(
        self,
        user_id: Optional[int],
        role: str,
        content: str,
        latency_ms: Optional[float] = None
    ):
        """Асинхронное логирование в базу."""
        if not self.db:
            logger.debug("Database not available for logging")
            return

        from database import SessionLocal

        def save():
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
                logger.debug(f"✅ Лог сохранён: {role} ({len(content)} символов)")
            except Exception as e:
                logger.exception(f"❌ Ошибка логирования: {e}")
                db.rollback()
            finally:
                db.close()

        await asyncio.to_thread(save)