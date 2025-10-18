# backend/embeddings.py
import os
import pickle
import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("embeddings")

OPENAI_HUB_URL = os.getenv("OPENAI_HUB_URL", "https://openai-hub.neuraldeep.tech")
OPENAI_HUB_KEY = os.getenv("OPENAI_HUB_KEY", "")
HEADERS = {"Authorization": f"Bearer {OPENAI_HUB_KEY}"} if OPENAI_HUB_KEY else {}

EMBEDDINGS_PATH = os.getenv("EMBEDDINGS_PATH", "./data/product_embeddings.pkl")
EMBED_DIM = int(os.getenv("EMBED_DIM", "1536"))

class EmbeddingIndex:
    def __init__(self, path: str = EMBEDDINGS_PATH):
        self.path = path
        self.index: Dict[str, List[float]] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, "rb") as f:
                    self.index = pickle.load(f)
                logger.info("Loaded embeddings index (%d entries) from %s", len(self.index), self.path)
            except Exception as e:
                logger.exception("Failed to load embeddings: %s", e)
                self.index = {}
        else:
            self.index = {}

    def save(self):
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        with open(self.path, "wb") as f:
            pickle.dump(self.index, f)

    def set(self, key: str, vector: List[float]):
        self.index[str(key)] = vector

    def get(self, key: str) -> Optional[List[float]]:
        return self.index.get(str(key))

    def items(self):
        return list(self.index.items())

    def nearest(self, query_vector: List[float], top_k: int = 5) -> List[Tuple[str, float]]:
        if not self.index:
            return []
        keys = list(self.index.keys())
        mat = np.array([self.index[k] for k in keys])
        q = np.array(query_vector)
        # cosine similarity
        denom = (np.linalg.norm(mat, axis=1) * (np.linalg.norm(q) + 1e-9)) + 1e-12
        sims = (mat @ q) / denom
        idx = np.argsort(-sims)[:top_k]
        return [(keys[i], float(sims[i])) for i in idx]

# singleton instance
EMB_INDEX = EmbeddingIndex()

async def get_embedding_async(text: str) -> Optional[List[float]]:
    """
    Async wrapper to call the Hub embeddings endpoint.
    Returns embedding as list[float] or None.
    """
    if os.getenv("MOCK_MODE", "true").lower() in ("1", "true", "yes"):
        # deterministic pseudo-random vector for stability (hash-based seed)
        seed = int(abs(hash(text)) % (2**31))
        rng = np.random.default_rng(seed)
        return rng.random(EMBED_DIM).tolist()

    payload = {"model": "text-embedding-3-small", "input": text}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(f"{OPENAI_HUB_URL}/v1/embeddings", headers={**HEADERS, "Content-Type": "application/json"}, json=payload)
            r.raise_for_status()
            data = r.json()
            if "data" in data and len(data["data"]) > 0:
                return data["data"][0].get("embedding")
    except Exception as e:
        logger.exception("Embedding request failed: %s", e)
    return None

async def build_index_from_products(products: List[dict], progress_hook=None):
    """
    Given products list, compute embeddings and populate EMB_INDEX.
    progress_hook(optional) receives (i, total, product_id).
    """
    for i, p in enumerate(products):
        pid = str(p.get("id") or p.get("name"))
        text = f"{p.get('name','') or ''} {p.get('type','') or ''} {p.get('short_desc','') or ''}"
        emb = await get_embedding_async(text)
        if emb:
            EMB_INDEX.set(pid, emb)
        if progress_hook:
            try:
                progress_hook(i + 1, len(products), pid)
            except Exception:
                pass
    EMB_INDEX.save()
    return len(EMB_INDEX.index)
