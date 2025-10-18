# services/goal_service.py — Бизнес-логика для целей
"""
Сервис для управления финансовыми целями.
Создание, обновление, удаление и AI-советы.
"""
import math
from datetime import date, datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import Goal, User, Metric
from prompts import GOAL_TIPS
from schemas import CreateGoalReq


class GoalService:
    """Сервис для работы с целями"""
    
    def __init__(self, db: Session, llm_client):
        self.db = db
        self.llm = llm_client
    
    def _months_between(self, from_date: date, to_date: date) -> int:
        """Расчёт количества месяцев между датами"""
        return max(1, (to_date.year - from_date.year) * 12 + (to_date.month - from_date.month))
    
    def _log_metric(self, name: str, value: float, metadata: dict = None):
        """Логирование метрики"""
        try:
            metric = Metric(
                metric_name=name,
                value=value,
                metric_metadata=metadata
            )
            self.db.add(metric)
            self.db.commit()
        except Exception as e:
            print(f"Failed to log metric: {e}")
            self.db.rollback()
    
    async def create_goal_with_tips(self, req: CreateGoalReq) -> dict:
        """
        Создание цели с AI-советами.
        
        Returns:
            dict с информацией о цели и советами
        """
        # Парсинг даты
        try:
            target = datetime.strptime(req.target_date, "%Y-%m-%d").date()
        except ValueError as e:
            raise ValueError(f"Invalid date format: {e}")
        
        today = date.today()
        if target <= today:
            raise ValueError("Target date must be in the future")
        
        # Расчёты
        months = self._months_between(today, target)
        remaining = max(0.0, req.target_amount - req.current_savings)
        monthly_needed = math.ceil(remaining / months) if months > 0 else remaining
        progress = round((req.current_savings / req.target_amount) * 100, 1) if req.target_amount > 0 else 0.0
        
        # Создание цели в транзакции
        try:
            goal = Goal(
                user_id=req.user_id,
                name=req.name,
                target_amount=req.target_amount,
                current_savings=req.current_savings,
                target_date=req.target_date,
                monthly_needed=monthly_needed,
                status="active"
            )
            self.db.add(goal)
            self.db.flush()  # Получить ID без commit
            
            # Генерация AI-советов
            tips_prompt = GOAL_TIPS.format(
                name=req.name,
                amount=req.target_amount,
                months=months,
                current=req.current_savings,
                monthly=monthly_needed,
                income=f"{req.income:,.0f}" if req.income else "не указан",
                expenses=f"{req.expenses:,.0f}" if req.expenses else "не указаны"
            )
            
            messages = [
                {"role": "system", "content": "Ты финансовый советник Zaman Bank."},
                {"role": "user", "content": tips_prompt}
            ]
            
            ai_tips, latency = await self.llm.chat_completion(
                messages=messages,
                max_tokens=300,
                temperature=0.7
            )
            
            # Логирование метрик
            self._log_metric("goal_created", 1.0, {"goal_id": goal.id, "amount": req.target_amount})
            self._log_metric("llm_latency_ms", latency)
            
            # Commit всех изменений
            self.db.commit()
            self.db.refresh(goal)
            
            return {
                "goal_id": goal.id,
                "name": req.name,
                "target_amount": req.target_amount,
                "current_savings": req.current_savings,
                "target_date": req.target_date,
                "months": months,
                "monthly_needed": monthly_needed,
                "progress_percent": progress,
                "ai_tips": ai_tips,
                "created_at": goal.created_at.isoformat()
            }
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create goal: {e}")
    
    async def get_goals(self, user_id: Optional[int] = None, status: Optional[str] = None) -> List[dict]:
        """
        Получение списка целей с фильтрацией.
        
        Args:
            user_id: Фильтр по пользователю
            status: Фильтр по статусу (active, completed, cancelled)
        """
        query = self.db.query(Goal)
        
        if user_id:
            query = query.filter(Goal.user_id == user_id)
        if status:
            query = query.filter(Goal.status == status)
        
        goals = query.order_by(Goal.created_at.desc()).all()
        
        result = []
        for g in goals:
            progress = round((g.current_savings / g.target_amount) * 100, 1) if g.target_amount else 0.0
            result.append({
                "id": g.id,
                "name": g.name,
                "target_amount": g.target_amount,
                "current_savings": g.current_savings,
                "target_date": g.target_date,
                "monthly_needed": g.monthly_needed,
                "progress_percent": progress,
                "status": g.status,
                "created_at": g.created_at.isoformat()
            })
        
        return result
    
    async def update_goal(
        self,
        goal_id: int,
        current_savings: Optional[float] = None,
        status: Optional[str] = None
    ) -> dict:
        """
        Обновление цели.
        
        Args:
            goal_id: ID цели
            current_savings: Новая сумма накоплений
            status: Новый статус
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")
        
        try:
            if current_savings is not None:
                goal.current_savings = current_savings
                
                # Автоматическая смена статуса если достигли цели
                if current_savings >= goal.target_amount:
                    goal.status = "completed"
            
            if status is not None:
                goal.status = status
            
            self.db.commit()
            self.db.refresh(goal)
            
            progress = round((goal.current_savings / goal.target_amount) * 100, 1) if goal.target_amount else 0.0
            
            return {
                "id": goal.id,
                "name": goal.name,
                "current_savings": goal.current_savings,
                "target_amount": goal.target_amount,
                "progress_percent": progress,
                "status": goal.status,
                "updated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to update goal: {e}")
    
    async def delete_goal(self, goal_id: int):
        """
        Удаление цели (мягкое - меняем статус на cancelled).
        """
        goal = self.db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")
        
        try:
            goal.status = "cancelled"
            self.db.commit()
            
            self._log_metric("goal_deleted", 1.0, {"goal_id": goal_id})
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to delete goal: {e}")
    
    async def get_goal_statistics(self, user_id: Optional[int] = None) -> dict:
        """Статистика по целям пользователя"""
        query = self.db.query(Goal)
        if user_id:
            query = query.filter(Goal.user_id == user_id)
        
        total = query.count()
        active = query.filter(Goal.status == "active").count()
        completed = query.filter(Goal.status == "completed").count()
        
        total_target = query.filter(Goal.status == "active").with_entities(
            func.sum(Goal.target_amount)
        ).scalar() or 0
        
        total_saved = query.filter(Goal.status == "active").with_entities(
            func.sum(Goal.current_savings)
        ).scalar() or 0
        
        overall_progress = round((total_saved / total_target) * 100, 1) if total_target > 0 else 0.0
        
        return {
            "total_goals": total,
            "active_goals": active,
            "completed_goals": completed,
            "total_target_amount": round(float(total_target), 2),
            "total_saved": round(float(total_saved), 2),
            "overall_progress": overall_progress
        }