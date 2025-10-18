# database.py — Database models and session management (FIXED)
"""
Исправленные модели БД с правильным __tablename__.
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zaman_assistant.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True  # Проверка соединений
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ===== MODELS =====
class User(Base):
    __tablename__ = "users"  # ✅ ИСПРАВЛЕНО: было _tablename_
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    income = Column(Float, nullable=True)
    expenses = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Goal(Base):
    __tablename__ = "goals"  # ✅ ИСПРАВЛЕНО
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_savings = Column(Float, nullable=False, default=0.0)
    target_date = Column(String, nullable=False)
    monthly_needed = Column(Float, nullable=False, default=0.0)
    status = Column(String, default="active")  # active, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)


class ConversationLog(Base):
    __tablename__ = "conversation_logs"  # ✅ ИСПРАВЛЕНО
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    latency_ms = Column(Float, nullable=True)


class Metric(Base):
    __tablename__ = "metrics"  # ✅ ИСПРАВЛЕНО
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String, nullable=False, index=True)
    value = Column(Float, nullable=False)
    metric_metadata = Column(JSON, nullable=True)  # ✅ Переименовано из metadata
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


# ===== INITIALIZATION =====
def init_db():
    """Создание всех таблиц"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")


# ===== DEPENDENCY =====
def get_db():
    """Dependency для FastAPI endpoints"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== UTILITIES =====
def reset_db():
    """ОПАСНО: Удаление всех таблиц"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️ All tables dropped")


if __name__ == "__main__":
    # Тестовый запуск
    print(f"Database URL: {DATABASE_URL}")
    init_db()
    
    # Проверка что таблицы созданы
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")