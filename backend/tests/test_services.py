"""
Unit tests for Zaman Assistant services
Run: pytest tests/test_services.py -v --cov=services
"""

import pytest
import asyncio
import json
from datetime import date, datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from sqlalchemy.orm import Session

from services.llm_client import LLMClient
from services.cache_manager import CacheManager
from services.rate_limiter import RateLimiter
from services.goal_service import GoalService
from services.chat_service import ChatService
from services.recommendation_service import RecommendationService
from services.analytics_service import AnalyticsService
from schemas import CreateGoalReq, ChatReq, RecommendReq
from database import Goal, ConversationLog, Metric


# ===== FIXTURES =====
@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def llm_client_mock():
    """LLM client in mock mode"""
    return LLMClient(
        url="https://openai-hub.neuraldeep.tech",
        api_key="test-key",
        mock_mode=True
    )


@pytest.fixture
def cache_manager():
    """Cache manager instance"""
    return CacheManager(ttl_seconds=3600)


@pytest.fixture
def rate_limiter():
    """Rate limiter instance"""
    return RateLimiter(max_requests=100, window_seconds=3600)


@pytest.fixture
def goal_service(mock_db, llm_client_mock):
    """Goal service instance"""
    return GoalService(mock_db, llm_client_mock)


@pytest.fixture
def chat_service(mock_db, llm_client_mock, cache_manager):
    """Chat service instance"""
    return ChatService(mock_db, llm_client_mock, cache_manager)


@pytest.fixture
def recommendation_service(mock_db, llm_client_mock):
    """Recommendation service instance"""
    return RecommendationService(mock_db, llm_client_mock)


@pytest.fixture
def analytics_service(mock_db, llm_client_mock):
    """Analytics service instance"""
    return AnalyticsService(mock_db, llm_client_mock)


# ===== LLM CLIENT TESTS =====
class TestLLMClient:
    """Tests for LLM client"""
    
    @pytest.mark.asyncio
    async def test_chat_completion_mock_mode(self, llm_client_mock):
        """Test chat completion in mock mode"""
        messages = [
            {"role": "user", "content": "Какой депозит выбрать?"}
        ]
        
        response, latency = await llm_client_mock.chat_completion(messages)
        
        assert isinstance(response, str)
        assert len(response) > 0
        assert latency > 0
        assert "депозит" in response.lower() or "выгодный" in response.lower()
    
    @pytest.mark.asyncio
    async def test_mock_embedding(self, llm_client_mock):
        """Test embedding generation in mock mode"""
        text = "финансовая цель"
        embedding = llm_client_mock._mock_embedding(text)
        
        assert isinstance(embedding, list)
        assert len(embedding) == 1536
        assert all(isinstance(x, float) for x in embedding)
    
    @pytest.mark.asyncio
    async def test_get_embedding_mock(self, llm_client_mock):
        """Test get_embedding method"""
        embedding = await llm_client_mock.get_embedding("test text")
        
        assert embedding is not None
        assert len(embedding) == 1536


# ===== CACHE MANAGER TESTS =====
class TestCacheManager:
    """Tests for cache manager"""
    
    @pytest.mark.asyncio
    async def test_cache_set_and_get(self, cache_manager):
        """Test cache set and get operations"""
        await cache_manager.set("test", "key1", "value1")
        result = await cache_manager.get("test", "key1")
        
        assert result == "value1"
    
    @pytest.mark.asyncio
    async def test_cache_miss(self, cache_manager):
        """Test cache miss returns None"""
        result = await cache_manager.get("test", "nonexistent")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_namespace_isolation(self, cache_manager):
        """Test namespace isolation"""
        await cache_manager.set("ns1", "key", "value1")
        await cache_manager.set("ns2", "key", "value2")
        
        result1 = await cache_manager.get("ns1", "key")
        result2 = await cache_manager.get("ns2", "key")
        
        assert result1 == "value1"
        assert result2 == "value2"
    
    @pytest.mark.asyncio
    async def test_cache_stats(self, cache_manager):
        """Test cache statistics"""
        await cache_manager.set("test", "key1", "value1")
        _ = await cache_manager.get("test", "key1")  # hit
        _ = await cache_manager.get("test", "key2")  # miss
        
        stats = cache_manager.stats()
        
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["total_entries"] == 1


