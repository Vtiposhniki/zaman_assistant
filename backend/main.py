# main.py — Zaman Assistant Backend (Refactored v3.0)
import os
import asyncio
import logging
import tempfile
import io
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Depends, WebSocket, WebSocketDisconnect, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# ===== ИМПОРТЫ ИЗ МОДУЛЕЙ ПРОЕКТА =====
from database import (
    Base, engine, get_db, init_db,
    User, Goal, ConversationLog, Metric
)
from embeddings import EMB_INDEX, build_index_from_products
from services.cache_manager import CacheManager
from services.llm_client import LLMClient
from services.goal_service import GoalService
from services.chat_service import ChatService
from services.recommendation_service import RecommendationService
from services.analytics_service import AnalyticsService
from services.whisper_service import (
    WhisperService,
    WhisperCacheService,
    process_audio_message
)
from services.rate_limiter import RateLimiter
from schemas import (
    CreateGoalReq, ChatReq, RecommendReq, 
    FeedbackReq, HealthResponse, GoalResponse
)
from config import settings

# ===== SETUP =====
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zaman_assistant")

# ===== ИНИЦИАЛИЗАЦИЯ СЕРВИСОВ =====
cache_manager = CacheManager(ttl_seconds=3600)
llm_client = LLMClient(
    url=settings.OPENAI_HUB_URL,
    api_key=settings.OPENAI_HUB_KEY,
    mock_mode=settings.MOCK_MODE
)
rate_limiter = RateLimiter(max_requests=200, window_seconds=3600)
whisper_service = None  # Инициализируется в startup

