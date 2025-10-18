# config.py — Централизованная конфигурация (Enhanced)
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Настройки приложения"""
    
    # ===== OpenAI Hub =====
    OPENAI_HUB_KEY: str = os.getenv("OPENAI_HUB_KEY", "")
    OPENAI_HUB_URL: str = os.getenv("OPENAI_HUB_URL", "https://openai-hub.neuraldeep.tech")
    
    # Модели
    OPENAI_CHAT_MODEL: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    OPENAI_ANALYSIS_MODEL: str = os.getenv("OPENAI_ANALYSIS_MODEL", "gpt-4o")
    OPENAI_EMBED_MODEL: str = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
    
    # Retry & Timeout
    OPENAI_TIMEOUT_SECONDS: int = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))
    OPENAI_MAX_RETRIES: int = int(os.getenv("OPENAI_MAX_RETRIES", "3"))
    
    # Circuit Breaker
    OPENAI_MAX_FAILURES: int = int(os.getenv("OPENAI_MAX_FAILURES", "5"))
    OPENAI_CIRCUIT_TIMEOUT_SECONDS: int = int(os.getenv("OPENAI_CIRCUIT_TIMEOUT_SECONDS", "60"))
    
    # ===== Database =====
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./zaman_assistant.db")
    
    # ===== Security =====
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "")
    
    # ===== Features =====
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "true").lower() in ("1", "true", "yes")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
    
    # ===== Embeddings =====
    EMBEDDINGS_PATH: str = os.getenv("EMBEDDINGS_PATH", "./data/product_embeddings.pkl")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", "1536"))
    
    # ===== Cache =====
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
    
    # ===== Rate Limiting =====
    RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "200"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "3600"))
    
    # ===== WebSocket =====
    WS_MESSAGE_MAX_SIZE: int = 1024 * 1024  # 1MB


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
}


# ===== ВАЛИДАЦИЯ КОНФИГУРАЦИИ =====
def validate_config():
    """Проверка критических настроек"""
    warnings = []
    errors = []
    
    # Критичные проверки
    if not settings.OPENAI_HUB_KEY and not settings.MOCK_MODE:
        errors.append("❌ OPENAI_HUB_KEY not set and MOCK_MODE is disabled!")
    
    if not settings.ADMIN_TOKEN:
        errors.append("❌ ADMIN_TOKEN is not set!")
    elif settings.ADMIN_TOKEN == "supersecret":
        warnings.append("⚠️ ADMIN_TOKEN is default value! Change in production.")
    
    if not PRODUCTS:
        warnings.append("⚠️ No products loaded. Recommendations will not work.")
    
    # Info
    print(f"\n{'='*60}")
    print(f"🔧 ZAMAN ASSISTANT CONFIGURATION")
    print(f"{'='*60}")
    print(f"Mode:")
    print(f"  - MOCK_MODE: {settings.MOCK_MODE}")
    print(f"  - DEBUG: {settings.DEBUG}")
    print(f"\nOpenAI Hub:")
    print(f"  - URL: {settings.OPENAI_HUB_URL}")
    
    if settings.OPENAI_HUB_KEY:
        masked_key = settings.OPENAI_HUB_KEY[:7] + "..." + settings.OPENAI_HUB_KEY[-4:]
        print(f"  - API Key: {masked_key}")
    else:
        print(f"  - API Key: NOT SET")
    
    print(f"  - Chat Model: {settings.OPENAI_CHAT_MODEL}")
    print(f"  - Analysis Model: {settings.OPENAI_ANALYSIS_MODEL}")
    print(f"  - Embed Model: {settings.OPENAI_EMBED_MODEL}")
    print(f"  - Max Retries: {settings.OPENAI_MAX_RETRIES}")
    print(f"  - Timeout: {settings.OPENAI_TIMEOUT_SECONDS}s")
    
    print(f"\nDatabase:")
    # Безопасное отображение DB URL
    db_url_display = settings.DATABASE_URL
    if "@" in db_url_display:
        # Скрыть credentials
        parts = db_url_display.split("@")
        db_url_display = f"***@{parts[-1]}"
    print(f"  - URL: {db_url_display}")
    
    print(f"\nResources:")
    print(f"  - Products: {len(PRODUCTS)}")
    print(f"  - Cache TTL: {settings.CACHE_TTL_SECONDS}s")
    print(f"  - Rate Limit: {settings.RATE_LIMIT_MAX_REQUESTS}/{settings.RATE_LIMIT_WINDOW_SECONDS}s")
    
    # Warnings
    if warnings:
        print(f"\n{'='*60}")
        print("⚠️ WARNINGS:")
        for w in warnings:
            print(f"  {w}")
    
    # Errors
    if errors:
        print(f"\n{'='*60}")
        print("❌ ERRORS:")
        for e in errors:
            print(f"  {e}")
        print(f"{'='*60}\n")
        raise ValueError("Configuration validation failed! Check errors above.")
    
    if not warnings and not errors:
        print(f"\n✅ Configuration validated successfully")
    
    print(f"{'='*60}\n")


# Автоматическая валидация при импорте
validate_config()