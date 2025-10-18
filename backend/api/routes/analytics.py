# api/routes/analytics.py - Expense Analysis Endpoints
"""
Endpoints для анализа расходов из CSV.
"""
import os
import tempfile
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Depends

from services.analytics_service import AnalyticsService
from services.rate_limiter import RateLimiter
from api.dependencies import get_analytics_service, get_rate_limiter

router = APIRouter()


@router.post("/expenses")
async def analyze_expenses(
    file: UploadFile = File(...),
    user_id: Optional[int] = None,
    monthly_income: Optional[float] = None,
    request: Request = None,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Анализ расходов из CSV файла.
    
    **CSV Format:**
    ```csv
    date,amount,description
    2025-01-15,5000,Супермаркет
    2025-01-16,2500,Такси
    ```
    
    **Response:**
    ```json
    {
        "categories": [
            {
                "category": "Продукты",
                "amount": 50000,
                "percentage": 35.5,
                "transaction_count": 12
            }
        ],
        "total_spending": 140000,
        "total_transactions": 45,
        "advice": ["AI советы..."],
        "top_merchants": [...]
    }
    ```
    """
    await rate_limiter.check_limit(request.client.host)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        # Сохранение временного файла
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Анализ
        analysis = await analytics_service.analyze_transactions(
            csv_path=tmp_path,
            user_id=user_id,
            monthly_income=monthly_income
        )
        
        # Удаление временного файла
        os.unlink(tmp_path)
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Analysis service error")


@router.get("/insights/{user_id}")
async def get_spending_insights(
    user_id: int,
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """
    Получение инсайтов по расходам пользователя из истории.
    
    - **user_id**: ID пользователя
    """
    try:
        insights = await analytics_service.get_spending_insights(user_id)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))