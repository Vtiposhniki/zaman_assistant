# schemas.py — Pydantic модели для request/response
"""
Все схемы данных для API endpoints.
Валидация, сериализация и документация.
"""
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

# ===== GOAL SCHEMAS =====
class CreateGoalReq(BaseModel):
    """Запрос на создание цели"""
    name: str = Field(..., min_length=1, max_length=200, description="Название цели")
    target_amount: float = Field(..., gt=0, description="Целевая сумма в KZT")
    current_savings: float = Field(default=0.0, ge=0, description="Текущие накопления")
    target_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Дата достижения (YYYY-MM-DD)")
    user_id: Optional[int] = Field(None, description="ID пользователя")
    age: Optional[int] = Field(None, ge=18, le=100, description="Возраст")
    income: Optional[float] = Field(None, ge=0, description="Ежемесячный доход")
    expenses: Optional[float] = Field(None, ge=0, description="Ежемесячные расходы")
    goal_type: Optional[str] = Field(None, description="Тип цели (например: покупка авто, образование)")
    
    @field_validator('target_date')
    @classmethod
    def validate_future_date(cls, v):
        """Проверка что дата в будущем"""
        from datetime import datetime, date
        try:
            target = datetime.strptime(v, "%Y-%m-%d").date()
            if target <= date.today():
                raise ValueError("Target date must be in the future")
            return v
        except ValueError as e:
            raise ValueError(f"Invalid date format or past date: {e}")

class GoalResponse(BaseModel):
    """Ответ с информацией о цели"""
    goal_id: int
    name: str
    target_amount: float
    current_savings: float
    target_date: str
    months: int
    monthly_needed: float
    progress_percent: float
    ai_tips: str
    created_at: str
    
    class Config:
        from_attributes = True

# ===== CHAT SCHEMAS =====
class ChatMessage(BaseModel):
    """Сообщение в чате"""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)

class ChatReq(BaseModel):
    """Запрос на чат"""
    messages: List[Dict[str, str]] = Field(..., min_length=1, description="История сообщений")
    user_id: Optional[int] = Field(None, description="ID пользователя")
    
    @field_validator('messages')
    @classmethod
    def validate_messages(cls, v):
        """Проверка формата сообщений"""
        for msg in v:
            if 'role' not in msg or 'content' not in msg:
                raise ValueError("Each message must have 'role' and 'content'")
            if msg['role'] not in ['user', 'assistant', 'system']:
                raise ValueError("Invalid role")
        return v

class ChatResponse(BaseModel):
    """Ответ чата"""
    reply: str
    latency_ms: float
    from_cache: bool
    type: str  # faq, cached, llm

# ===== RECOMMENDATION SCHEMAS =====
class RecommendReq(BaseModel):
    """Запрос на рекомендацию продуктов"""
    goal_amount: float = Field(..., gt=0, description="Целевая сумма")
    months: int = Field(..., gt=0, le=360, description="Количество месяцев")
    age: Optional[int] = Field(None, ge=18, le=100)
    goal_type: Optional[str] = None
    use_semantic_search: bool = Field(default=True, description="Использовать семантический поиск")

class ProductInfo(BaseModel):
    """Информация о продукте"""
    id: str
    name: str
    type: str
    short_desc: str

class RecommendationItem(BaseModel):
    """Одна рекомендация"""
    product: ProductInfo
    score: float
    conditions: str
    explanation: str

class RecommendationResponse(BaseModel):
    """Ответ с рекомендациями"""
    recommendations: List[RecommendationItem]
    total_analyzed: int
    semantic_search_used: bool

# ===== ANALYTICS SCHEMAS =====
class ExpenseCategory(BaseModel):
    """Категория расходов"""
    category: str
    amount: float
    percentage: float
    transaction_count: int

class AnalyticsResponse(BaseModel):
    """Ответ анализа расходов"""
    categories: List[ExpenseCategory]
    total_spending: float
    total_transactions: int
    advice: List[str]
    top_merchants: List[Dict[str, float]]

# ===== FEEDBACK SCHEMAS =====
class FeedbackReq(BaseModel):
    """Отзыв пользователя"""
    rating: int = Field(..., ge=1, le=5, description="Оценка 1-5")
    comment: Optional[str] = Field(None, max_length=1000)
    user_id: Optional[int] = None

# ===== HEALTH SCHEMAS =====
class DatabaseHealth(BaseModel):
    """Состояние БД"""
    connected: bool
    total_goals: int
    total_users: int

class CacheHealth(BaseModel):
    """Состояние кэша"""
    entries: int
    hit_rate: float

class EmbeddingsHealth(BaseModel):
    """Состояние embeddings"""
    loaded: int
    ready: bool

class WebSocketHealth(BaseModel):
    """Состояние WebSocket"""
    active_connections: int

class HealthResponse(BaseModel):
    """Полная информация о здоровье системы"""
    status: str
    version: str
    timestamp: str
    mock_mode: bool
    database: DatabaseHealth
    cache: CacheHealth
    embeddings: EmbeddingsHealth
    websockets: WebSocketHealth