# ===== RATE LIMITER TESTS =====
class TestRateLimiter:
    """Tests for rate limiter"""
    
    @pytest.mark.asyncio
    async def test_rate_limit_allowed(self, rate_limiter):
        """Test request allowed within limit"""
        result = await rate_limiter.check_limit("user1")
        assert result is True
    
    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self, rate_limiter):
        """Test request blocked when limit exceeded"""
        from fastapi import HTTPException
        
        # Exhaust the limit
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        await limiter.check_limit("user1")
        await limiter.check_limit("user1")
        
        # Next request should be blocked
        with pytest.raises(HTTPException) as exc_info:
            await limiter.check_limit("user1")
        
        assert exc_info.value.status_code == 429
    
    @pytest.mark.asyncio
    async def test_rate_limit_reset(self, rate_limiter):
        """Test getting usage stats"""
        await rate_limiter.check_limit("user1")
        usage = await rate_limiter.get_usage("user1")
        
        assert usage["used"] == 1
        assert usage["remaining"] == 99
        assert usage["limit"] == 100
    
    @pytest.mark.asyncio
    async def test_rate_limit_stats(self, rate_limiter):
        """Test rate limiter statistics"""
        await rate_limiter.check_limit("user1")
        stats = rate_limiter.stats()
        
        assert stats["total_requests"] == 1
        assert stats["blocked_requests"] == 0


# ===== GOAL SERVICE TESTS =====
class TestGoalService:
    """Tests for goal service"""
    
    @pytest.mark.asyncio
    async def test_create_goal_valid(self, goal_service, mock_db):
        """Test creating a valid goal"""
        # Mock DB add and commit
        mock_db.add = Mock()
        mock_db.flush = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        # Create goal
        req = CreateGoalReq(
            name="Отпуск",
            target_amount=1000000.0,
            current_savings=200000.0,
            target_date="2025-12-31",
            income=500000.0,
            expenses=300000.0
        )
        
        result = await goal_service.create_goal_with_tips(req)
        
        assert result["name"] == "Отпуск"
        assert result["target_amount"] == 1000000.0
        assert result["current_savings"] == 200000.0
        assert "monthly_needed" in result
        assert "ai_tips" in result
        assert len(result["ai_tips"]) > 0
    
    @pytest.mark.asyncio
    async def test_create_goal_past_date(self, goal_service):
        """Test creating goal with past date fails"""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        
        req = CreateGoalReq(
            name="Тест",
            target_amount=100000.0,
            current_savings=0.0,
            target_date=yesterday
        )
        
        with pytest.raises(ValueError):
            await goal_service.create_goal_with_tips(req)
    
    def test_months_between(self, goal_service):
        """Test month calculation"""
        today = date.today()
        one_year_later = today + timedelta(days=365)
        
        months = goal_service._months_between(today, one_year_later)
        
        assert months == 12


# ===== CHAT SERVICE TESTS =====
class TestChatService:
    """Tests for chat service"""
    
    def test_find_faq_answer_found(self, chat_service):
        """Test FAQ answer found"""
        answer = chat_service._find_faq_answer("как начать копить")
        
        assert answer is not None
        assert "копить" in answer.lower() or "депозит" in answer.lower()
    
    def test_find_faq_answer_not_found(self, chat_service):
        """Test FAQ answer not found"""
        answer = chat_service._find_faq_answer("случайный вопрос")
        
        assert answer is None
    
    @pytest.mark.asyncio
    async def test_process_message_faq_cached(self, chat_service):
        """Test FAQ response is cached"""
        response1 = await chat_service.process_message(
            messages=[{"role": "user", "content": "как начать копить"}]
        )
        
        assert "reply" in response1
        assert response1["type"] == "faq"
    
    @pytest.mark.asyncio
    async def test_process_message_empty(self, chat_service):
        """Test empty message handling"""
        response = await chat_service.process_message(
            messages=[]
        )
        
        assert "reply" in response


# ===== RECOMMENDATION SERVICE TESTS =====
class TestRecommendationService:
    """Tests for recommendation service"""
    
    def test_score_product_eligible(self, recommendation_service):
        """Test product scoring for eligible product"""
        product = {
            "id": "prod_1",
            "name": "Депозит",
            "expected_yield": 17,
            "min_amount": 500000,
            "max_amount": 100000000,
            "min_term_months": 3,
            "max_term_months": 12,
            "min_age": None,
            "max_age": None,
            "risk_level": 1
        }
        
        score = recommendation_service._score_product(
            product=product,
            goal_amount=1000000.0,
            months=6,
            age=30
        )
        
        assert score > 0
    
    def test_score_product_sum_too_small(self, recommendation_service):
        """Test product scoring for amount below minimum"""
        product = {
            "min_amount": 1000000,
            "max_amount": 100000000,
            "min_term_months": 3,
            "max_term_months": 12,
            "expected_yield": 17,
            "risk_level": 1
        }
        
        score = recommendation_service._score_product(
            product=product,
            goal_amount=100000.0,
            months=6
        )
        
        assert score == 0.0
    
    def test_format_conditions(self, recommendation_service):
        """Test formatting product conditions"""
        product = {
            "expected_yield": 17,
            "min_amount": 500000,
            "max_amount": 100000000,
            "min_term_months": 3,
            "max_term_months": 12,
            "min_age": 21,
            "max_age": 63
        }
        
        conditions = recommendation_service._format_conditions(product)
        
        assert "17%" in conditions
        assert "500000" in conditions
        assert "3-12" in conditions
        assert "21-63" in conditions


