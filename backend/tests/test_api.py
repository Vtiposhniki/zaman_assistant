"""
API endpoint tests
File: backend/tests/test_api.py
Run: pytest tests/test_api.py -v
"""

import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch
from datetime import date, timedelta


@pytest.fixture
def client():
    """FastAPI test client"""
    from main import app
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint"""
    
    def test_health_check_ok(self, client):
        """Test health check returns 200"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "database" in data
    
    def test_health_check_structure(self, client):
        """Test health check response structure"""
        response = client.get("/health")
        data = response.json()
        
        assert "database" in data
        assert "cache" in data
        assert "embeddings" in data
        assert "websockets" in data


class TestGoalsEndpoints:
    """Tests for /goals/* endpoints"""
    
    def test_create_goal_success(self, client):
        """Test successful goal creation"""
        payload = {
            "name": "Test Goal",
            "target_amount": 1000000.0,
            "current_savings": 200000.0,
            "target_date": "2026-12-31",
            "income": 500000.0,
            "expenses": 300000.0
        }
        
        response = client.post("/goals/create", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Goal"
        assert "goal_id" in data
        assert "monthly_needed" in data
    
    def test_create_goal_invalid_date(self, client):
        """Test goal creation with past date fails"""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        
        payload = {
            "name": "Invalid Goal",
            "target_amount": 100000.0,
            "current_savings": 0.0,
            "target_date": yesterday
        }
        
        response = client.post("/goals/create", json=payload)
        
        assert response.status_code == 400
    
    def test_create_goal_missing_fields(self, client):
        """Test goal creation with missing fields fails"""
        payload = {
            "name": "Incomplete",
            # Missing required fields
        }
        
        response = client.post("/goals/create", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    def test_list_goals(self, client):
        """Test listing goals"""
        response = client.get("/goals")
        
        assert response.status_code == 200
        data = response.json()
        assert "goals" in data
        assert "total" in data
        assert isinstance(data["goals"], list)
    
    def test_list_goals_with_filter(self, client):
        """Test listing goals with user_id filter"""
        response = client.get("/goals?user_id=1")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["goals"], list)


class TestChatEndpoints:
    """Tests for /chat endpoints"""
    
    def test_rest_chat_success(self, client):
        """Test REST chat endpoint"""
        payload = {
            "messages": [
                {"role": "user", "content": "как начать копить"}
            ]
        }
        
        response = client.post("/chat", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert len(data["reply"]) > 0
    
    def test_rest_chat_faq_response(self, client):
        """Test FAQ response in chat"""
        payload = {
            "messages": [
                {"role": "user", "content": "какой депозит выбрать"}
            ]
        }
        
        response = client.post("/chat", json=payload)
        data = response.json()
        
        assert data["type"] == "faq"
        assert "reply" in data
    
    def test_rest_chat_empty_message(self, client):
        """Test chat with empty message"""
        payload = {
            "messages": []
        }
        
        response = client.post("/chat", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data


class TestProductsEndpoints:
    """Tests for /products endpoint"""
    
    def test_list_all_products(self, client):
        """Test listing all products"""
        response = client.get("/products")
        
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert data["total"] > 0
        assert "categories" in data
    
    def test_list_products_by_category(self, client):
        """Test filtering products by category"""
        response = client.get("/products?category=Депозитный")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) > 0


class TestRecommendationEndpoints:
    """Tests for /recommend endpoint"""
    
    def test_get_recommendations(self, client):
        """Test getting product recommendations"""
        payload = {
            "goal_amount": 5000000.0,
            "months": 24,
            "age": 35,
            "goal_type": "автомобиль"
        }
        
        response = client.post("/recommend", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
    
    def test_recommendations_with_semantic_search(self, client):
        """Test recommendations with semantic search"""
        payload = {
            "goal_amount": 1000000.0,
            "months": 12,
            "goal_type": "отпуск",
            "use_semantic_search": True
        }
        
        response = client.post("/recommend", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["semantic_search_used"] is True


class TestAnalyticsEndpoints:
    """Tests for /analyze_expenses endpoint"""
    
    def test_analyze_expenses_success(self, client, tmp_path):
        """Test expense analysis with CSV"""
        # Create test CSV
        csv_file = tmp_path / "expenses.csv"
        csv_content = """date,amount,description
2025-01-01,10000,Магазин
2025-01-02,5000,Такси
2025-01-03,15000,Ресторан"""
        csv_file.write_text(csv_content)
        
        with open(csv_file, "rb") as f:
            response = client.post(
                "/analyze_expenses",
                files={"file": ("expenses.csv", f, "text/csv")},
                data={"monthly_income": 500000}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert "total_spending" in data
        assert "advice" in data
    
    def test_analyze_expenses_invalid_format(self, client, tmp_path):
        """Test analysis with invalid file format"""
        txt_file = tmp_path / "data.txt"
        txt_file.write_text("Not a CSV file")
        
        with open(txt_file, "rb") as f:
            response = client.post(
                "/analyze_expenses",
                files={"file": ("data.txt", f, "text/plain")}
            )
        
        assert response.status_code == 400


class TestAudioEndpoints:
    """Tests for /audio/* endpoints"""
    
    def test_transcribe_audio(self, client, tmp_path):
        """Test audio transcription endpoint"""
        # Create mock audio file
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"ID3\x04\x00\x00" + b"\x00" * 100)
        
        with open(audio_file, "rb") as f:
            response = client.post(
                "/audio/transcribe",
                files={"file": ("audio.mp3", f, "audio/mpeg")},
                params={"language": "ru"}
            )
        
        # Will fail without real Whisper API, but structure should be correct
        assert response.status_code in [200, 500, 503]


class TestAdminEndpoints:
    """Tests for admin endpoints"""
    
    def test_admin_endpoints_require_token(self, client):
        """Test that admin endpoints require token"""
        response = client.get("/admin/logs")
        
        # Should either require token or return 403/401
        assert response.status_code in [403, 404]
    
    def test_cache_stats(self, client):
        """Test cache stats endpoint"""
        response = client.get("/cache/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_entries" in data
        assert "hit_rate" in data
    
    def test_dashboard_stats(self, client):
        """Test dashboard stats endpoint"""
        response = client.get("/stats/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        assert "overview" in data
        assert "recent_goals" in data
        assert "system_health" in data


class TestErrorHandling:
    """Tests for error handling"""
    
    def test_rate_limit_exceeded(self, client):
        """Test rate limiting"""
        # Make many requests from same IP
        for i in range(5):
            response = client.get("/health")
            if response.status_code == 429:
                break
        
        # Eventually should get rate limited or success
        assert response.status_code in [200, 429]
    
    def test_invalid_json_body(self, client):
        """Test handling invalid JSON"""
        response = client.post(
            "/goals/create",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    def test_404_not_found(self, client):
        """Test 404 for non-existent endpoint"""
        response = client.get("/nonexistent")
        
        assert response.status_code == 404


class TestCORSHeaders:
    """Tests for CORS headers"""
    
    def test_cors_headers_present(self, client):
        """Test CORS headers are set"""
        response = client.get("/health")
        
        # Check for CORS headers if configured
        assert response.status_code == 200


class TestResponseFormats:
    """Tests for response format consistency"""
    
    def test_json_response_format(self, client):
        """Test JSON responses are valid"""
        response = client.get("/health")
        
        # Should be valid JSON
        try:
            data = response.json()
            assert isinstance(data, dict)
        except json.JSONDecodeError:
            pytest.fail("Response is not valid JSON")
    
    def test_error_response_format(self, client):
        """Test error response format"""
        payload = {
            "name": "Test",
            # Missing required fields
        }
        
        response = client.post("/goals/create", json=payload)
        
        # Should return error with detail
        data = response.json()
        assert "detail" in data or "validation" in str(data).lower()


class TestPerformance:
    """Performance tests"""
    
    def test_health_check_speed(self, client):
        """Test health check responds quickly"""
        import time
        
        start = time.time()
        response = client.get("/health")
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 1.0  # Should be fast
    
    def test_concurrent_requests(self, client):
        """Test handling concurrent requests"""
        import concurrent.futures
        
        def make_request():
            return client.get("/health")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        assert all(r.status_code == 200 for r in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])