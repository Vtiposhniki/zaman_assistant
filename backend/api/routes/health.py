# api/routes/health.py - Health Check & Statistics
"""
Health check, статистика и метрики системы.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, Goal, User
from schemas import HealthResponse
from embeddings import EMB_INDEX
from config import settings
from api.dependencies import get_cache_manager
from core.websocket import manager

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    Проверка состояния всех компонентов системы.
    
    **Response:**
    ```json
    {
        "status": "healthy",
        "version": "3.1.0",
        "timestamp": "2025-10-19T10:30:00",
        "mock_mode": false,
        "database": {
            "connected": true,
            "total_goals": 42,
            "total_users": 15
        },
        "cache": {
            "entries": 127,
            "hit_rate": 0.68
        },
        "embeddings": {
            "loaded": 7,
            "ready": true
        },
        "websockets": {
            "active_connections": 3
        }
    }
    ```
    """
    cache_mgr = get_cache_manager()
    
    try:
        total_goals = db.query(func.count(Goal.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        return {
            "status": "healthy",
            "version": "3.1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "mock_mode": settings.MOCK_MODE,
            "database": {
                "connected": True,
                "total_goals": total_goals,
                "total_users": total_users
            },
            "cache": {
                "entries": cache_mgr.stats()["total_entries"],
                "hit_rate": cache_mgr.stats().get("hit_rate", 0.0)
            },
            "embeddings": {
                "loaded": len(EMB_INDEX.index),
                "ready": len(EMB_INDEX.index) > 0
            },
            "websockets": {
                "active_connections": manager.get_connection_count()
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "version": "3.1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/stats/dashboard")
async def dashboard_stats(db: Session = Depends(get_db)):
    """
    Дашборд со статистикой по целям и системе.
    """
    try:
        total_goals = db.query(func.count(Goal.id)).scalar() or 0
        total_amount = db.query(func.sum(Goal.target_amount)).scalar() or 0
        avg_monthly = db.query(func.avg(Goal.monthly_needed)).scalar() or 0
        
        recent_goals = db.query(Goal).order_by(Goal.created_at.desc()).limit(5).all()
        
        cache_mgr = get_cache_manager()
        
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
                "websocket_connections": manager.get_connection_count(),
                "cache_entries": cache_mgr.stats()["total_entries"],
                "embeddings_ready": len(EMB_INDEX.index) > 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get statistics")


@router.get("/cache/stats")
async def cache_stats():
    """
    Статистика кэша (hit rate, entries, namespaces).
    """
    cache_mgr = get_cache_manager()
    return cache_mgr.stats()