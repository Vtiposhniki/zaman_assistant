# backend/api/routes/redis_goals.py
"""
Redis Goals Router - API endpoints для управления целями через Redis
Поддерживает CRUD операции, WebSocket, экспорт и статистику
"""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ...services.redis_goals_service import RedisGoalsService, create_redis_goals_service
from ...core.websocket import manager as websocket_manager
from ...schemas import CreateGoalReq

logger = logging.getLogger(__name__)

# Создание роутера
router = APIRouter(prefix="/redis-goals", tags=["Redis Goals"])

# Глобальный экземпляр сервиса
redis_goals_service: Optional[RedisGoalsService] = None

# ===== DEPENDENCY INJECTION =====

async def get_redis_goals_service() -> RedisGoalsService:
    """Dependency для получения Redis Goals Service"""
    global redis_goals_service
    
    if redis_goals_service is None:
        try:
            redis_goals_service = await create_redis_goals_service()
            # Запуск подписки на обновления для WebSocket
            await redis_goals_service.start_subscription_task(websocket_manager)
        except Exception as e:
            logger.error(f"Failed to initialize Redis Goals Service: {e}")
            raise HTTPException(status_code=500, detail="Redis service unavailable")
    
    return redis_goals_service

# ===== REQUEST/RESPONSE MODELS =====

class GoalUpdateRequest(BaseModel):
    """Запрос на обновление цели"""
    current_savings: Optional[float] = Field(None, ge=0, description="Текущие накопления")
    status: Optional[str] = Field(None, description="Статус цели")
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Название цели")
    target_amount: Optional[float] = Field(None, gt=0, description="Целевая сумма")
    target_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Дата достижения")

class BulkUpdateRequest(BaseModel):
    """Запрос на массовое обновление целей"""
    updates: List[Dict[str, Any]] = Field(..., min_length=1, description="Список обновлений")

class GoalResponse(BaseModel):
    """Ответ с информацией о цели"""
    id: str
    name: str
    target_amount: float
    current_savings: float
    target_date: str
    status: str
    user_id: Optional[int] = None
    goal_type: Optional[str] = None
    created_at: str
    updated_at: str
    progress_percent: float = 0.0
    months_remaining: int = 0
    monthly_needed: float = 0.0

class GoalsListResponse(BaseModel):
    """Ответ со списком целей"""
    goals: List[GoalResponse]
    total: int
    page: int = 1
    limit: int = 50

class GoalsStatisticsResponse(BaseModel):
    """Ответ со статистикой целей"""
    total_goals: int
    active_goals: int
    completed_goals: int
    cancelled_goals: int
    total_target_amount: float
    total_current_savings: float
    average_progress: float
    goals_by_type: Dict[str, int]
    goals_by_user: Dict[str, int]

# ===== CRUD ENDPOINTS =====

