# api/routes/chat.py - Chat + WebSocket Endpoints
"""
REST и WebSocket endpoints для чата с AI.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from schemas import ChatReq
from services.chat_service import ChatService
from services.rate_limiter import RateLimiter
from database import get_db
from api.dependencies import get_chat_service, get_rate_limiter, get_services_manager
from core.websocket import manager

router = APIRouter()
logger = logging.getLogger("chat_routes")


@router.post("")
async def chat(
    req: ChatReq,
    request: Request,
    chat_service: ChatService = Depends(get_chat_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    REST endpoint для чата с AI.
    
    **Request:**
    ```json
    {
        "messages": [
            {"role": "user", "content": "Как создать цель?"}
        ],
        "user_id": 1
    }
    ```
    
    **Response:**
    ```json
    {
        "reply": "...",
        "latency_ms": 150.5,
        "from_cache": false,
        "type": "llm"
    }
    ```
    """
    await rate_limiter.check_limit(request.client.host)
    
    try:
        response = await chat_service.process_message(
            messages=req.messages,
            user_id=req.user_id
        )
        return response
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(status_code=500, detail="Chat service error")


@router.websocket("/ws/{user_id}")
async def websocket_chat(
    websocket: WebSocket,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint для real-time чата.
    
    **Client sends:**
    ```json
    {"content": "Помоги с финансовым планом"}
    ```
    
    **Server responds (streaming):**
    ```json
    {
        "type": "stream",
        "content": "chunk of text...",
        "latency_ms": 0,
        "from_cache": false,
        "done": false
    }
    ```
    """
    await manager.connect(websocket)
    
    # Получаем сервисы
    services = get_services_manager()
    chat_service = ChatService(db, services.llm_client, services.cache_manager)
    
    try:
        while True:
            # Получение сообщения
            message = await websocket.receive_json()
            
            # Обработка через chat service
            await chat_service.process_websocket_message(
                message=message,
                user_id=user_id,
                websocket=websocket
            )
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        logger.info(f"User {user_id} disconnected")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        await manager.disconnect(websocket)


@router.get("/history/{user_id}")
async def get_chat_history(
    user_id: int,
    limit: int = 50,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Получение истории разговоров пользователя.
    
    - **user_id**: ID пользователя
    - **limit**: Максимум сообщений (default: 50)
    """
    try:
        history = await chat_service.get_conversation_history(
            user_id=user_id,
            limit=limit
        )
        return {"history": history, "total": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))