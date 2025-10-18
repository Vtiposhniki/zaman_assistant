# services/whisper_service.py — Интеграция OpenAI Whisper
"""
Сервис для обработки аудио через Whisper API.
Поддерживает:
- Транскрибирование аудио в текст
- Кэширование результатов
- Обработку разных форматов (mp3, wav, m4a, flac, ogg)
- Встраивание в chat pipeline
"""
import logging
import httpx
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger("whisper_service")


class WhisperService:
    """Сервис для работы с Whisper API"""
    
    # Поддерживаемые форматы
    SUPPORTED_FORMATS = {"mp3", "wav", "m4a", "flac", "ogg", "webm"}
    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB (лимит API)
    
    def __init__(self, url: str, api_key: str, mock_mode: bool = False):
        """
        Args:
            url: URL OpenAI Hub
            api_key: API ключ
            mock_mode: Режим моков для тестирования
        """
        self.url = url
        self.api_key = api_key
        self.mock_mode = mock_mode
        self.headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    
    async def transcribe(
        self,
        file_path: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None
    ) -> Tuple[str, float]:
        """
        Транскрибирование аудио файла в текст.
        
        Args:
            file_path: Путь к аудио файлу
            language: Код языка (например: "ru" для русского)
            prompt: Опциональный контекст для улучшения результата
        
        Returns:
            Tuple[transcribed_text, latency_ms]
        
        Raises:
            ValueError: Если формат не поддерживается или файл слишком большой
            HTTPException: При ошибке API
        """
        import time
        start = time.time()
        
        # Валидация файла
        self._validate_file(file_path)
        
        if self.mock_mode:
            transcription = self._mock_transcribe(file_path)
            latency = (time.time() - start) * 1000
            return transcription, latency
        
        try:
            # Чтение файла
            with open(file_path, "rb") as f:
                file_content = f.read()
            
            # Подготовка данных для multipart request
            files = {
                "file": (Path(file_path).name, file_content),
                "model": (None, "whisper-1")
            }
            
            # Опциональные параметры
            data = {}
            if language:
                data["language"] = language
            if prompt:
                data["prompt"] = prompt
            
            # Запрос к Whisper API
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{self.url}/v1/audio/transcriptions",
                    headers=self.headers,
                    files=files,
                    data=data
                )
                response.raise_for_status()
                result = response.json()
                
                transcription = result.get("text", "")
                latency = (time.time() - start) * 1000
                
                logger.info(f"Transcribed: {Path(file_path).name} ({len(transcription)} chars)")
                return transcription, latency
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Whisper API error {e.response.status_code}: {e.response.text}")
            raise Exception(f"Whisper API error: {e.response.text}")
        
        except Exception as e:
            logger.exception(f"Transcription failed: {e}")
            raise
    
    async def translate(
        self,
        file_path: str,
        prompt: Optional[str] = None
    ) -> Tuple[str, float]:
        """
        Транскрибирование и перевод на английский.
        
        Args:
            file_path: Путь к аудио файлу
            prompt: Опциональный контекст
        
        Returns:
            Tuple[translated_text, latency_ms]
        """
        import time
        start = time.time()
        
        self._validate_file(file_path)
        
        if self.mock_mode:
            translation = f"[MOCK] Translated from: {Path(file_path).name}"
            latency = (time.time() - start) * 1000
            return translation, latency
        
        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
            
            files = {
                "file": (Path(file_path).name, file_content),
                "model": (None, "whisper-1")
            }
            
            data = {}
            if prompt:
                data["prompt"] = prompt
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    f"{self.url}/v1/audio/translations",
                    headers=self.headers,
                    files=files,
                    data=data
                )
                response.raise_for_status()
                result = response.json()
                
                translation = result.get("text", "")
                latency = (time.time() - start) * 1000
                
                logger.info(f"Translated: {Path(file_path).name}")
                return translation, latency
        
        except Exception as e:
            logger.exception(f"Translation failed: {e}")
            raise
    
    def _validate_file(self, file_path: str):
        """Валидация аудио файла"""
        path = Path(file_path)
        
        # Проверка существования
        if not path.exists():
            raise ValueError(f"File not found: {file_path}")
        
        # Проверка расширения
        ext = path.suffix.lstrip(".").lower()
        if ext not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported format: {ext}. "
                f"Supported: {', '.join(self.SUPPORTED_FORMATS)}"
            )
        
        # Проверка размера
        file_size = path.stat().st_size
        if file_size > self.MAX_FILE_SIZE:
            raise ValueError(
                f"File too large: {file_size / 1024 / 1024:.1f}MB. "
                f"Maximum: {self.MAX_FILE_SIZE / 1024 / 1024:.0f}MB"
            )
        
        logger.debug(f"File validated: {path.name} ({file_size / 1024:.1f}KB)")
    
    def _mock_transcribe(self, file_path: str) -> str:
        """Моковый результат для тестирования"""
        return f"Здравствуйте! Я слышу файл {Path(file_path).name}. Помогите мне с финансовым планированием."