# ===== ANALYTICS SERVICE TESTS =====
class TestAnalyticsService:
    """Tests for analytics service"""
    
    @pytest.mark.asyncio
    async def test_analyze_transactions_empty(self, analytics_service, tmp_path):
        """Test analyzing empty CSV"""
        # Create empty CSV
        csv_file = tmp_path / "empty.csv"
        csv_file.write_text("date,amount,description\n")
        
        result = await analytics_service.analyze_transactions(str(csv_file))
        
        assert "error" in result or result["total_transactions"] == 0
    
    @pytest.mark.asyncio
    async def test_analyze_transactions_valid(self, analytics_service, tmp_path):
        """Test analyzing valid CSV"""
        # Create test CSV
        csv_file = tmp_path / "transactions.csv"
        csv_content = """date,amount,description
2025-01-01,10000,Магазин
2025-01-02,5000,Такси
2025-01-03,15000,Ресторан"""
        csv_file.write_text(csv_content)
        
        result = await analytics_service.analyze_transactions(str(csv_file))
        
        assert result["total_transactions"] == 3
        assert result["total_spending"] == 30000
        assert len(result["categories"]) > 0
        assert "advice" in result


# ===== INTEGRATION TESTS =====
class TestIntegration:
    """Integration tests between services"""
    
    @pytest.mark.asyncio
    async def test_goal_to_recommendation_flow(
        self, 
        goal_service, 
        recommendation_service,
        mock_db
    ):
        """Test flow: create goal -> get recommendations"""
        # Mock DB
        mock_db.add = Mock()
        mock_db.flush = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()
        
        # Create goal
        goal_req = CreateGoalReq(
            name="Покупка авто",
            target_amount=5000000.0,
            current_savings=1000000.0,
            target_date="2026-12-31",
            income=600000.0,
            expenses=400000.0,
            goal_type="автомобиль"
        )
        
        goal = await goal_service.create_goal_with_tips(goal_req)
        assert "monthly_needed" in goal
        
        # Get recommendations based on goal
        recommend_req = RecommendReq(
            goal_amount=goal["target_amount"],
            months=goal["months"],
            goal_type="автомобиль"
        )
        
        recommendations = await recommendation_service.get_recommendations(
            goal_amount=recommend_req.goal_amount,
            months=recommend_req.months,
            goal_type=recommend_req.goal_type
        )
        
        assert "recommendations" in recommendations
        assert len(recommendations["recommendations"]) > 0


# ===== PERFORMANCE TESTS =====
class TestPerformance:
    """Performance tests"""
    
    @pytest.mark.asyncio
    async def test_cache_performance(self, cache_manager):
        """Test cache improves performance"""
        # First set
        await cache_manager.set("perf", "key", "value")
        
        # Multiple gets
        for _ in range(100):
            await cache_manager.get("perf", "key")
        
        stats = cache_manager.stats()
        assert stats["hits"] >= 99
    
    def test_rate_limiter_performance(self, rate_limiter):
        """Test rate limiter handles many requests"""
        import time
        
        start = time.time()
        
        async def stress_test():
            for i in range(100):
                try:
                    await rate_limiter.check_limit(f"user{i % 10}")
                except:
                    pass
        
        asyncio.run(stress_test())
        duration = time.time() - start
        
        assert duration < 5.0  # Should complete quickly


# ===== ERROR HANDLING TESTS =====
class TestErrorHandling:
    """Tests for error handling"""
    
    @pytest.mark.asyncio
    async def test_goal_creation_invalid_date_format(self, goal_service):
        """Test invalid date format"""
        req = CreateGoalReq(
            name="Test",
            target_amount=100000.0,
            current_savings=0.0,
            target_date="invalid-date"
        )
        
        with pytest.raises(ValueError):
            await goal_service.create_goal_with_tips(req)
    
    @pytest.mark.asyncio
    async def test_chat_with_invalid_messages(self, chat_service):
        """Test chat with invalid message format"""
        response = await chat_service.process_message(
            messages=[{"role": "invalid", "content": "test"}]
        )
        
        assert "reply" in response
    
    def test_cache_with_none_value(self, cache_manager):
        """Test cache with None value"""
        async def test():
            await cache_manager.set("test", "key", None)
            result = await cache_manager.get("test", "key")
            return result
        
        result = asyncio.run(test())
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=services"])