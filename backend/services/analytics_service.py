# services/analytics_service.py — Сервис аналитики расходов
"""
Анализ транзакций из CSV с категоризацией и AI-советами.
Интегрирует готовую логику из analytics.py.
"""
from typing import Optional, List, Dict
from collections import defaultdict
from sqlalchemy.orm import Session

from analytics import (
    parse_transactions_csv,
    summarize_spending_by_category,
    quick_savings_advice
)


class AnalyticsService:
    """Сервис анализа финансовых данных"""
    
    def __init__(self, db: Session, llm_client):
        self.db = db
        self.llm = llm_client
    
    async def analyze_transactions(
        self,
        csv_path: str,
        user_id: Optional[int] = None,
        monthly_income: Optional[float] = None
    ) -> dict:
        """
        Полный анализ транзакций из CSV.
        
        Args:
            csv_path: Путь к CSV файлу
            user_id: ID пользователя
            monthly_income: Месячный доход для расчёта советов
        
        Returns:
            dict с категориями, советами и топ-мерчантами
        """
        # Парсинг CSV
        try:
            rows, totals = parse_transactions_csv(csv_path)
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {e}")
        
        if not rows:
            return {
                "error": "No transactions found in CSV",
                "categories": [],
                "advice": []
            }
        
        # Категоризация расходов
        summary = summarize_spending_by_category(totals)
        
        # Базовые советы без LLM
        basic_advice = quick_savings_advice(totals, monthly_income)
        
        # Расширенные AI-советы
        ai_advice = await self._get_ai_advice(summary, monthly_income)
        
        # Анализ топ-мерчантов
        top_merchants = self._analyze_top_merchants(rows)
        
        # Трендовый анализ (если есть даты)
        trends = self._analyze_trends(rows)
        
        return {
            "categories": summary,
            "total_spending": sum(totals.values()),
            "total_transactions": len(rows),
            "advice": basic_advice + [ai_advice],
            "top_merchants": top_merchants,
            "trends": trends
        }
    
    async def _get_ai_advice(
        self,
        summary: List[dict],
        monthly_income: Optional[float]
    ) -> str:
        """
        Генерация персонализированных AI-советов.
        """
        if not summary:
            return "Недостаточно данных для анализа."
        
        # Формирование промпта
        categories_text = "\n".join([
            f"- {cat['category']}: {cat['amount']:,.0f} KZT ({cat['pct']}%)"
            for cat in summary
        ])
        
        income_text = f"{monthly_income:,.0f} KZT" if monthly_income else "не указан"
        
        prompt = f"""Проанализируй расходы клиента и дай 2-3 конкретных совета по экономии:

Категории расходов:
{categories_text}

Месячный доход: {income_text}

Дай практичные советы на русском (2-3 предложения). Фокус на самых больших категориях."""
        
        messages = [
            {"role": "system", "content": "Ты финансовый аналитик Zaman Bank."},
            {"role": "user", "content": prompt}
        ]
        
        advice, _ = await self.llm.chat_completion(
            messages=messages,
            max_tokens=200,
            temperature=0.7
        )
        
        return advice
    
    def _analyze_top_merchants(self, rows: List[dict]) -> List[Dict[str, float]]:
        """
        Анализ топ-5 мерчантов по расходам.
        """
        merchant_totals = defaultdict(float)
        
        for row in rows:
            merchant = row.get("description", "Неизвестно")
            amount = abs(row.get("amount", 0))  # берём модуль для расходов
            merchant_totals[merchant] += amount
        
        # Сортировка по сумме
        sorted_merchants = sorted(
            merchant_totals.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        return [
            {"merchant": merchant, "total": round(total, 2)}
            for merchant, total in sorted_merchants
        ]
    
    def _analyze_trends(self, rows: List[dict]) -> dict:
        """
        Анализ трендов по датам (если есть).
        """
        try:
            from datetime import datetime
            from collections import defaultdict
            
            monthly_spending = defaultdict(float)
            
            for row in rows:
                date_str = row.get("date", "")
                if not date_str:
                    continue
                
                try:
                    # Попытка парсинга разных форматов
                    for fmt in ["%Y-%m-%d", "%d.%m.%Y", "%m/%d/%Y"]:
                        try:
                            dt = datetime.strptime(date_str, fmt)
                            month_key = dt.strftime("%Y-%m")
                            amount = abs(row.get("amount", 0))
                            monthly_spending[month_key] += amount
                            break
                        except ValueError:
                            continue
                except Exception:
                    continue
            
            if not monthly_spending:
                return {"available": False}
            
            # Сортировка по месяцам
            sorted_months = sorted(monthly_spending.items())
            
            # Расчёт тренда
            if len(sorted_months) >= 2:
                first_month = sorted_months[0][1]
                last_month = sorted_months[-1][1]
                trend = "растут" if last_month > first_month else "снижаются"
                change_pct = round(((last_month - first_month) / first_month) * 100, 1)
            else:
                trend = "недостаточно данных"
                change_pct = 0
            
            return {
                "available": True,
                "monthly_data": [
                    {"month": month, "spending": round(spending, 2)}
                    for month, spending in sorted_months
                ],
                "trend": trend,
                "change_percent": change_pct
            }
            
        except Exception as e:
            print(f"Trend analysis error: {e}")
            return {"available": False}
    
    async def get_spending_insights(self, user_id: int) -> dict:
        """
        Получение инсайтов по расходам пользователя из истории.
        (Требует хранения транзакций в БД)
        """
        # Placeholder для будущей функциональности
        return {
            "message": "Feature coming soon",
            "description": "Будет анализировать историю транзакций из БД"
        }