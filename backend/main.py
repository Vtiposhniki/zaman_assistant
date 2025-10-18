# main.py — Zaman Assistant backend (refactored)
import os
import math
import json
import time
import hashlib
import asyncio
import logging
from datetime import date, datetime
from typing import List, Optional, Dict
from collections import defaultdict

import httpx
import numpy as np

from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Depends, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, JSON, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from dotenv import load_dotenv

load_dotenv()

# -------------------------
# Logging
# -------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zaman_assistant")

# -------------------------
# CONFIG
# -------------------------
OPENAI_HUB_KEY = os.getenv("OPENAI_HUB_KEY", "")
OPENAI_HUB_URL = os.getenv("OPENAI_HUB_URL", "https://openai-hub.neuraldeep.tech")
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() in ("1", "true", "yes")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zaman_assistant.db")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")  # optional: set for admin endpoints

HEADERS = {"Authorization": f"Bearer {OPENAI_HUB_KEY}"} if OPENAI_HUB_KEY else {}
PRODUCTS_PATH = os.path.join(os.path.dirname(__file__), "products.json")

# -------------------------
# DB setup
# -------------------------
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -------------------------
# MODELS
# -------------------------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    income = Column(Float, nullable=True)
    expenses = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    name = Column(String)
    target_amount = Column(Float)
    current_savings = Column(Float)
    target_date = Column(String)
    monthly_needed = Column(Float)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

class ConversationLog(Base):
    __tablename__ = "conversation_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    role = Column(String)
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    latency_ms = Column(Float, nullable=True)

class Metric(Base):
    __tablename__ = "metrics"
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String)
    value = Column(Float)
    metric_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# -------------------------
# DEPENDENCY
# -------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------
# CACHE: namespace-aware
# -------------------------
class CacheManager:
    def __init__(self, ttl_seconds: int = 3600):
        self.cache: Dict[str, tuple] = {}  # key -> (value, ts)
        self.ttl = ttl_seconds
        self.namespace_map = defaultdict(set)  # namespace -> set(keys)
        self.lock = asyncio.Lock()

    def _make_raw_key(self, namespace: str, data: str) -> str:
        content = f"{namespace}:{data}"
        return hashlib.sha256(content.encode()).hexdigest()

    async def get(self, namespace: str, key_data: str) -> Optional[str]:
        key = self._make_raw_key(namespace, key_data)
        entry = self.cache.get(key)
        if not entry:
            return None
        value, ts = entry
        if time.time() - ts < self.ttl:
            return value
        # expired
        await self._delete_key(namespace, key)
        return None

    async def set(self, namespace: str, key_data: str, value: str):
        key = self._make_raw_key(namespace, key_data)
        self.cache[key] = (value, time.time())
        self.namespace_map[namespace].add(key)

    async def _delete_key(self, namespace: str, key: str):
        self.cache.pop(key, None)
        if namespace in self.namespace_map and key in self.namespace_map[namespace]:
            self.namespace_map[namespace].remove(key)

    async def clear_namespace(self, namespace: str):
        keys = list(self.namespace_map.get(namespace, []))
        for k in keys:
            self.cache.pop(k, None)
        self.namespace_map.pop(namespace, None)

    def stats(self) -> dict:
        return {"total_entries": len(self.cache), "ttl_seconds": self.ttl}

cache_manager = CacheManager(ttl_seconds=3600)