@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    goal_data: CreateGoalReq,
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Создание новой цели
    
    - **name**: Название цели
    - **target_amount**: Целевая сумма в KZT
    - **target_date**: Дата достижения (YYYY-MM-DD)
    - **user_id**: ID пользователя (опционально)
    - **current_savings**: Текущие накопления (по умолчанию 0)
    """
    try:
        goal = await service.create_goal(goal_data.dict())
        return GoalResponse(**goal)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=GoalsListResponse)
async def get_goals(
    user_id: Optional[int] = Query(None, description="Фильтр по пользователю"),
    status: Optional[str] = Query(None, description="Фильтр по статусу"),
    goal_type: Optional[str] = Query(None, description="Фильтр по типу цели"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(50, ge=1, le=100, description="Количество записей на странице"),
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Получение списка целей с фильтрацией и пагинацией
    
    - **user_id**: Фильтр по ID пользователя
    - **status**: Фильтр по статусу (active, completed, cancelled)
    - **goal_type**: Фильтр по типу цели
    - **page**: Номер страницы (начиная с 1)
    - **limit**: Количество записей на странице (1-100)
    """
    try:
        offset = (page - 1) * limit
        goals = await service.get_goals(
            user_id=user_id,
            status=status,
            goal_type=goal_type,
            limit=limit,
            offset=offset
        )
        
        # Добавление вычисляемых полей
        goal_responses = []
        for goal in goals:
            goal["progress_percent"] = service._calculate_progress(goal)
            goal["months_remaining"] = service._calculate_months_remaining(goal)
            goal["monthly_needed"] = service._calculate_monthly_needed(goal)
            goal_responses.append(GoalResponse(**goal))
        
        # Получение общего количества для пагинации
        all_goals = await service.get_goals(user_id=user_id, status=status, goal_type=goal_type)
        total = len(all_goals)
        
        return GoalsListResponse(
            goals=goal_responses,
            total=total,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error getting goals: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Получение конкретной цели по ID
    
    - **goal_id**: ID цели
    """
    try:
        goal = await service.get_goal(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Добавление вычисляемых полей
        goal["progress_percent"] = service._calculate_progress(goal)
        goal["months_remaining"] = service._calculate_months_remaining(goal)
        goal["monthly_needed"] = service._calculate_monthly_needed(goal)
        
        return GoalResponse(**goal)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting goal {goal_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    update_data: GoalUpdateRequest,
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Обновление цели
    
    - **goal_id**: ID цели
    - **current_savings**: Новые накопления
    - **status**: Новый статус
    - **name**: Новое название
    - **target_amount**: Новая целевая сумма
    - **target_date**: Новая дата достижения
    """
    try:
        # Фильтрация None значений
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        goal = await service.update_goal(goal_id, **update_dict)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Добавление вычисляемых полей
        goal["progress_percent"] = service._calculate_progress(goal)
        goal["months_remaining"] = service._calculate_months_remaining(goal)
        goal["monthly_needed"] = service._calculate_monthly_needed(goal)
        
        return GoalResponse(**goal)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating goal {goal_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    hard: bool = Query(False, description="Жесткое удаление (true) или отмена (false)"),
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Удаление цели
    
    - **goal_id**: ID цели
    - **hard**: Жесткое удаление (true) или отмена (false)
    """
    try:
        if hard:
            success = await service.hard_delete_goal(goal_id)
            action = "hard deleted"
        else:
            success = await service.delete_goal(goal_id)
            action = "cancelled"
        
        if not success:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        return {"message": f"Goal {goal_id} {action} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting goal {goal_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ===== BULK OPERATIONS =====

@router.post("/bulk-update")
async def bulk_update_goals(
    bulk_data: BulkUpdateRequest,
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Массовое обновление целей
    
    - **updates**: Список обновлений [{"goal_id": "...", "current_savings": 1000}, ...]
    """
    try:
        results = await service.bulk_update_goals(bulk_data.updates)
        return results
    except Exception as e:
        logger.error(f"Error in bulk update: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ===== EXPORT & STATISTICS =====

@router.get("/export/json")
async def export_goals_json(
    user_id: Optional[int] = Query(None, description="Фильтр по пользователю"),
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Экспорт всех целей в JSON формате
    
    - **user_id**: Фильтр по пользователю (опционально)
    """
    try:
        goals = await service.export_goals_json(user_id=user_id)
        return JSONResponse(
            content={"goals": goals, "count": len(goals)},
            headers={"Content-Disposition": "attachment; filename=goals_export.json"}
        )
    except Exception as e:
        logger.error(f"Error exporting goals: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/statistics", response_model=GoalsStatisticsResponse)
async def get_goals_statistics(
    service: RedisGoalsService = Depends(get_redis_goals_service)
):
    """
    Получение статистики по целям
    """
    try:
        stats = await service.get_goals_statistics()
        return GoalsStatisticsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ===== WEBSOCKET ENDPOINT =====

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint для real-time обновлений целей
    """
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Ожидание сообщений от клиента (опционально)
            data = await websocket.receive_text()
            logger.info(f"Received WebSocket message: {data}")
            
            # Можно добавить обработку команд от клиента
            # Например, подписку на конкретного пользователя
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket_manager.disconnect(websocket)

# ===== HEALTH CHECK =====

@router.get("/health")
async def health_check(service: RedisGoalsService = Depends(get_redis_goals_service)):
    """
    Проверка здоровья Redis сервиса
    """
    try:
        health = await service.health_check()
        return health
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2024-01-01T00:00:00Z"
        }

# ===== STARTUP/SHUTDOWN FUNCTIONS =====
# Эти функции должны быть вызваны из core/events.py

async def startup_redis_goals_service():
    """Инициализация Redis Goals Service при запуске"""
    global redis_goals_service
    try:
        redis_goals_service = await create_redis_goals_service()
        await redis_goals_service.start_subscription_task(websocket_manager)
        logger.info("Redis Goals Service started successfully")
    except Exception as e:
        logger.error(f"Failed to start Redis Goals Service: {e}")

async def shutdown_redis_goals_service():
    """Очистка Redis Goals Service при завершении"""
    global redis_goals_service
    if redis_goals_service:
        await redis_goals_service.close()
        redis_goals_service = None
        logger.info("Redis Goals Service stopped")
