# services/recommendation_service.py — Рекомендации финансовых продуктов
"""
Подбор продуктов с использованием:
- Семантического поиска (embeddings)
- Scoring алгоритма
- AI объяснений
"""
import logging
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy.orm import Session

from database import Metric
from embeddings import EMB_INDEX
from prompts import EXPLAIN_PRODUCT
from config import PRODUCTS

logger = logging.getLogger("recommendation_service")


class RecommendationService:
    """Сервис рекомендаций продуктов"""
    
    def __init__(self, db: Session, llm_client):
        self.db = db
        self.llm = llm_client
    
    def _score_product(
        self,
        product: dict,
        goal_amount: float,
        months: int,
        age: Optional[int] = None,
        goal_type: Optional[str] = None
    ) -> float:
        """
        Скоринг продукта для цели.
        
        Args:
            product: Данные продукта
            goal_amount: Целевая сумма
            months: Количество месяцев
            age: Возраст пользователя
            goal_type: Тип цели
        
        Returns:
            Скор (чем выше, тем лучше)
        """
        try:
            # Базовые параметры
            yield_pct = float(product.get("expected_yield") or 0)
            min_term = float(product.get("min_term_months") or months or 1)
            max_term = float(product.get("max_term_months") or months or 1)
            min_amount = float(product.get("min_amount") or 0)
            max_amount = float(product.get("max_amount") or float('inf'))
            risk_level = float(product.get("risk_level") or 1)
            
            # 1. Проверка eligibility
            if goal_amount < min_amount or goal_amount > max_amount:
                return 0.0
            
            if months < min_term or months > max_term:
                return 0.0
            
            # 2. Проверка возраста (если указан)
            if age:
                min_age = product.get("min_age")
                max_age = product.get("max_age")
                
                if min_age and age < min_age:
                    return 0.0
                if max_age and age > max_age:
                    return 0.0
            
            # 3. Расчёт прибыли/пользы
            if yield_pct > 0:
                # Депозиты - считаем доход
                profit = (yield_pct / 100) * goal_amount * (months / 12)
            else:
                # Кредиты - считаем доступность
                profit = goal_amount / (risk_level + 1)
            
            # 4. Базовый скор
            base_score = profit / (risk_level + 1)
            
            # 5. Бонусы
            bonuses = 1.0
            
            # Бонус за соответствие goal_type
            if goal_type:
                name_lower = product.get("name", "").lower()
                type_lower = product.get("type", "").lower()
                desc_lower = product.get("short_desc", "").lower()
                goal_lower = goal_type.lower()
                
                if goal_lower in name_lower or goal_lower in type_lower or goal_lower in desc_lower:
                    bonuses += 0.2
            
            # Бонус за оптимальный срок
            if min_term <= months <= max_term:
                term_fit = 1 - abs(months - (min_term + max_term) / 2) / max_term
                bonuses += term_fit * 0.1
            
            # Финальный скор
            score = base_score * bonuses
            
            return round(score, 4)
            
        except Exception as e:
            logger.error(f"Scoring error for {product.get('name')}: {e}")
            return 0.0
    
    async def get_recommendations(
        self,
        goal_amount: float,
        months: int,
        age: Optional[int] = None,
        goal_type: Optional[str] = None,
        use_semantic_search: bool = True,
        top_k: int = 3
    ) -> dict:
        """
        Получение рекомендаций продуктов.
        
        Args:
            goal_amount: Целевая сумма
            months: Срок в месяцах
            age: Возраст пользователя
            goal_type: Тип цели (например: "автомобиль", "образование")
            use_semantic_search: Использовать семантический поиск
            top_k: Количество рекомендаций
        
        Returns:
            dict с рекомендациями
        """
        candidates = []
        semantic_used = False
        
        # 1. Семантический поиск (если включен и есть goal_type)
        if use_semantic_search and goal_type and EMB_INDEX.index:
            semantic_used = True
            candidates = await self._semantic_search(
                goal_type=goal_type,
                goal_amount=goal_amount,
                months=months
            )
            
            if not candidates:
                # Fallback на все продукты
                logger.info("Semantic search returned no results, using all products")
                candidates = PRODUCTS.copy()
        else:
            # Все продукты
            candidates = PRODUCTS.copy()
        
        # 2. Скоринг продуктов
        scored = []
        for product in candidates:
            score = self._score_product(
                product=product,
                goal_amount=goal_amount,
                months=months,
                age=age,
                goal_type=goal_type
            )
            
            if score > 0:
                scored.append((score, product))
        
        # 3. Сортировка по скору
        scored.sort(key=lambda x: x[0], reverse=True)
        
        # 4. Топ-K рекомендаций
        top_recommendations = []
        
        for score, product in scored[:top_k]:
            # Формирование условий
            conditions = self._format_conditions(product)
            
            # AI объяснение
            explanation = await self._generate_explanation(
                product=product,
                goal_amount=goal_amount,
                months=months,
                goal_type=goal_type,
                conditions=conditions
            )
            
            top_recommendations.append({
                "product": {
                    "id": product.get("id"),
                    "name": product.get("name"),
                    "type": product.get("type"),
                    "short_desc": product.get("short_desc")
                },
                "score": round(score, 3),
                "conditions": conditions,
                "explanation": explanation
            })
        
        # 5. Логирование метрики
        self._log_metric("recommendation_request", 1.0, {
            "products_returned": len(top_recommendations),
            "semantic_used": semantic_used
        })
        
        return {
            "recommendations": top_recommendations,
            "total_analyzed": len(candidates),
            "semantic_search_used": semantic_used
        }
    
    async def _semantic_search(
        self,
        goal_type: str,
        goal_amount: float,
        months: int
    ) -> List[dict]:
        """
        Семантический поиск подходящих продуктов.
        
        Args:
            goal_type: Тип цели
            goal_amount: Сумма
            months: Срок
        
        Returns:
            Список продуктов-кандидатов
        """
        # Формирование запроса
        query_text = f"финансовая цель {goal_type} {goal_amount:,.0f} KZT {months} месяцев"
        
        # Получение embedding для запроса
        query_emb = await self.llm.get_embedding(query_text)
        
        if not query_emb:
            logger.warning("Failed to get query embedding")
            return []
        
        # Поиск ближайших продуктов
        nearest = EMB_INDEX.nearest(query_emb, top_k=5)
        
        # Фильтрация по similarity threshold
        threshold = 0.45
        filtered = [
            (product_id, similarity)
            for product_id, similarity in nearest
            if similarity > threshold
        ]
        
        if not filtered:
            logger.info(f"No products above similarity threshold {threshold}")
            return []
        
        # Маппинг product_id -> product
        product_map = {
            str(p.get("id") or p.get("name")): p
            for p in PRODUCTS
        }
        
        candidates = []
        for product_id, similarity in filtered:
            product = product_map.get(product_id)
            if product:
                candidates.append(product)
                logger.debug(f"Semantic match: {product.get('name')} (similarity: {similarity:.3f})")
        
        return candidates
    
    def _format_conditions(self, product: dict) -> str:
        """
        Форматирование условий продукта в читаемую строку.
        
        Args:
            product: Данные продукта
        
        Returns:
            Строка с условиями
        """
        parts = []
        
        # Доходность
        if product.get("expected_yield"):
            parts.append(f"доходность ~{product['expected_yield']}%")
        
        # Сумма
        if product.get("min_amount"):
            min_amt = product["min_amount"]
            parts.append(f"от {min_amt:,} KZT")
        
        if product.get("max_amount"):
            max_amt = product["max_amount"]
            parts.append(f"до {max_amt:,} KZT")
        
        # Срок
        if product.get("min_term_months") and product.get("max_term_months"):
            min_term = product["min_term_months"]
            max_term = product["max_term_months"]
            parts.append(f"срок {min_term}-{max_term} мес")
        
        # Возраст
        if product.get("min_age") and product.get("max_age"):
            min_age = product["min_age"]
            max_age = product["max_age"]
            parts.append(f"возраст {min_age}-{max_age} лет")
        
        # Наценка (для исламских продуктов)
        if product.get("markup_from"):
            markup = product["markup_from"]
            parts.append(f"наценка от {markup:,} KZT")
        
        return ", ".join(parts) if parts else "гибкие условия"
    
    async def _generate_explanation(
        self,
        product: dict,
        goal_amount: float,
        months: int,
        goal_type: Optional[str],
        conditions: str
    ) -> str:
        """
        Генерация AI объяснения почему продукт подходит.
        
        Args:
            product: Продукт
            goal_amount: Целевая сумма
            months: Срок
            goal_type: Тип цели
            conditions: Условия продукта
        
        Returns:
            Текст объяснения
        """
        prompt = EXPLAIN_PRODUCT.format(
            amount=goal_amount,
            months=months,
            goal=goal_type or "не указана",
            product_name=product.get("name"),
            short_desc=product.get("short_desc", ""),
            conditions=conditions
        )
        
        messages = [
            {"role": "system", "content": "Ты финансовый консультант Zaman Bank."},
            {"role": "user", "content": prompt}
        ]
        
        explanation, _ = await self.llm.chat_completion(
            messages=messages,
            max_tokens=250,
            temperature=0.7
        )
        
        return explanation
    
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
            logger.exception(f"Failed to log metric: {e}")
            self.db.rollback()
    
    async def compare_products(
        self,
        product_ids: List[str],
        goal_type: Optional[str] = None
    ) -> dict:
        """
        Сравнение нескольких продуктов.
        
        Args:
            product_ids: ID продуктов для сравнения
            goal_type: Тип цели
        
        Returns:
            dict со сравнением
        """
        # Получение продуктов
        product_map = {
            str(p.get("id") or p.get("name")): p
            for p in PRODUCTS
        }
        
        products_to_compare = []
        for pid in product_ids:
            product = product_map.get(str(pid))
            if product:
                products_to_compare.append(product)
        
        if len(products_to_compare) < 2:
            return {"error": "Need at least 2 products to compare"}
        
        # Формирование информации о продуктах
        products_info = "\n\n".join([
            f"**{p.get('name')}**:\n"
            f"- Тип: {p.get('type')}\n"
            f"- Описание: {p.get('short_desc')}\n"
            f"- Условия: {self._format_conditions(p)}"
            for p in products_to_compare
        ])
        
        # AI сравнение
        from prompts import COMPARE_PRODUCTS
        
        prompt = COMPARE_PRODUCTS.format(
            products_info=products_info,
            goal_type=goal_type or "не указан"
        )
        
        messages = [
            {"role": "system", "content": "Ты финансовый консультант Zaman Bank."},
            {"role": "user", "content": prompt}
        ]
        
        comparison, _ = await self.llm.chat_completion(
            messages=messages,
            max_tokens=400,
            temperature=0.7
        )
        
        return {
            "products": [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "type": p.get("type")
                }
                for p in products_to_compare
            ],
            "comparison": comparison
        }