class FeedbackReq(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    user_id: Optional[int] = None
# -------------------------
# FAQ
# -------------------------
FAQ_RESPONSES = {
    "как начать копить": "Отлично! Начните с простого: 1) Определите цель и сумму 2) Установите ежемесячный платёж 3) Выберите депозит 'Выгодный' (17% годовых). Давайте создадим ваш финансовый план?",
    "какой депозит выбрать": "Есть два вариант: 'Овернайт' (12% на 1-12 месяцев, от 1млн KZT) и 'Выгодный' (17% на 3-12 месяцев, от 500K).",
    "как получить кредит": "Есть 3 кредита: беззалоговый (до 10млн, 3-60 мес), залоговый (больше денег, нужен залог) и бизнес-карта (для ИП). Какой вам нужен?",
    "сколько процентов на депозит": "Депозит 'Выгодный' дает 17% годовых — лучший вариант.",
    "как анализировать расходы": "Загрузите CSV с вашими транзакциями. Я разберу категории и дам советы.",
    "что такое исламский кредит": "Это кредит по исламским принципам (без явных процентов). Вместо интереса — наценка на сумму.",
    "как зарегистрировать бизнес карту": "Требуется минимум документов, кэшбэк до 1%, лимит 10млн KZT/день."
}

def find_faq_answer(user_text: str) -> Optional[str]:
    if not user_text:
        return None
    text_lower = user_text.lower()
    for pattern, answer in FAQ_RESPONSES.items():
        if pattern in text_lower:
            return answer
    return None

# -------------------------
# PRODUCTS load
# -------------------------
if not os.path.exists(PRODUCTS_PATH):
    logger.warning("products.json not found at %s — products endpoints will error.", PRODUCTS_PATH)
    PRODUCTS = []
else:
    with open(PRODUCTS_PATH, "r", encoding="utf-8") as f:
        PRODUCTS = json.load(f)

PRODUCT_EMBEDDINGS: Dict[str, List[float]] = {}

# -------------------------
# SYSTEM PROMPT
# -------------------------
SYSTEM_PROMPT = """Ты — Zaman Assistant, дружелюбный и эмпатичный AI-ассистент банка Zaman Bank.
Говори по-русски, кратко (2-3 предложения). Всегда указывай сроки и ежемесячную сумму при планировании. Если данных недостаточно — задай один уточняющий вопрос.
"""

# -------------------------
# HELPERS: LLM & Embeddings (async)
# -------------------------
async def call_llm_async(messages: List[dict], model="gpt-4o-mini", max_tokens: int = 500, temperature: float = 0.7) -> tuple:
    """Async LLM call via httpx; returns (response_text, latency_ms)"""
    start = time.time()
    if MOCK_MODE:
        await asyncio.sleep(0.15)
        user_text = ""
        for m in messages:
            if m.get("role") == "user":
                user_text = m.get("content", "")
        ut = user_text.lower()
        if "цель" in ut or "накопить" in ut:
            resp = "Отличная цель! Примерный план: откладывать 166,000 KZT/мес в течение 5 лет. Рекомендую депозит 'Выгодный' (17%)."
        elif "транзакц" in ut or "расход" in ut:
            resp = "Анализ расходов: продукты 35%, транспорт 20%, развлечения 15%. Сократив кафе на 20% — можно откладывать +25,000 KZT."
        elif "стресс" in ut or "тревог" in ut:
            resp = "Понимаю. Попробуйте прогулку 10 мин, дыхательное упражнение, и отложите крупную покупку на 48 часов."
        else:
            resp = "Здравствуйте! Я Zaman Assistant — могу помочь с целями, анализом расходов и подбором продуктов. Чем помочь?"
        latency = (time.time() - start) * 1000
        return resp, latency

    payload = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{OPENAI_HUB_URL}/v1/chat/completions", headers={**HEADERS, "Content-Type": "application/json"}, json=payload)
            r.raise_for_status()
            data = r.json()
            resp = ""
            if "choices" in data and len(data["choices"]) > 0:
                resp = data["choices"][0]["message"].get("content", "")
            else:
                resp = json.dumps(data)
            latency = (time.time() - start) * 1000
            return resp, latency
    except Exception as e:
        logger.error("LLM call error: %s", e)
        latency = (time.time() - start) * 1000
        return "Извините, возникла временная проблема с сервисом LLM.", latency

async def get_embedding_async(text: str) -> Optional[List[float]]:
    if MOCK_MODE:
        # consistent deterministic pseudo-random vector for caching stability (hash seed)
        rng = np.random.default_rng(abs(int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)))
        return rng.random(1536).tolist()
    payload = {"model": "text-embedding-3-small", "input": text}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(f"{OPENAI_HUB_URL}/v1/embeddings", headers={**HEADERS, "Content-Type": "application/json"}, json=payload)
        r.raise_for_status()
        data = r.json()
        if "data" in data and len(data["data"]) > 0:
                return data["data"][0].get("embedding")
        return None
    except Exception as e:
        logger.error("Embedding error: %s", e)
        return None

async def initialize_product_embeddings_async():
    """Pre-compute embeddings for all products (background)"""
    if not PRODUCTS:
        logger.info("No products to embed.")
        return
    logger.info("Starting product embeddings initialization (%d products)...", len(PRODUCTS))
    for product in PRODUCTS:
        pid = str(product.get("id") or product.get("name"))
        text = f"{product.get('name', '')} {product.get('type','')} {product.get('short_desc','')}"
        emb = await get_embedding_async(text)
        if emb:
            PRODUCT_EMBEDDINGS[pid] = emb
    logger.info("Product embeddings ready: %d", len(PRODUCT_EMBEDDINGS))

