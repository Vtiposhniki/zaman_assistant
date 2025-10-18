# config.py — Централизованная конфигурация
"""
Все настройки приложения в одном месте.
Использует Pydantic Settings для валидации.
"""
import os
import json
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Настройки приложения с валидацией"""
    
    # API Keys
    OPENAI_HUB_KEY: str = ""
    OPENAI_HUB_URL: str = "https://openai-hub.neuraldeep.tech"
    
    # Database
    DATABASE_URL: str = "sqlite:///./zaman_assistant.db"
    
    # Security
    ADMIN_TOKEN: str = ""
    
    # Features
    MOCK_MODE: bool = True
    DEBUG: bool = False
    
    # Embeddings
    EMBEDDINGS_PATH: str = "./data/product_embeddings.pkl"
    EMBED_DIM: int = 1536
    
    # Cache
    CACHE_TTL_SECONDS: int = 3600
    
    # Rate Limiting
    RATE_LIMIT_MAX_REQUESTS: int = 200
    RATE_LIMIT_WINDOW_SECONDS: int = 3600
    
    # WebSocket
    WS_MESSAGE_MAX_SIZE: int = 1024 * 1024  # 1MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Singleton settings instance
settings = Settings()

# ===== ЗАГРУЗКА ПРОДУКТОВ =====
def load_products() -> list[dict]:
    """Загрузка продуктов из JSON"""
    products_path = Path(__file__).parent / "products.json"
    
    if not products_path.exists():
        print(f"⚠️ Products file not found: {products_path}")
        return []
    
    try:
        with open(products_path, "r", encoding="utf-8") as f:
            products = json.load(f)
        print(f"✅ Loaded {len(products)} products")
        return products
    except Exception as e:
        print(f"❌ Failed to load products: {e}")
        return []

PRODUCTS = load_products()

# ===== FAQ RESPONSES =====
FAQ_RESPONSES = {
    "как начать копить": "Отлично! Начните с простого: 1) Определите цель и сумму 2) Установите ежемесячный платёж 3) Выберите депозит 'Выгодный' (17% годовых). Давайте создадим ваш финансовый план?",
    "какой депозит выбрать": "Есть два варианта: 'Овернайт' (12% на 1-12 месяцев, от 1млн KZT) и 'Выгодный' (17% на 3-12 месяцев, от 500K KZT).",
    "как получить кредит": "Есть 3 кредита: беззалоговый (до 10млн, 3-60 мес), залоговый (больше денег, нужен залог) и бизнес-карта (для ИП). Какой вам нужен?",
    "сколько процентов на депозит": "Депозит 'Выгодный' дает 17% годовых — лучший вариант для накоплений.",
    "как анализировать расходы": "Загрузите CSV с вашими транзакциями через /analyze_expenses. Я разберу категории и дам персональные советы по экономии.",
    "что такое исламский кредит": "Это кредит по исламским принципам (без явных процентов). Вместо интереса — наценка на сумму покупки.",
    "как зарегистрировать бизнес карту": "Требуется минимум документов, кэшбэк до 1%, лимит 10млн KZT/день. Оставьте заявку онлайн."
}

# ===== ВАЛИДАЦИЯ КОНФИГУРАЦИИ =====
def validate_config():
    """Проверка критических настроек"""
    warnings = []
    
    if not settings.OPENAI_HUB_KEY and not settings.MOCK_MODE:
        warnings.append("⚠️ OPENAI_HUB_KEY not set and MOCK_MODE is disabled!")
    
    if settings.ADMIN_TOKEN == "supersecret":
        warnings.append("⚠️ ADMIN_TOKEN is weak! Change it in production.")
    
    if not PRODUCTS:
        warnings.append("⚠️ No products loaded. Recommendations will not work.")
    
    if warnings:
        for w in warnings:
            print(w)
    else:
        print("✅ Configuration validated successfully")

validate_config()