# ===== FASTAPI APP =====
app = FastAPI(
    title="Zaman Assistant",
    version="3.0.0",
    description="AI-powered financial assistant for Zaman Bank"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ===== WEBSOCKET CONNECTION MANAGER =====
class ConnectionManager:
    def __init__(self):
        self.active_connections = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)
        logger.info(f"📡 WebSocket connected. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"📡 WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        async with self.lock:
            for ws in list(self.active_connections):
                try:
                    await ws.send_text(message)
                except Exception as e:
                    logger.error(f"Broadcast error: {e}")

manager = ConnectionManager()

# ===== STARTUP & SHUTDOWN =====
@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    global whisper_service
    
    logger.info("🚀 Starting Zaman Assistant v3.0")
    
    # Инициализация БД
    init_db()
    logger.info("✅ Database initialized")
    
    # Загрузка продуктов и embeddings
    from config import PRODUCTS
    if PRODUCTS:
        asyncio.create_task(build_index_from_products(PRODUCTS, llm_client))
        logger.info(f"📦 Loading embeddings for {len(PRODUCTS)} products...")
    
    # Запуск фоновых задач
    asyncio.create_task(rate_limiter.cleanup_task())
    asyncio.create_task(cache_manager.cleanup_task())
    
    # Инициализация Whisper
    whisper_service = WhisperService(
        url=settings.OPENAI_HUB_URL,
        api_key=settings.OPENAI_HUB_KEY,
        mock_mode=settings.MOCK_MODE
    )
    logger.info("✅ Whisper service initialized")
    
    logger.info(f"🔧 MOCK_MODE: {settings.MOCK_MODE}")
    logger.info(f"💾 Database: {settings.DATABASE_URL}")

@app.on_event("shutdown")
async def shutdown_event():
    """Graceful shutdown"""
    logger.info("🛑 Shutting down Zaman Assistant")
    if EMB_INDEX.index:
        EMB_INDEX.save()
        logger.info("💾 Embeddings saved")

# ===== DEPENDENCY INJECTION =====
def get_services(db: Session = Depends(get_db)):
    """Создаёт сервисы с зависимостями"""
    return {
        "goal": GoalService(db, llm_client),
        "chat": ChatService(db, llm_client, cache_manager),
        "recommendation": RecommendationService(db, llm_client),
        "analytics": AnalyticsService(db, llm_client)
    }

# ===== HEALTH CHECK =====
@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Проверка состояния системы"""
    from sqlalchemy import func
    
    try:
        total_goals = db.query(func.count(Goal.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        return {
            "status": "healthy",
            "version": "3.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "mock_mode": settings.MOCK_MODE,
            "database": {
                "connected": True,
                "total_goals": total_goals,
                "total_users": total_users
            },
            "cache": {
                "entries": cache_manager.stats()["total_entries"],
                "hit_rate": cache_manager.stats().get("hit_rate", 0.0)
            },
            "embeddings": {
                "loaded": len(EMB_INDEX.index),
                "ready": len(EMB_INDEX.index) > 0
            },
            "websockets": {
                "active_connections": len(manager.active_connections)
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# ===== GOALS ENDPOINTS =====
@app.post("/goals/create", response_model=GoalResponse)
async def create_goal(
    req: CreateGoalReq,
    request: Request,
    services: dict = Depends(get_services)
):
    """Создание финансовой цели с AI-советами"""
    await rate_limiter.check_limit(request.client.host)
    
    try:
        result = await services["goal"].create_goal_with_tips(req)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Goal creation failed")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/goals")
async def list_goals(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    services: dict = Depends(get_services)
):
    """Получение списка целей"""
    goals = await services["goal"].get_goals(user_id=user_id, status=status)
    return {"goals": goals, "total": len(goals)}

@app.put("/goals/{goal_id}")
async def update_goal(
    goal_id: int,
    current_savings: Optional[float] = None,
    status: Optional[str] = None,
    services: dict = Depends(get_services)
):
    """Обновление прогресса цели"""
    try:
        goal = await services["goal"].update_goal(
            goal_id=goal_id,
            current_savings=current_savings,
            status=status
        )
        return {"goal": goal, "message": "Goal updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    services: dict = Depends(get_services)
):
    """Удаление цели"""
    try:
        await services["goal"].delete_goal(goal_id)
        return {"message": "Goal deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ===== CHAT ENDPOINTS =====
@app.post("/chat")
async def chat(
    req: ChatReq,
    request: Request,
    services: dict = Depends(get_services)
):
    """REST endpoint для чата"""
    await rate_limiter.check_limit(request.client.host)
    
    try:
        response = await services["chat"].process_message(
            messages=req.messages,
            user_id=req.user_id
        )
        return response
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail="Chat service error")

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    """WebSocket endpoint для real-time чата"""
    await manager.connect(websocket)
    chat_service = ChatService(None, llm_client, cache_manager)
    
    try:
        while True:
            message = await websocket.receive_json()
            await chat_service.process_websocket_message(
                message=message,
                user_id=user_id,
                websocket=websocket
            )
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        await manager.disconnect(websocket)

# ===== RECOMMENDATIONS =====
@app.post("/recommend")
async def recommend_products(
    req: RecommendReq,
    request: Request,
    services: dict = Depends(get_services)
):
    """Подбор финансовых продуктов"""
    await rate_limiter.check_limit(request.client.host)
    
    try:
        recommendations = await services["recommendation"].get_recommendations(
            goal_amount=req.goal_amount,
            months=req.months,
            age=req.age,
            goal_type=req.goal_type,
            use_semantic_search=req.use_semantic_search
        )
        return recommendations
    except Exception as e:
        logger.exception("Recommendation failed")
        raise HTTPException(status_code=500, detail="Recommendation service error")

# ===== PRODUCTS =====
@app.get("/products")
async def list_products(category: Optional[str] = None):
    """Список всех продуктов"""
    from config import PRODUCTS
    
    products = PRODUCTS
    if category:
        products = [p for p in PRODUCTS if category.lower() in p.get("type", "").lower()]
    
    categories = list({p.get("type") for p in PRODUCTS})
    
    return {
        "products": products,
        "total": len(products),
        "categories": categories
    }

# ===== ANALYTICS =====
@app.post("/analyze_expenses")
async def analyze_expenses(
    file: UploadFile = File(...),
    user_id: Optional[int] = None,
    monthly_income: Optional[float] = None,
    request: Request = None,
    services: dict = Depends(get_services)
):
    """Анализ расходов из CSV файла"""
    await rate_limiter.check_limit(request.client.host)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        analysis = await services["analytics"].analyze_transactions(
            csv_path=tmp_path,
            user_id=user_id,
            monthly_income=monthly_income
        )
        
        os.unlink(tmp_path)
        return analysis
        
    except Exception as e:
        logger.exception("Expense analysis failed")
        raise HTTPException(status_code=500, detail="Analysis service error")

# ===== AUDIO ENDPOINTS =====
@app.post("/audio/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Query("ru"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Транскрибирование аудио файла"""
    await rate_limiter.check_limit(request.client.host)
    
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        transcription, latency = await whisper_service.transcribe(
            file_path=tmp_path,
            language=language
        )
        
        os.unlink(tmp_path)
        
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
        logger.exception("Audio transcription failed")
        raise HTTPException(status_code=500, detail="Transcription service error")

@app.post("/audio/translate")
async def translate_audio(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Транскрибирование и перевод на английский"""
    await rate_limiter.check_limit(request.client.host)
    
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
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
        logger.exception("Audio translation failed")
        raise HTTPException(status_code=500, detail="Translation service error")

@app.post("/audio/message")
async def audio_to_chat(
    file: UploadFile = File(...),
    user_id: Optional[int] = Query(None),
    language: Optional[str] = Query("ru"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Полный pipeline: аудио → транскрибирование → AI ответ"""
    await rate_limiter.check_limit(request.client.host)
    
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        result = await process_audio_message(
            audio_path=tmp_path,
            whisper_service=whisper_service,
            chat_service=ChatService(db, llm_client, cache_manager),
            cache_manager=cache_manager,
            user_id=user_id,
            language=language
        )
        
        os.unlink(tmp_path)
        
        if db:
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
        logger.exception("Audio message processing failed")
        raise HTTPException(status_code=500, detail="Audio processing service error")

@app.websocket("/ws/audio/{user_id}")
async def websocket_audio(websocket: WebSocket, user_id: int):
    """WebSocket для real-time аудио обработки"""
    await manager.connect(websocket)
    
    try:
        audio_buffer = io.BytesIO()
        
        while True:
            data = await websocket.receive_bytes()
            
            if not data:
                continue
            
            audio_buffer.write(data)
            
            try:
                message = await websocket.receive_json()
                
                if message.get("action") == "process":
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                        tmp.write(audio_buffer.getvalue())
                        tmp_path = tmp.name
                    
                    try:
                        transcription, latency = await whisper_service.transcribe(
                            file_path=tmp_path,
                            language=message.get("language", "ru")
                        )
                        
                        await websocket.send_json({
                            "type": "transcription",
                            "text": transcription,
                            "latency_ms": round(latency, 2)
                        })
                        
                        chat_response = await ChatService(
                            None, llm_client, cache_manager
                        ).process_message(
                            messages=[{"role": "user", "content": transcription}],
                            user_id=user_id
                        )
                        
                        await websocket.send_json({
                            "type": "response",
                            "text": chat_response["reply"],
                            "latency_ms": chat_response["latency_ms"]
                        })
                        
                    finally:
                        os.unlink(tmp_path)
                    
                    audio_buffer = io.BytesIO()
            
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    
    except Exception as e:
        logger.exception(f"WebSocket audio error: {e}")
    finally:
        await manager.disconnect(websocket)

# ===== FEEDBACK =====
@app.post("/feedback")
async def submit_feedback(
    req: FeedbackReq,
    db: Session = Depends(get_db)
):
    """Отправка отзыва"""
    try:
        metric = Metric(
            metric_name="user_feedback",
            value=float(req.rating),
            metric_metadata={"comment": req.comment, "user_id": req.user_id}
        )
        db.add(metric)
        db.commit()
        
        return {
            "message": "Спасибо за отзыв!",
            "rating": req.rating,
            "status": "received"
        }
    except Exception as e:
        logger.exception("Feedback submission failed")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save feedback")

# ===== STATS & ADMIN =====
@app.get("/stats/dashboard")
async def dashboard_stats(db: Session = Depends(get_db)):
    """Статистика для дашборда"""
    from sqlalchemy import func
    
    try:
        total_goals = db.query(func.count(Goal.id)).scalar() or 0
        total_amount = db.query(func.sum(Goal.target_amount)).scalar() or 0
        avg_monthly = db.query(func.avg(Goal.monthly_needed)).scalar() or 0
        recent_goals = db.query(Goal).order_by(Goal.created_at.desc()).limit(5).all()
        
        return {
            "overview": {
                "total_goals": total_goals,
                "total_target_amount": round(float(total_amount), 2),
                "avg_monthly_savings": round(float(avg_monthly), 2),
                "active_users": db.query(func.count(User.id)).scalar() or 0
            },
            "recent_goals": [
                {
                    "id": g.id,
                    "name": g.name,
                    "amount": g.target_amount,
                    "progress": round((g.current_savings / g.target_amount) * 100, 1) if g.target_amount else 0,
                    "created": g.created_at.strftime("%Y-%m-%d")
                } for g in recent_goals
            ],
            "system_health": {
                "websocket_connections": len(manager.active_connections),
                "cache_entries": cache_manager.stats()["total_entries"],
                "embeddings_ready": len(EMB_INDEX.index) > 0
            }
        }
    except Exception as e:
        logger.exception("Dashboard stats failed")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

@app.get("/cache/stats")
async def cache_stats():
    """Статистика кэша"""
    return cache_manager.stats()

@app.get("/admin/logs")
async def get_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    x_admin_token: Optional[str] = Header(None)
):
    """Получение логов (только для админов)"""
    if settings.ADMIN_TOKEN and x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    logs = db.query(ConversationLog).order_by(ConversationLog.timestamp.desc()).limit(limit).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "role": log.role,
                "content": log.content[:200] + "..." if len(log.content) > 200 else log.content,
                "timestamp": log.timestamp.isoformat(),
                "latency_ms": log.latency_ms
            } for log in logs
        ]
    }

@app.delete("/admin/reset_db")
async def reset_database(
    confirm: str = "",
    db: Session = Depends(get_db),
    x_admin_token: Optional[str] = Header(None)
):
    """Сброс базы данных (ОПАСНО!)"""
    if settings.ADMIN_TOKEN and x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    if confirm != "yes_i_am_sure":
        raise HTTPException(
            status_code=400,
            detail="Must confirm with 'yes_i_am_sure'"
        )
    
    try:
        db.query(Goal).delete()
        db.query(ConversationLog).delete()
        db.query(Metric).delete()
        db.query(User).delete()
        db.commit()
        
        await cache_manager.clear_all()
        
        logger.warning("⚠️ Database reset performed!")
        
        return {"message": "Database and cache reset successful"}
    except Exception as e:
        logger.exception("Database reset failed")
        db.rollback()
        raise HTTPException(status_code=500, detail="Reset failed")

# ===== RUN =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=settings.DEBUG
    )