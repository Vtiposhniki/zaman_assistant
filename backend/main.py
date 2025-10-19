# main.py — ZAMAN Assistant Backend (v3.1 — Stable Full Build)
import os
import sys
print("Python path:", sys.path, flush=True)
print("Starting app...", flush=True)
import asyncio
import logging
import tempfile
from services.tts_service import TTSService
from datetime import datetime
from typing import Optional

from fastapi import (
    FastAPI, HTTPException, UploadFile, File, Request, Depends,
    WebSocket, WebSocketDisconnect, Header, Query
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# ===== PROJECT MODULE IMPORTS =====
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
    WhisperService, process_audio_message
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

# ===== SERVICE INITIALIZATION =====
cache_manager = CacheManager(ttl_seconds=3600)
llm_client = LLMClient(
    url=settings.OPENAI_HUB_URL,
    api_key=settings.OPENAI_HUB_KEY,
    mock_mode=settings.MOCK_MODE
)
rate_limiter = RateLimiter(max_requests=200, window_seconds=3600)
whisper_service = None  # lazy init on startup

# ===== FASTAPI APP =====
app = FastAPI(
    title="Zaman Assistant",
    version="3.1.0",
    description="AI-powered financial assistant for Zaman Bank"
)

# ===== CORS MIDDLEWARE (MUST BE FIRST!) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== CONNECTION MANAGER =====
class ConnectionManager:
    def __init__(self):
        self.active_connections = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)
        logger.info(f"📡 Connected WS (total: {len(self.active_connections)})")

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"🔌 Disconnected WS (total: {len(self.active_connections)})")

manager = ConnectionManager()

# ===== STARTUP =====
@app.on_event("startup")
async def startup_event():
    global whisper_service
    # TTS init
    tts_service = TTSService(
        url=settings.OPENAI_HUB_URL,
        api_key=settings.OPENAI_HUB_KEY,
        mock_mode=settings.MOCK_MODE
    )
    logger.info("✅ TTS initialized")
    logger.info("🚀 Starting Zaman Assistant v3.1")

    # DB init
    init_db()
    logger.info("✅ Database initialized")

    # Embeddings building (background)
    from config import PRODUCTS
    if PRODUCTS:
        asyncio.create_task(build_index_from_products(PRODUCTS, llm_client))
        logger.info(f"📦 Building embeddings for {len(PRODUCTS)} products...")

    # Background tasks
    asyncio.create_task(rate_limiter.cleanup_task())
    asyncio.create_task(cache_manager.cleanup_task())

    # Whisper init
    whisper_service = WhisperService(
        url=settings.OPENAI_HUB_URL,
        api_key=settings.OPENAI_HUB_KEY,
        mock_mode=settings.MOCK_MODE
    )
    logger.info("✅ Whisper initialized")

# ===== SHUTDOWN =====
@app.on_event("shutdown")
async def shutdown_event():
    if EMB_INDEX.index:
        EMB_INDEX.save()
    logger.info("🛑 Zaman Assistant shutdown complete")

# ===== DEPENDENCIES =====
def get_services(db: Session = Depends(get_db)):
    return {
        "goal": GoalService(db, llm_client),
        "chat": ChatService(db, llm_client, cache_manager),
        "recommendation": RecommendationService(db, llm_client),
        "analytics": AnalyticsService(db, llm_client)
    }

