# api/routes/audio.py - Whisper + TTS Audio Processing (Updated)
"""
Endpoints для обработки аудио через Whisper API и TTS.
"""
import os
import tempfile
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Query, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import get_db, ConversationLog, Metric
from services.whisper_service import WhisperService, process_audio_message
from services.tts_service import TTSService
from services.chat_service import ChatService
from services.rate_limiter import RateLimiter
from api.dependencies import (
    get_whisper_service, 
    get_chat_service, 
    get_cache_manager, 
    get_rate_limiter,
    get_services_manager
)

router = APIRouter()


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Query("ru", description="Language code (ru, en, etc)"),
    request: Request = None,
    db: Session = Depends(get_db),
    whisper_service: WhisperService = Depends(get_whisper_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Транскрибирование аудио файла в текст.
    
    **Supported formats:** mp3, wav, m4a, flac, ogg, webm
    
    **Response:**
    ```json
    {
        "text": "Транскрибированный текст...",
        "filename": "audio.mp3",
        "language": "ru",
        "latency_ms": 1250.5,
        "status": "success"
    }
    ```
    """
    await rate_limiter.check_limit(request.client.host)
    
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are supported")
    
    try:
        # Сохранение временного файла
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Транскрибирование
        transcription, latency = await whisper_service.transcribe(
            file_path=tmp_path,
            language=language
        )
        
        # Удаление временного файла
        os.unlink(tmp_path)
        
        # Логирование в БД
        if db:
            metric = Metric(
                metric_name="audio_transcribed",
                value=float(len(transcription)),
                metric_metadata={"language": language, "filename": file.filename}
            )
            db.add(metric)
            db.commit()
        
        return {
            "text": transcription,
            "filename": file.filename,
            "language": language,
            "latency_ms": round(latency, 2),
            "status": "success"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Transcription service error")


@router.post("/translate")
async def translate_audio(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    whisper_service: WhisperService = Depends(get_whisper_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Транскрибирование и перевод на английский.
    
    **Response:**
    ```json
    {
        "text": "Translated English text...",
        "filename": "audio.mp3",
        "latency_ms": 1350.2,
        "status": "success"
    }
    ```
    """
    await rate_limiter.check_limit(request.client.host)
    
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Перевод
        translation, latency = await whisper_service.translate(file_path=tmp_path)
        
        os.unlink(tmp_path)
        
        if db:
            metric = Metric(
                metric_name="audio_translated",
                value=float(len(translation)),
                metric_metadata={"filename": file.filename}
            )
            db.add(metric)
            db.commit()
        
        return {
            "text": translation,
            "filename": file.filename,
            "latency_ms": round(latency, 2),
            "status": "success"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail="Translation service error")


@router.post("/message")
async def audio_to_chat(
    file: UploadFile = File(...),
    user_id: Optional[int] = Query(None),
    language: Optional[str] = Query("ru"),
    request: Request = None,
    db: Session = Depends(get_db),
    whisper_service: WhisperService = Depends(get_whisper_service),
    chat_service: ChatService = Depends(get_chat_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Полный pipeline: аудио → транскрибирование → AI ответ.
    
    Клиент говорит, система слушает и отвечает.
    
    **Response:**
    ```json
    {
        "status": "success",
        "transcription": "...",
        "reply": "AI ответ...",
        "total_latency_ms": 2050.7
    }
    ```
    """
    await rate_limiter.check_limit(request.client.host)
    
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Полный pipeline
        cache_mgr = get_cache_manager()
        
        result = await process_audio_message(
            audio_path=tmp_path,
            whisper_service=whisper_service,
            chat_service=chat_service,
            cache_manager=cache_mgr,
            user_id=user_id,
            language=language
        )
        
        os.unlink(tmp_path)
        
        # Логирование в БД
        if db and result:
            log = ConversationLog(
                user_id=user_id,
                role="user",
                content=result["transcription"]["text"],
                latency_ms=result["transcription"]["latency_ms"]
            )
            db.add(log)
            
            log_response = ConversationLog(
                user_id=user_id,
                role="assistant",
                content=result["response"]["text"],
                latency_ms=result["response"]["latency_ms"]
            )
            db.add(log_response)
            db.commit()
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Audio processing service error")


@router.post("/speak")
async def text_to_speech(
    data: dict,
    request: Request,
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Преобразование текста в речь (TTS).
    
    **Request Body:**
    ```json
    {
        "text": "Текст для озвучивания",
        "voice": "alloy",
        "speed": 1.0
    }
    ```
    
    **Voices:** alloy, echo, fable, onyx, nova, shimmer
    
    **Response:** Audio file (audio/mpeg)
    """
    await rate_limiter.check_limit(request.client.host)
    
    try:
        text = data.get("text", "")
        voice = data.get("voice", "alloy")
        speed = data.get("speed", 1.0)
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        # Получение TTS сервиса
        services = get_services_manager()
        tts_service = services.tts_service
        
        # Генерация аудио
        audio_data = await tts_service.text_to_speech(
            text=text,
            voice=voice,
            speed=speed
        )
        
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")