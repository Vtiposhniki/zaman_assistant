# services/llm_client.py — LLM клиент с dependency injection
"""
Абстракция для работы с LLM.
Поддерживает MOCK режим и реальные вызовы к OpenAI Hub.
"""
import time
import asyncio
import hashlib
import logging
from typing import List, Dict, Tuple, Optional

import httpx
import numpy as np

logger = logging.getLogger("llm_client")


class LLMClient:
    """Клиент для работы с LLM"""
    
    def __init__(self, url: str, api_key: str, mock_mode: bool = False):
        """
        Args:
            url: URL OpenAI Hub
            api_key: API ключ
            mock_mode: Режим моков (без реальных вызовов)
        """
        self.url = url
        self.api_key = api_key
        self.mock_mode = mock_mode
        self.headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o-mini",
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> Tuple[str, float]:
        """
        Вызов chat completion.
        
        Args:
            messages: История сообщений
            model: Модель
            max_tokens: Максимум токенов
            temperature: Температура генерации
        
        Returns:
            Tuple[response_text, latency_ms]
        """
        start = time.time()
        
        if self.mock_mode:
            response = await self._mock_completion(messages)
            latency = (time.time() - start) * 1000
            return response, latency
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    f"{self.url}/v1/chat/completions",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json=payload
                )
                r.raise_for_status()
                data = r.json()
                
                response = ""
                if "choices" in data and len(data["choices"]) > 0:
                    response = data["choices"][0]["message"].get("content", "")
                else:
                    response = f"Unexpected API response: {data}"
                
                latency = (time.time() - start) * 1000
                return response, latency
                
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API error {e.response.status_code}: {e.response.text}")
            latency = (time.time() - start) * 1000
            return "Извините, возникла временная проблема с сервисом. Попробуйте позже.", latency
            
        except Exception as e:
            logger.exception(f"LLM call failed: {e}")
            latency = (time.time() - start) * 1000
            return "Извините, произошла ошибка при обработке запроса.", latency
    
    async def _mock_completion(self, messages: List[Dict[str, str]]) -> str:
        """
        Моковый ответ для тестирования.
        """
        await asyncio.sleep(0.15)  # Имитация задержки
        
        # Извлечение последнего user message
        user_text = ""
        for m in messages:
            if m.get("role") == "user":
                user_text = m.get("content", "")
        
        ut_lower = user_text.lower()
        
        # Простые правила для моков
        if "цель" in ut_lower or "накопить" in ut_lower:
            return "Отличная цель! Примерный план: откладывать 166,000 KZT/мес в течение 5 лет. Рекомендую депозит 'Выгодный' (17% годовых)."
        
        elif "транзакц" in ut_lower or "расход" in ut_lower:
            return "Анализ расходов: продукты 35%, транспорт 20%, развлечения 15%. Сократив траты на кафе на 20% — можно откладывать +25,000 KZT/мес."
        
        elif "стресс" in ut_lower or "тревог" in ut_lower:
            return "Понимаю ваше беспокойство. Попробуйте: прогулку 10 мин, дыхательное упражнение 4-7-8, отложите крупные решения на 48 часов."
        
        elif "кредит" in ut_lower:
            return "У нас 3 варианта: беззалоговый (до 10млн, 3-60 мес), залоговый (больше суммы), бизнес-карта (овердрафт). Какой интересует?"
        
        elif "депозит" in ut_lower:
            return "Лучший вариант — депозит 'Выгодный': 17% годовых, от 500,000 KZT, срок 3-12 месяцев. Овернайт даёт 12% но требует от 1 млн."
        
        else:
            return "Здравствуйте! Я Zaman Assistant — помогу с финансовым планированием, анализом расходов и подбором продуктов. Чем могу помочь?"
    
    async def get_embedding(self, text: str, model: str = "text-embedding-3-small") -> Optional[List[float]]:
        """
        Получение embedding для текста.
        
        Args:
            text: Текст для эмбеддинга
            model: Модель embeddings
        
        Returns:
            Вектор или None при ошибке
        """
        if self.mock_mode:
            return self._mock_embedding(text)
        
        payload = {"model": model, "input": text}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    f"{self.url}/v1/embeddings",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json=payload
                )
                r.raise_for_status()
                data = r.json()
                
                if "data" in data and len(data["data"]) > 0:
                    return data["data"][0].get("embedding")
                return None
                
        except Exception as e:
            logger.error(f"Embedding request failed: {e}")
            return None
    
    def _mock_embedding(self, text: str, dim: int = 1536) -> List[float]:
        """
        Детерминированный mock embedding.
        """
        # Используем hash текста как seed
        seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.random(dim).tolist()