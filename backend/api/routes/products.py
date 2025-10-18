# api/routes/products.py - Products & Recommendations
"""
Endpoints для работы с банковскими продуктами и рекомендациями.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request

from schemas import RecommendReq
from services.recommendation_service import RecommendationService
from services.rate_limiter import RateLimiter
from config import PRODUCTS
from api.dependencies import get_recommendation_service, get_rate_limiter

router = APIRouter()


@router.get("")
async def list_products(category: Optional[str] = None):
    """
    Список всех банковских продуктов.
    
    - **category**: Фильтр по категории (депозит, кредит, карта)
    
    **Response:**
    ```json
    {
        "products": [...],
        "total": 7,
        "categories": ["Депозитный", "Исламский кредит", ...]
    }
    ```
    """
    products = PRODUCTS
    
    if category:
        products = [
            p for p in PRODUCTS 
            if category.lower() in p.get("type", "").lower()
        ]
    
    categories = list(set(p.get("type") for p in PRODUCTS))
    
    return {
        "products": products,
        "total": len(products),
        "categories": categories
    }


@router.get("/{product_id}")
async def get_product(product_id: str):
    """
    Получение информации о конкретном продукте.
    
    - **product_id**: ID продукта
    """
    product = next(
        (p for p in PRODUCTS if p.get("id") == product_id),
        None
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.post("/recommend")
async def recommend_products(
    req: RecommendReq,
    request: Request,
    rec_service: RecommendationService = Depends(get_recommendation_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Подбор финансовых продуктов на основе цели.
    
    **Request:**
    ```json
    {
        "goal_amount": 5000000,
        "months": 24,
        "age": 30,
        "goal_type": "образование",
        "use_semantic_search": true
    }
    ```
    
    **Response:**
    ```json
    {
        "recommendations": [
            {
                "product": {...},
                "score": 0.85,
                "conditions": "...",
                "explanation": "AI объяснение..."
            }
        ],
        "total_analyzed": 7,
        "semantic_search_used": true
    }
    ```
    """
    await rate_limiter.check_limit(request.client.host)
    
    try:
        recommendations = await rec_service.get_recommendations(
            goal_amount=req.goal_amount,
            months=req.months,
            age=req.age,
            goal_type=req.goal_type,
            use_semantic_search=req.use_semantic_search
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail="Recommendation service error")


@router.post("/compare")
async def compare_products(
    product_ids: list[str],
    goal_type: Optional[str] = None,
    rec_service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Сравнение нескольких продуктов.
    
    **Request:**
    ```json
    {
        "product_ids": ["prod_1", "prod_2", "prod_3"],
        "goal_type": "автомобиль"
    }
    ```
    """
    try:
        comparison = await rec_service.compare_products(
            product_ids=product_ids,
            goal_type=goal_type
        )
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))