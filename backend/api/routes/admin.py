# api/routes/admin.py - Admin Management Endpoints
"""
Защищенные endpoints для администрирования.
Требуют X-Admin-Token header.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db, ConversationLog, Goal, User, Metric
from api.dependencies import verify_admin_token, get_cache_manager

router = APIRouter()


@router.get("/logs")
async def get_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """
    Получение логов разговоров (только для админов).
    
    **Headers:**
    ```
    X-Admin-Token: your_admin_token
    ```
    
    - **limit**: Количество логов (default: 50)
    """
    logs = db.query(ConversationLog)\
        .order_by(ConversationLog.timestamp.desc())\
        .limit(limit)\
        .all()
    
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


@router.delete("/reset_db")
async def reset_database(
    confirm: str = "",
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """
    Сброс базы данных (ОПАСНО!).
    
    **Query params:**
    - **confirm**: Должно быть "yes_i_am_sure"
    
    **⚠️ WARNING:** Удаляет ВСЕ данные!
    """
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
        
        # Очистка кэша
        cache_mgr = get_cache_manager()
        await cache_mgr.clear_all()
        
        return {"message": "Database and cache reset successful"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Reset failed")


@router.get("/metrics")
async def get_metrics(
    metric_name: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """
    Получение метрик системы.
    
    - **metric_name**: Фильтр по названию метрики
    - **limit**: Количество записей
    """
    query = db.query(Metric)
    
    if metric_name:
        query = query.filter(Metric.metric_name == metric_name)
    
    metrics = query.order_by(Metric.timestamp.desc()).limit(limit).all()
    
    return {
        "metrics": [
            {
                "id": m.id,
                "name": m.metric_name,
                "value": m.value,
                "metadata": m.metric_metadata,
                "timestamp": m.timestamp.isoformat()
            } for m in metrics
        ],
        "total": len(metrics)
    }


@router.post("/cache/clear")
async def clear_cache(
    namespace: str = None,
    _: bool = Depends(verify_admin_token)
):
    """
    Очистка кэша.
    
    - **namespace**: Очистить конкретный namespace (опционально)
    """
    cache_mgr = get_cache_manager()
    
    if namespace:
        await cache_mgr.clear_namespace(namespace)
        return {"message": f"Namespace '{namespace}' cleared"}
    else:
        await cache_mgr.clear_all()
        return {"message": "All cache cleared"}