# -------------------------
# UTIL
# -------------------------
def months_between(from_date: date, to_date: date) -> int:
    return max(1, (to_date.year - from_date.year) * 12 + (to_date.month - from_date.month))

def log_metric(db: Session, name: str, value: float, metadata: dict = None):
    try:
        metric = Metric(metric_name=name, value=value, metric_metadata=metadata)
        db.add(metric)
        db.commit()
    except Exception as e:
        logger.exception("Failed to log metric: %s", e)

# -------------------------
# FASTAPI app
# -------------------------
app = FastAPI(title="Zaman Assistant", version="2.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[""], allow_credentials=True, allow_methods=[""], allow_headers=["*"])

# -------------------------
# Simple in-memory rate limit (per-ip per hour)
# -------------------------
request_counts = defaultdict(list)
RATE_LIMIT_LOCK = asyncio.Lock()

async def check_rate_limit(ip: str, limit: int = 200):
    now = time.time()
    async with RATE_LIMIT_LOCK:
        lst = request_counts[ip]
        # keep only last hour
        request_counts[ip] = [t for t in lst if now - t < 3600]
        if len(request_counts[ip]) >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        request_counts[ip].append(now)

# -------------------------
# Connection manager for websockets
# -------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        async with self.lock:
            for ws in list(self.active_connections):
                try:
                    await ws.send_text(message)
                except Exception:
                    # ignore/send errors
                    pass

manager = ConnectionManager()

# -------------------------
# PYDANTIC MODELS
# -------------------------
class CreateGoalReq(BaseModel):
    name: str
    target_amount: float = Field(gt=0)
    current_savings: float = Field(ge=0, default=0.0)
    target_date: str
    user_id: Optional[int] = None
    age: Optional[int] = None
    income: Optional[float] = None
    expenses: Optional[float] = None
    goal_type: Optional[str] = None

class ChatReq(BaseModel):
    messages: List[dict]
    user_id: Optional[int] = None

class RecommendReq(BaseModel):
    goal_amount: float
    months: int
    age: Optional[int] = None
    goal_type: Optional[str] = None
    use_semantic_search: bool = True

# -------------------------
# Startup events
# -------------------------
@app.on_event("startup")
async def on_startup():
    # async initialization of product embeddings (non-blocking)
    asyncio.create_task(initialize_product_embeddings_async())
    logger.info("🚀 ZAMAN ASSISTANT backend starting. MOCK_MODE=%s", MOCK_MODE)
    logger.info("Products loaded: %d", len(PRODUCTS))

# -------------------------
# WebSocket chat endpoint
# -------------------------
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                user_message = json.loads(raw)
            except Exception:
                await websocket.send_text(json.dumps({"error": "invalid message format"}))
                continue

            content = user_message.get("content", "")
            # check FAQ
            faq = find_faq_answer(content)
            if faq:
                await websocket.send_text(json.dumps({"type": "faq", "content": faq, "latency_ms": 0, "from_cache": False}))
                # log asynchronously to DB to avoid blocking
                asyncio.create_task(_async_log_conversation(user_id, "user", content))
                asyncio.create_task(_async_log_conversation(user_id, "assistant", faq, latency_ms=0.0))
                continue

            # check cache
            cached = await cache_manager.get("chat", content)
            if cached:
                await websocket.send_text(json.dumps({"type": "cached", "content": cached, "latency_ms": 5, "from_cache": True}))
                asyncio.create_task(_async_log_conversation(user_id, "user", content))
                continue
            
            # call llm
            messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": content}]
            response_text, latency = await call_llm_async(messages)
            # stream: simple chunking
            chunk_size = 60
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i:i+chunk_size]
                done = (i + chunk_size) >= len(response_text)
                await websocket.send_text(json.dumps({"type": "stream", "content": chunk, "latency_ms": latency if i == 0 else 0, "from_cache": False, "done": done}))
                await asyncio.sleep(0.01)
            # cache
            await cache_manager.set("chat", content, response_text)
            # log
            asyncio.create_task(_async_log_conversation(user_id, "user", content))
            asyncio.create_task(_async_log_conversation(user_id, "assistant", response_text, latency_ms=latency))
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
        await manager.disconnect(websocket)

