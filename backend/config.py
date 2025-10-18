# config.py — Централизованная конфигурация (FIXED)
"""
Все настройки приложения в одном месте.
Упрощённая версия без pydantic_settings.
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


# ===== НАСТРОЙКИ =====
class Settings:
    """Настройки приложения"""
    
    # API Keys
    OPENAI_HUB_KEY: str = os.getenv("OPENAI_HUB_KEY", "")
    OPENAI_HUB_URL: str = os.getenv("OPENAI_HUB_URL", "https://openai-hub.neuraldeep.tech")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./zaman_assistant.db")
    
    # Security
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "")
    
    # Features
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "true").lower() in ("1", "true", "yes")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
    
    # Embeddings
    EMBEDDINGS_PATH: str = os.getenv("EMBEDDINGS_PATH", "./data/product_embeddings.pkl")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", "1536"))
    
    # Cache
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    
    # Rate Limiting
    RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "200"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "3600"))
    
    # WebSocket
    WS_MESSAGE_MAX_SIZE: int = 1024 * 1024  # 1MB


# Singleton settings instance
settings = Settings()


# ===== ЗАГРУЗКА ПРОДУКТОВ =====
def load_products() -> list:
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
    
    # Info сообщения
    print(f"🔧 Configuration:")
    print(f"   - MOCK_MODE: {settings.MOCK_MODE}")
    print(f"   - DEBUG: {settings.DEBUG}")
    print(f"   - Database: {settings.DATABASE_URL}")
    print(f"   - Products: {len(PRODUCTS)}")
    print(f"   - Cache TTL: {settings.CACHE_TTL_SECONDS}s")
    print(f"   - Rate Limit: {settings.RATE_LIMIT_MAX_REQUESTS}/{settings.RATE_LIMIT_WINDOW_SECONDS}s")
    
    if warnings:
        print("\n⚠️ WARNINGS:")
        for w in warnings:
            print(f"   {w}")
    else:
        print("\n✅ Configuration validated successfully")


# Автоматическая валидация при импорте
validate_config()