# ===== CACHING LAYER =====
class WhisperCacheService:
    """Whisper с кэшированием результатов"""
    
    def __init__(self, whisper_service: WhisperService, cache_manager):
        self.whisper = whisper_service
        self.cache = cache_manager
    
    async def transcribe_cached(
        self,
        file_path: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None
    ) -> dict:
        """
        Транскрибирование с кэшированием результата.
        
        Args:
            file_path: Путь к файлу
            language: Язык
            prompt: Контекст
        
        Returns:
            dict с результатом и метаданными
        """
        from pathlib import Path
        import hashlib
        
        # Генерация ключа кэша на основе файла и параметров
        file_hash = hashlib.sha256(
            Path(file_path).read_bytes()
        ).hexdigest()[:16]
        
        cache_key = f"{file_hash}_{language}_{prompt[:20] if prompt else ''}"
        
        # Проверка кэша
        cached = await self.cache.get("whisper", cache_key)
        if cached:
            logger.info(f"Whisper cache hit for {Path(file_path).name}")
            return {
                "text": cached,
                "from_cache": True,
                "latency_ms": 5
            }
        
        # Транскрибирование
        transcription, latency = await self.whisper.transcribe(
            file_path=file_path,
            language=language,
            prompt=prompt
        )
        
        # Кэширование результата
        await self.cache.set("whisper", cache_key, transcription)
        
        return {
            "text": transcription,
            "from_cache": False,
            "latency_ms": round(latency, 2)
        }


# ===== INTEGRATION WITH CHAT =====
async def process_audio_message(
    audio_path: str,
    whisper_service: WhisperService,
    chat_service,
    cache_manager,
    user_id: Optional[int] = None,
    language: str = "ru"
) -> dict:
    """
    Полный pipeline: аудио → текст → чат ответ
    
    Args:
        audio_path: Путь к аудио файлу
        whisper_service: Whisper сервис
        chat_service: Chat сервис
        cache_manager: Кэш менеджер
        user_id: ID пользователя
        language: Язык аудио
    
    Returns:
        dict с ответом и метаданными
    """
    import time
    
    # Этап 1: Транскрибирование
    cached_whisper = WhisperCacheService(whisper_service, cache_manager)
    
    whisper_start = time.time()
    transcription_result = await cached_whisper.transcribe_cached(
        file_path=audio_path,
        language=language,
        prompt="Это сообщение от клиента банка Zaman Bank"
    )
    whisper_time = (time.time() - whisper_start) * 1000
    
    transcribed_text = transcription_result["text"]
    logger.info(f"Transcribed: {transcribed_text[:100]}...")
    
    # Этап 2: Обработка через чат
    chat_start = time.time()
    chat_response = await chat_service.process_message(
        messages=[
            {"role": "user", "content": transcribed_text}
        ],
        user_id=user_id
    )
    chat_time = (time.time() - chat_start) * 1000
    
    return {
        "status": "success",
        "transcription": {
            "text": transcribed_text,
            "from_cache": transcription_result["from_cache"],
            "latency_ms": whisper_time
        },
        "response": {
            "text": chat_response["reply"],
            "latency_ms": chat_response["latency_ms"]
        },
        "total_latency_ms": round(whisper_time + chat_response["latency_ms"], 2),
        "user_id": user_id
    }