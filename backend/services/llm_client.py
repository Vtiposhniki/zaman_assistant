# services/llm_client.py — Клиент для LLM (с поддержкой стриминга)
import time
import asyncio
import hashlib
import logging
from typing import List, Dict, Tuple, Optional

import httpx
import numpy as np

logger = logging.getLogger("llm_client")


class LLMClient:
    """Клиент для работы с LLM (OpenAI Hub совместим)"""

    def __init__(self, url: str, api_key: str, mock_mode: bool = False):
        self.url = url
        self.api_key = api_key
        self.mock_mode = mock_mode
        self.headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o-mini",
        max_tokens: int = 500,
        temperature: float = 0.7,
        stream: bool = False
    ) -> Tuple[str, float]:
        """
        Основной метод генерации ответа.
        Возвращает (reply_text, latency_ms)
        """
        start = time.time()

        # 🧪 Mock режим
        if self.mock_mode:
            reply = await self._mock_completion(messages)
            latency = (time.time() - start) * 1000
            return reply, latency

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                r = await client.post(
                    f"{self.url}/v1/chat/completions",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json=payload
                )
                r.raise_for_status()
                data = r.json()

                # ✅ Извлекаем текст из ответа OpenAI-совместимого API
                if "choices" in data and len(data["choices"]) > 0:
                    reply_text = data["choices"][0]["message"].get("content", "")
                else:
                    reply_text = "Ответ модели отсутствует."

                latency = (time.time() - start) * 1000
                return reply_text, latency

        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API error {e.response.status_code}: {e.response.text}")
            latency = (time.time() - start) * 1000
            return "Сервис временно недоступен, попробуйте позже.", latency

        except Exception as e:
            logger.exception(f"❌ Ошибка LLM: {e}")
            latency = (time.time() - start) * 1000
            return "Произошла ошибка при обращении к AI.", latency

    async def _mock_completion(self, messages: List[Dict[str, str]]) -> str:
        """Моковый ответ для тестирования (offline mode)."""
        await asyncio.sleep(0.2)

        user_text = ""
        for m in messages:
            if m.get("role") == "user":
                user_text = m.get("content", "").lower()

        if "цель" in user_text or "накопить" in user_text:
            return "Отличная цель! Советую откладывать по 160 000 KZT в месяц, чтобы достичь её за 5 лет."
        elif "анализ" in user_text or "расход" in user_text:
            return "Ваши расходы распределены так: продукты 40%, жильё 25%, транспорт 15%. Можно сократить кафе на 10%."
        elif "депозит" in user_text:
            return "Рекомендую депозит 'Выгодный' — 17% годовых, срок от 6 месяцев."
        elif "кредит" in user_text:
            return "У нас доступны кредиты: беззалоговый до 10 млн, ипотека до 50 млн, бизнес-кредит до 100 млн."
        else:
            return "Здравствуйте! Я Zaman Assistant — помогу с анализом расходов, планированием целей и советами."

    async def get_embedding(self, text: str, model: str = "text-embedding-3-small") -> Optional[List[float]]:
        """Получение embedding для текста"""
        if self.mock_mode:
            return self._mock_embedding(text)

        payload = {"model": model, "input": text}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.post(
                    f"{self.url}/v1/embeddings",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json=payload
                )
                r.raise_for_status()
                data = r.json()
                if "data" in data and data["data"]:
                    return data["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Embedding request failed: {e}")
        return None

    def _mock_embedding(self, text: str, dim: int = 1536) -> List[float]:
        """Детерминированный mock embedding"""
        seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.random(dim).tolist()