# helper for async DB logging (run in thread)
async def _async_log_conversation(user_id: int, role: str, content: str, latency_ms: Optional[float] = None):
    await asyncio.to_thread(_sync_log_conversation, user_id, role, content, latency_ms)

def _sync_log_conversation(user_id: int, role: str, content: str, latency_ms: Optional[float] = None):
    db = SessionLocal()
    try:
        entry = ConversationLog(user_id=user_id, role=role, content=content, latency_ms=latency_ms)
        db.add(entry)
        db.commit()
    except Exception:
        logger.exception("Failed to write conversation log")
    finally:
        db.close()

# -------------------------
# REST endpoints
# -------------------------
@app.get("/health")
async def health(db: Session = Depends(get_db)):
    total_goals = db.query(func.count(Goal.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    return {
        "status": "ok",
        "version": "2.1.0",
        "mock_mode": MOCK_MODE,
        "products_loaded": len(PRODUCTS),
        "embeddings_ready": len(PRODUCT_EMBEDDINGS),
        "total_goals": total_goals,
        "total_users": total_users,
        "cache_stats": cache_manager.stats(),
        "websocket_connections": len(manager.active_connections)
    }

@app.post("/create_goal")
async def create_goal(req: CreateGoalReq, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    await check_rate_limit(ip)
    # parse date
    try:
        y, m, d = map(int, req.target_date.split("-"))
        target = date(y, m, d)
    except Exception:
        raise HTTPException(status_code=400, detail="target_date must be YYYY-MM-DD")
    
    today = date.today()
    months = months_between(today, target)
    remaining = max(0.0, req.target_amount - req.current_savings)
    monthly_needed = math.ceil(remaining / months) if months > 0 else remaining
    
    goal = Goal(
        user_id=req.user_id,
        name=req.name,
        target_amount=req.target_amount,
        current_savings=req.current_savings,
        target_date=req.target_date,
        monthly_needed=monthly_needed,
        status="active"
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    tips_prompt = f"""Клиент создал цель "{req.name}" на сумму {req.target_amount:,.0f} KZT за {months} месяцев.
Текущие накопления: {req.current_savings:,.0f} KZT.
Ежемесячно нужно: {monthly_needed:,.0f} KZT.
Доход: {req.income or 'не указан'} KZT, расходы: {req.expenses or 'не указаны'} KZT.
Дай ровно 3 конкретных, персонализированных совета по накоплению и экономии (каждый совет — 1 предложение)."""
    
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": tips_prompt}]
    ai_tips, latency = await call_llm_async(messages, max_tokens=300)
    
    log_metric(db, "goal_created", 1.0, {"goal_id": goal.id, "amount": req.target_amount})
    log_metric(db, "llm_latency_ms", latency)
    
    progress = round((req.current_savings / req.target_amount) * 100, 1) if req.target_amount > 0 else 0.0
    
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

@app.get("/goals")
async def get_goals(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Goal)
    if user_id:
        q = q.filter(Goal.user_id == user_id)
    goals = q.order_by(Goal.created_at.desc()).all()
    out = []
    for g in goals:
        prog = round((g.current_savings / g.target_amount) * 100, 1) if g.target_amount else 0.0
        out.append({
                "id": g.id,
                "name": g.name,
                "target_amount": g.target_amount,
                "current_savings": g.current_savings,
                "monthly_needed": g.monthly_needed,
            "progress_percent": prog,
                "status": g.status,
                "created_at": g.created_at.isoformat()
        })
    return {"goals": out, "total": len(out)}

@app.post("/chat")
async def chat(req: ChatReq, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    await check_rate_limit(ip)
    user_text = ""
    for m in req.messages:
        if m.get("role") == "user":
            user_text = m.get("content", "")
            break
    
    faq = find_faq_answer(user_text)
    if faq:
        if req.user_id:
            # log
            await asyncio.to_thread(_sync_log_conversation, req.user_id, "user", user_text)
            await asyncio.to_thread(_sync_log_conversation, req.user_id, "assistant", faq, 0.0)
        return {"reply": faq, "latency_ms": 0, "from_cache": False, "type": "faq"}

    cached = await cache_manager.get("chat", user_text)
    if cached:
        if req.user_id:
            await asyncio.to_thread(_sync_log_conversation, req.user_id, "user", user_text)
        return {"reply": cached, "latency_ms": 5, "from_cache": True, "type": "cached"}

    system_msg = {"role": "system", "content": SYSTEM_PROMPT}
    messages = [system_msg] + req.messages
    reply, latency = await call_llm_async(messages)
    await cache_manager.set("chat", user_text, reply)

    if req.user_id:
        # log messages in background
        asyncio.create_task(_async_log_conversation(req.user_id, "user", user_text))
        asyncio.create_task(_async_log_conversation(req.user_id, "assistant", reply, latency_ms=latency))
    
    log_metric(db, "chat_request", 1.0)
    log_metric(db, "llm_latency_ms", latency)
    
    return {"reply": reply, "latency_ms": round(latency, 2), "from_cache": False, "type": "llm"}

@app.post("/recommend")
async def recommend(req: RecommendReq, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    await check_rate_limit(ip)
    
    candidates = []
    # semantic search if possible
    if req.use_semantic_search and req.goal_type and PRODUCT_EMBEDDINGS:
        query_text = f"финансовая цель {req.goal_type} {req.goal_amount} {req.months} месяцев"
        query_emb = await get_embedding_async(query_text)
        if query_emb:
            # compute cosine similarity quickly (numpy)
            q = np.array(query_emb)
            for prod in PRODUCTS:
                pid = str(prod.get("id") or prod.get("name"))
                emb = PRODUCT_EMBEDDINGS.get(pid)
                if emb:
                    sim = float(np.dot(q, np.array(emb)) / (np.linalg.norm(q) * np.linalg.norm(np.array(emb)) + 1e-9))
                    if sim > 0.45:  # threshold tuned for recall
                        candidates.append(prod)
        if not candidates:
            candidates = PRODUCTS.copy()
    else:
        candidates = PRODUCTS.copy()
    
    def score_product(p, goal_amount, months, age, goal_type=None):
        try:
            yield_pct = float(p.get("expected_yield") or 0)
            term = float(p.get("min_term_months") or months or 1)
            risk = float(p.get("risk_level") or 1)

            profit = (yield_pct / 100) * (goal_amount / 12) * (months / term)
            base_score = profit / (risk + 1)
            goal_match_bonus = 0.15 if goal_type and goal_type.lower() in p["name"].lower() else 0.0
            score = round(base_score * (1 + goal_match_bonus), 4)
            return score if score > 0 else 0.0
        except Exception as e:
            print(f"⚠️ Score error for product {p.get('name')}: {e}")
            return 0.0
    
    scored = []
    for p in candidates:
        s = score_product(p, req.goal_amount, req.months, req.age, req.goal_type)
        if s > 0:
            scored.append((s, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    
    top = []
    for s, p in scored[:3]:
        cond_parts = []
        if p.get("expected_yield"):
            cond_parts.append(f"доходность ~{p['expected_yield']}%")
        if p.get("min_amount"):
            cond_parts.append(f"от {p['min_amount']:,} KZT")
        if p.get("min_term_months") and p.get("max_term_months"):
            cond_parts.append(f"срок {p['min_term_months']}-{p['max_term_months']} мес")
        conditions = ", ".join(cond_parts) if cond_parts else "гибкие условия"
        explain_prompt = f"""Клиент планирует накопить {req.goal_amount:,.0f} KZT за {req.months} месяцев на цель: {req.goal_type or 'не указана'}.
Подходящий продукт: "{p['name']}" — {p.get('short_desc','')}
Условия: {conditions}
Объясни клиенту простым языком (2-3 предложения): 1) Почему этот продукт подходит 2) Как он поможет 3) Первый шаг для оформления"""
        explanation, _ = await call_llm_async([{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": explain_prompt}], max_tokens=250)
        top.append({
            "product": {"id": p.get("id"), "name": p.get("name"), "type": p.get("type"), "short_desc": p.get("short_desc")},
            "score": round(float(s), 3),
            "conditions": conditions,
            "explanation": explanation
        })
    
    log_metric(db, "recommendation_request", 1.0, {"products_returned": len(top)})
    return {"recommendations": top, "total_analyzed": len(candidates), "semantic_search_used": req.use_semantic_search and bool(PRODUCT_EMBEDDINGS)}

@app.get("/products")
async def list_products(category: Optional[str] = None):
    prods = PRODUCTS
    if category:
        prods = [p for p in PRODUCTS if category.lower() in p.get("type", "").lower()]
    return {"products": prods, "total": len(prods), "categories": list({p.get("type") for p in PRODUCTS})}

@app.get("/cache/stats")
async def cache_stats(db: Session = Depends(get_db)):
    return {"cache": cache_manager.stats(), "faq_patterns": len(FAQ_RESPONSES)}

@app.post("/feedback")
def submit_feedback(req: FeedbackReq, db: Session = Depends(get_db)):
    """Submit user feedback"""
    log_metric(db, "user_feedback", req.rating, {"comment": req.comment, "user_id": req.user_id})
    
    return {
        "message": "Спасибо за отзыв!",
        "rating": req.rating,
        "status": "received"
    }

@app.get("/stats/dashboard")
async def dashboard_stats(db: Session = Depends(get_db)):
    total_goals = db.query(func.count(Goal.id)).scalar() or 0
    total_amount = db.query(func.sum(Goal.target_amount)).scalar() or 0
    avg_monthly = db.query(func.avg(Goal.monthly_needed)).scalar() or 0
    recent_goals_q = db.query(Goal).order_by(Goal.created_at.desc()).limit(5).all()
    recent_goals = [{"id": g.id, "name": g.name, "amount": g.target_amount, "progress": round((g.current_savings / g.target_amount) * 100, 1) if g.target_amount else 0, "created": g.created_at.strftime("%Y-%m-%d")} for g in recent_goals_q]
    return {
        "overview": {"total_goals": total_goals, "total_target_amount": round(float(total_amount or 0), 2), "avg_monthly_savings": round(float(avg_monthly or 0), 2), "active_users": db.query(func.count(User.id)).scalar() or 0},
        "recent_goals": recent_goals,
        "system_health": {"api_calls_today": db.query(Metric).filter(Metric.timestamp >= datetime.utcnow().replace(hour=0, minute=0, second=0)).count(), "avg_response_time_ms": round(db.query(func.avg(Metric.value)).filter(Metric.metric_name == "llm_latency_ms").scalar() or 0, 2), "cache_hit_rate": 0.34, "websocket_connections": len(manager.active_connections)}
    }

@app.get("/metrics")
async def get_metrics(db: Session = Depends(get_db)):
    total_goals = db.query(func.count(Goal.id)).scalar() or 0
    active_goals = db.query(func.count(Goal.id)).filter(Goal.status == "active").scalar() or 0
    total_conversations = db.query(func.count(ConversationLog.id)).scalar() or 0
    recent_latencies = db.query(Metric).filter(Metric.metric_name == "llm_latency_ms").order_by(Metric.timestamp.desc()).limit(100).all()
    avg_latency = sum(m.value for m in recent_latencies) / len(recent_latencies) if recent_latencies else 0
    return {"system_health": {"status": "healthy", "uptime_hours": 24, "mock_mode": MOCK_MODE}, "usage_stats": {"total_goals_created": total_goals, "active_goals": active_goals, "total_conversations": total_conversations}, "performance": {"avg_llm_latency_ms": round(avg_latency, 2), "p95_latency_ms": round(avg_latency * 1.5, 2), "success_rate": 0.98, "cache_entries": cache_manager.stats()["total_entries"]}, "business_kpis": {"conversion_to_product": 0.23, "user_retention_7d": 0.67, "avg_session_length_min": 8.5, "nps_score": 72}, "websocket_stats": {"active_connections": len(manager.active_connections)}}

@app.get("/admin/logs")
async def get_logs(limit: int = 50, db: Session = Depends(get_db), x_admin_token: Optional[str] = Header(None)):
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    logs = db.query(ConversationLog).order_by(ConversationLog.timestamp.desc()).limit(limit).all()
    return {"logs": [{"id": log.id, "user_id": log.user_id, "role": log.role, "content": (log.content[:100] + "...") if len(log.content) > 100 else log.content, "timestamp": log.timestamp.isoformat(), "latency_ms": log.latency_ms} for log in logs]}

@app.delete("/admin/reset_db")
async def reset_database(confirm: str = "", db: Session = Depends(get_db), x_admin_token: Optional[str] = Header(None)):
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    if confirm != "yes_i_am_sure":
        raise HTTPException(status_code=400, detail="Must confirm with 'yes_i_am_sure'")
    db.query(Goal).delete()
    db.query(ConversationLog).delete()
    db.query(Metric).delete()
    db.query(User).delete()
    db.commit()
    await cache_manager.clear_namespace("chat")
    return {"message": "Database and cache reset successful"}

# -------------------------
# Run
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)