# ============================================================
# HEALTH
# ============================================================
@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    from sqlalchemy import func
    try:
        total_goals = db.query(func.count(Goal.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0

        return {
            "status": "healthy",
            "version": "3.1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {"connected": True, "goals": total_goals, "users": total_users},
            "cache": cache_manager.stats(),
            "embeddings": {"ready": len(EMB_INDEX.index) > 0},
            "websockets": {"active": len(manager.active_connections)}
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# ============================================================
# GOALS
# ============================================================
@app.post("/goals/create", response_model=GoalResponse)
async def create_goal(req: CreateGoalReq, request: Request, services: dict = Depends(get_services)):
    await rate_limiter.check_limit(request.client.host)
    return await services["goal"].create_goal_with_tips(req)

@app.get("/goals")
async def list_goals(user_id: Optional[int] = None, status: Optional[str] = None, services: dict = Depends(get_services)):
    goals = await services["goal"].get_goals(user_id=user_id, status=status)
    return {"goals": goals, "total": len(goals)}

@app.put("/goals/{goal_id}")
async def update_goal(goal_id: int, current_savings: Optional[float] = None, status: Optional[str] = None, services: dict = Depends(get_services)):
    return {"goal": await services["goal"].update_goal(goal_id, current_savings, status), "message": "Goal updated"}

@app.delete("/goals/{goal_id}")
async def delete_goal(goal_id: int, services: dict = Depends(get_services)):
    await services["goal"].delete_goal(goal_id)
    return {"message": "Goal deleted"}

# ============================================================
# CHAT (REST)
# ============================================================
@app.post("/chat")
async def chat(req: ChatReq, request: Request, services: dict = Depends(get_services)):
    await rate_limiter.check_limit(request.client.host)
    return await services["chat"].process_message(messages=req.messages, user_id=req.user_id)

# ============================================================
# CHAT (WEBSOCKET)
# ============================================================
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    await manager.connect(websocket)
    chat_service = ChatService(None, llm_client, cache_manager)
    user_context = {}

    try:
        while True:
            message = await websocket.receive_json()
            logger.info(f"📩 WS message from user {user_id}: {message}")

            # Контекст
            if message.get("type") == "context":
                user_context = message.get("data", {})
                await websocket.send_json({"reply": "Контекст обновлён ✅"})
                continue

            # Режим ассистента
            mode = message.get("mode", "mentor")
            if mode == "analyst":
                system_prompt = "Ты — финансовый аналитик Zaman. Отвечай строго и по цифрам, используй контекст."
            elif mode == "friend":
                system_prompt = "Ты — дружелюбный ассистент Zaman. Отвечай тепло, с юмором, как хороший друг."
            elif mode == "tech":
                system_prompt = "Ты — технический эксперт Zaman. Отвечай кратко и по делу."
            else:
                system_prompt = "Ты — ментор Zaman. Мотивируй и вдохновляй, ссылайся на цели пользователя."

            # Вызов ChatService
            try:
                logger.info(f"⚙️ Вызываем ChatService.process_websocket_message для user_id={user_id}")

                result = await chat_service.process_websocket_message(
                    message=message,
                    user_id=user_id,
                    websocket=websocket,
                    system_prompt=system_prompt,
                    context=user_context
                )

                logger.info(f"📤 Ответ от ChatService для {user_id}: {('present' if result else 'none')}")

            except Exception as e:
                logger.exception("❌ WS message error")
                try:
                    await websocket.send_json({"error": f"Internal error: {str(e)}"})
                except Exception:
                    logger.exception("Failed to send error to websocket")
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        logger.info(f"🔌 User {user_id} disconnected")
    except Exception as e:
        await manager.disconnect(websocket)
        logger.exception(f"💥 WebSocket error: {e}")

# ============================================================
# RECOMMENDATIONS
# ============================================================
@app.post("/recommend")
async def recommend_products(req: RecommendReq, request: Request, services: dict = Depends(get_services)):
    await rate_limiter.check_limit(request.client.host)
    return await services["recommendation"].get_recommendations(
        goal_amount=req.goal_amount, months=req.months,
        age=req.age, goal_type=req.goal_type,
        use_semantic_search=req.use_semantic_search
    )

# ============================================================
# ANALYTICS
# ============================================================
@app.post("/analyze_expenses")
async def analyze_expenses(file: UploadFile = File(...), user_id: Optional[int] = None,
                           monthly_income: Optional[float] = None, services: dict = Depends(get_services),
                           request: Request = None):
    await rate_limiter.check_limit(request.client.host)
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV supported")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    result = await services["analytics"].analyze_transactions(tmp_path, user_id, monthly_income)
    os.unlink(tmp_path)
    return result

# ============================================================
# AUDIO (Whisper)
# ============================================================
@app.post("/audio/message")
async def audio_message(file: UploadFile = File(...), user_id: Optional[int] = Query(None),
                        language: Optional[str] = Query("ru"), db: Session = Depends(get_db)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Only audio files supported")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tmp.write(await file.read())
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
    return result

# ============================================================
# TTS (Text-to-Speech)
# ============================================================
@app.post("/audio/speak")
async def text_to_speech(request: Request):
    """Convert text to speech"""
    await rate_limiter.check_limit(request.client.host)
    
    try:
        data = await request.json()
        text = data.get("text", "")
        voice = data.get("voice", "alloy")
        speed = data.get("speed", 1.0)
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
            
        audio_data = await tts_service.text_to_speech(
            text=text,
            voice=voice,
            speed=speed
        )
        
        from fastapi.responses import Response
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    except Exception as e:
        logger.exception(f"❌ TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# FEEDBACK
# ============================================================
@app.post("/feedback")
async def feedback(req: FeedbackReq, db: Session = Depends(get_db)):
    metric = Metric(metric_name="user_feedback", value=float(req.rating),
                    metric_metadata={"comment": req.comment, "user_id": req.user_id})
    db.add(metric)
    db.commit()
    return {"message": "Спасибо за отзыв!", "status": "received"}

# ============================================================
# ADMIN
# ============================================================
@app.get("/stats/dashboard")
async def dashboard(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total_goals = db.query(func.count(Goal.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    return {
        "overview": {"users": total_users, "goals": total_goals},
        "cache": cache_manager.stats(),
        "websockets": len(manager.active_connections)
    }

@app.delete("/admin/reset_db")
async def reset_db(confirm: str = "", db: Session = Depends(get_db)):
    if confirm != "yes_i_am_sure":
        raise HTTPException(status_code=400, detail="Must confirm reset")
    db.query(Goal).delete()
    db.query(User).delete()
    db.query(ConversationLog).delete()
    db.query(Metric).delete()
    db.commit()
    asyncio.create_task(cache_manager.clear_all())
    return {"message": "Database reset complete"}
# Добавьте в секцию импортов после других сервисов:
from services.tts_service import TTSService

# Добавьте после whisper_service в startup_event:
tts_service = None
whisper_service = None

@app.on_event("startup")
async def startup_event():
    global whisper_service, tts_service
    # ... существующий код ...
    
    # TTS init
    tts_service = TTSService(
        url=settings.OPENAI_HUB_URL,
        api_key=settings.OPENAI_HUB_KEY,
        mock_mode=settings.MOCK_MODE
    )
    logger.info("✅ TTS initialized")

# Добавьте новый endpoint для TTS:
@app.post("/audio/speak")
async def text_to_speech(
    request: Request,
    voice: str = "alloy",
    speed: float = 1.0
):
    """Convert text to speech"""
    await rate_limiter.check_limit(request.client.host)
    
    try:
        data = await request.json()
        text = data.get("text", "")
        voice = data.get("voice", voice)
        speed = data.get("speed", speed)
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
            
        audio_data = await tts_service.text_to_speech(
            text=text,
            voice=voice,
            speed=speed
        )
        
        from fastapi.responses import Response
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    except Exception as e:
        logger.exception(f"❌ TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# RUN
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=settings.DEBUG)