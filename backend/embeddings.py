# embeddings.py — Embeddings management (FIXED & ENHANCED)
"""
Управление векторными представлениями продуктов.
Интегрируется с LLMClient из services.
"""
import os
import pickle
import logging
from typing import Dict, List, Optional, Tuple, Callable
import numpy as np
from pathlib import Path

logger = logging.getLogger("embeddings")

EMBEDDINGS_PATH = os.getenv("EMBEDDINGS_PATH", "./data/product_embeddings.pkl")
EMBED_DIM = int(os.getenv("EMBED_DIM", "1536"))


class EmbeddingIndex:
    """Индекс векторных представлений с persistance"""
    
    def __init__(self, path: str = EMBEDDINGS_PATH):
        self.path = path
        self.index: Dict[str, List[float]] = {}
        self._load()
    
    def _load(self):
        """Загрузка индекса из pickle"""
        if os.path.exists(self.path):
            try:
                with open(self.path, "rb") as f:
                    self.index = pickle.load(f)
                logger.info(f"✅ Loaded {len(self.index)} embeddings from {self.path}")
            except Exception as e:
                logger.error(f"Failed to load embeddings: {e}")
                self.index = {}
        else:
            logger.info(f"No embeddings file found at {self.path}")
            self.index = {}
    
    def save(self):
        """Сохранение индекса в pickle"""
        try:
            # Создание директории если не существует
            os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
            
            with open(self.path, "wb") as f:
                pickle.dump(self.index, f)
            logger.info(f"💾 Saved {len(self.index)} embeddings to {self.path}")
        except Exception as e:
            logger.error(f"Failed to save embeddings: {e}")
    
    def set(self, key: str, vector: List[float]):
        """Добавление/обновление вектора"""
        self.index[str(key)] = vector
    
    def get(self, key: str) -> Optional[List[float]]:
        """Получение вектора по ключу"""
        return self.index.get(str(key))
    
    def delete(self, key: str):
        """Удаление вектора"""
        self.index.pop(str(key), None)
    
    def items(self):
        """Все пары (key, vector)"""
        return list(self.index.items())
    
    def keys(self):
        """Все ключи"""
        return list(self.index.keys())
    
    def clear(self):
        """Очистка всего индекса"""
        self.index.clear()
    
    def nearest(self, query_vector: List[float], top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Поиск ближайших векторов (cosine similarity).
        
        Args:
            query_vector: Вектор запроса
            top_k: Количество результатов
        
        Returns:
            List[(key, similarity_score)]
        """
        if not self.index:
            return []
        
        keys = list(self.index.keys())
        vectors = np.array([self.index[k] for k in keys])
        query = np.array(query_vector)
        
        # Косинусное сходство (векторизованно)
        norms = np.linalg.norm(vectors, axis=1) * np.linalg.norm(query)
        similarities = (vectors @ query) / (norms + 1e-9)
        
        # Топ-K индексы
        top_indices = np.argsort(-similarities)[:top_k]
        
        return [(keys[i], float(similarities[i])) for i in top_indices]
    
    def nearest_batch(
        self,
        query_vectors: List[List[float]],
        top_k: int = 5
    ) -> List[List[Tuple[str, float]]]:
        """
        Batch поиск ближайших векторов.
        
        Args:
            query_vectors: Список векторов запросов
            top_k: Количество результатов для каждого
        
        Returns:
            List[List[(key, similarity)]]
        """
        results = []
        for query in query_vectors:
            results.append(self.nearest(query, top_k))
        return results


# ===== SINGLETON INSTANCE =====
EMB_INDEX = EmbeddingIndex()


# ===== HELPER FUNCTIONS =====
async def get_embedding_async(text: str, llm_client=None) -> Optional[List[float]]:
    """
    Получение embedding для текста.
    
    Args:
        text: Текст
        llm_client: LLMClient instance (если None, используется MOCK)
    
    Returns:
        Вектор или None
    """
    if llm_client:
        return await llm_client.get_embedding(text)
    else:
        # Fallback to mock
        import hashlib
        seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.random(EMBED_DIM).tolist()


async def build_index_from_products(
    products: List[dict],
    llm_client=None,
    progress_hook: Optional[Callable[[int, int, str], None]] = None
):
    """
    Построение индекса embeddings для продуктов.
    
    Args:
        products: Список продуктов
        llm_client: LLMClient instance
        progress_hook: Callback(current, total, product_id)
    
    Returns:
        Количество обработанных продуктов
    """
    logger.info(f"Building embeddings index for {len(products)} products...")
    
    processed = 0
    for i, product in enumerate(products):
        product_id = str(product.get("id") or product.get("name"))
        
        # Проверка существующего embedding
        if EMB_INDEX.get(product_id):
            logger.debug(f"Skipping {product_id} (already in index)")
            processed += 1
            if progress_hook:
                progress_hook(i + 1, len(products), product_id)
            continue
        
        # Формирование текста для embedding
        text_parts = [
            product.get("name", ""),
            product.get("type", ""),
            product.get("short_desc", "")
        ]
        text = " ".join(filter(None, text_parts))
        
        # Получение embedding
        embedding = await get_embedding_async(text, llm_client)
        
        if embedding:
            EMB_INDEX.set(product_id, embedding)
            processed += 1
            logger.debug(f"✅ {product_id}: embedded")
        else:
            logger.warning(f"⚠️ {product_id}: failed to get embedding")
        
        # Progress callback
        if progress_hook:
            try:
                progress_hook(i + 1, len(products), product_id)
            except Exception as e:
                logger.error(f"Progress hook error: {e}")
    
    # Сохранение индекса
    EMB_INDEX.save()
    
    logger.info(f"✅ Embeddings index built: {processed}/{len(products)} products")
    return processed


async def rebuild_index(products: List[dict], llm_client=None):
    """
    Полная перестройка индекса (удаляет старые embeddings).
    """
    EMB_INDEX.clear()
    return await build_index_from_products(products, llm_client)


def get_index_stats() -> dict:
    """Статистика индекса"""
    if not EMB_INDEX.index:
        return {
            "total_embeddings": 0,
            "status": "empty",
            "path": EMBEDDINGS_PATH
        }
    
    # Проверка размерности векторов
    sample_vector = next(iter(EMB_INDEX.index.values()))
    dim = len(sample_vector)
    
    return {
        "total_embeddings": len(EMB_INDEX.index),
        "dimension": dim,
        "status": "ready",
        "path": EMBEDDINGS_PATH,
        "keys": list(EMB_INDEX.keys())[:5]  # Первые 5 ключей
    }


# ===== MAINTENANCE =====
def validate_index() -> dict:
    """
    Валидация индекса (проверка целостности).
    """
    issues = []
    
    if not EMB_INDEX.index:
        return {"valid": True, "issues": [], "message": "Index is empty"}
    
    # Проверка размерности
    dimensions = set()
    for key, vector in EMB_INDEX.items():
        if not isinstance(vector, list):
            issues.append(f"Key {key}: vector is not a list")
            continue
        dimensions.add(len(vector))
    
    if len(dimensions) > 1:
        issues.append(f"Inconsistent dimensions: {dimensions}")
    
    # Проверка NaN/Inf
    for key, vector in EMB_INDEX.items():
        arr = np.array(vector)
        if np.any(np.isnan(arr)):
            issues.append(f"Key {key}: contains NaN")
        if np.any(np.isinf(arr)):
            issues.append(f"Key {key}: contains Inf")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "total_checked": len(EMB_INDEX.index),
        "dimensions": list(dimensions)
    }


if __name__ == "__main__":
    # Тест
    print(f"Embeddings path: {EMBEDDINGS_PATH}")
    print(f"Index stats: {get_index_stats()}")
    print(f"Validation: {validate_index()}")