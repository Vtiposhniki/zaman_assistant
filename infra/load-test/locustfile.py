# ===== LOCUST LOAD TEST (Alternative) =====
# File: infra/load-tests/locustfile.py

from locust import HttpUser, task, between
import random

class ZamanAssistantUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Initialize user session"""
        self.user_id = random.randint(1, 10000)
    
    @task(3)
    def view_products(self):
        """View products list"""
        self.client.get("/products")
    
    @task(2)
    def create_goal(self):
        """Create a financial goal"""
        payload = {
            "name": f"Test Goal {random.randint(1, 1000)}",
            "target_amount": random.randint(500000, 5000000),
            "current_savings": random.randint(0, 500000),
            "target_date": "2026-12-31",
            "income": 500000,
            "expenses": 300000,
        }
        self.client.post("/goals/create", json=payload)
    
    @task(5)
    def chat(self):
        """Send chat message"""
        questions = [
            "Какой депозит выбрать?",
            "Как начать копить?",
            "Помоги составить план",
            "Какие продукты есть?",
        ]
        payload = {
            "messages": [
                {"role": "user", "content": random.choice(questions)}
            ]
        }
        self.client.post("/chat", json=payload)
    
    @task(1)
    def view_stats(self):
        """View dashboard stats"""
        self.client.get("/stats/dashboard")
    
    @task(1)
    def health_check(self):
        """Health check"""
        self.client.get("/health")
