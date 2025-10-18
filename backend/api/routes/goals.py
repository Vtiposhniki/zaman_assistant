# api/routes/goals.py - Goals Endpoints
"""
Все endpoints для управления финансовыми целями.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request

from schemas import CreateGoalReq, GoalResponse
from services.goal_service import GoalService
from services.rate_limiter import RateLimiter
from api.dependencies import get_goal_service, get_rate_limiter

router = APIRouter()


@router.post("/create", response_model=GoalResponse)
async def create_goal(
    req: CreateGoalReq,
    request: Request,
    goal_service: GoalService = Depends(get_goal_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Создание финансовой цели с AI-советами.
    
    - **name**: Название цели
    - **target_amount**: Целевая сумма (KZT)
    - **current_savings**: Текущие накопления
    - **target_date**: Дата достижения (YYYY-MM-DD)
    - **income**: Месячный доход (опционально)
    - **expenses**: Месячные расходы (опционально)
    - **goal_type**: Тип цели (опционально)
    """
    await rate_limiter.check_limit(request.client.host)
    
    try:
        result = await goal_service.create_goal_with_tips(req)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("")
async def list_goals(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    goal_service: GoalService = Depends(get_goal_service)
):
    """
    Получение списка целей с фильтрацией.
    
    - **user_id**: Фильтр по пользователю
    - **status**: Фильтр по статусу (active, completed, cancelled)
    """
    goals = await goal_service.get_goals(user_id=user_id, status=status)
    return {"goals": goals, "total": len(goals)}


@router.put("/{goal_id}")
async def update_goal(
    goal_id: int,
    current_savings: Optional[float] = None,
    status: Optional[str] = None,
    goal_service: GoalService = Depends(get_goal_service)
):
    """
    Обновление прогресса цели.
    
    - **goal_id**: ID цели
    - **current_savings**: Новая сумма накоплений
    - **status**: Новый статус
    """
    try:
        goal = await goal_service.update_goal(
            goal_id=goal_id,
            current_savings=current_savings,
            status=status
        )
        return {"goal": goal, "message": "Goal updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    goal_service: GoalService = Depends(get_goal_service)
):
    """
    Удаление цели (мягкое - меняет статус на cancelled).
    
    - **goal_id**: ID цели
    """
    try:
        await goal_service.delete_goal(goal_id)
        return {"message": "Goal deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{goal_id}/statistics")
async def get_goal_stats(
    goal_id: int,
    goal_service: GoalService = Depends(get_goal_service)
):
    """
    Статистика по конкретной цели.
    
    - **goal_id**: ID цели
    """
    try:
        stats = await goal_service.get_goal_statistics(user_id=None)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))