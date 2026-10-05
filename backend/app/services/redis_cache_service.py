import hashlib
import json
import logging
import math
import time
import unicodedata
from typing import Optional, Dict, Any, List, Tuple

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from app.core.config import settings

logger = logging.getLogger(__name__)


def remove_diacritics(text_val: Optional[str]) -> str:
    """Normalize and remove Vietnamese accents for robust cache lookup."""
    if not text_val:
        return ""
    normalized = unicodedata.normalize("NFD", text_val)
    no_marks = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return no_marks.replace("đ", "d").replace("Đ", "D").lower().strip()


STOP_WORDS = {
    "la", "va", "co", "gi", "khong", "the", "nao", "o", "dau", "cho",
    "toi", "hoi", "biet", "ve", "tai", "vao", "ngay", "luc", "gio",
    "xin", "chao", "em", "ban", "ad", "admin", "ai"
}


import re
from difflib import SequenceMatcher

VIETNAMESE_TYPO_MAP = {
    "skien": "su kien",
    "sukien": "su kien",
    "sk": "su kien",
    "s.k": "su kien",
    "tgian": "thoi gian",
    "t/g": "thoi gian",
    "ddiem": "dia diem",
    "d/d": "dia diem",
    "dgia": "dien gia",
    "toadam": "toa dam",
    "hoithao": "hoi thao",
    "checkin": "check in",
    "soatve": "soat ve",
}


class RedisSemanticCacheService:
    """
    Redis Semantic & Exact Cache Engine (Task 101)
    - Sub-millisecond exact match cache
    - Cosine similarity & dense/sparse semantic cache (> 92% similarity)
    - Non-blocking async Redis client with automatic connection recovery
    - Zero downtime graceful fallback if Redis is unavailable
    """

    def __init__(self):
        self.redis_url = settings.async_redis_url
        self._client: Optional[aioredis.Redis] = None
        self.default_ttl = 3600  # 1 hour
        self.similarity_threshold = 0.92  # 92% semantic similarity threshold

    async def get_client(self) -> Optional[Any]:
        """Get or initialize async Redis client with safety check and loop recovery."""
        if aioredis is None:
            return None
        if self._client is not None:
            try:
                await self._client.ping()
                return self._client
            except Exception:
                self._client = None

        try:
            client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
            )
            # Ping to verify live connection
            await client.ping()
            self._client = client
            return self._client
        except Exception as e:
            logger.warning(f"Redis cache connection failed: {e}. Falling back to live execution.")
            self._client = None
            return None

    def normalize_query(self, query: str) -> str:
        """Strip accents, lowercase, clean punctuation, expand typos and filter stop words."""
        cleaned = remove_diacritics(query)
        cleaned = re.sub(r"[^\w\s]", " ", cleaned)
        tokens = cleaned.split()
        expanded_tokens = []
        for t in tokens:
            if t in VIETNAMESE_TYPO_MAP:
                expanded_tokens.extend(VIETNAMESE_TYPO_MAP[t].split())
            else:
                expanded_tokens.append(t)
        words = [w for w in expanded_tokens if len(w) >= 2 and w not in STOP_WORDS]
        return " ".join(words) if words else " ".join(expanded_tokens)

    def compute_cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two float vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        if norm1 <= 0.0 or norm2 <= 0.0:
            return 0.0
        return dot_product / (norm1 * norm2)

    def compute_text_similarity(self, s1: str, s2: str) -> float:
        """Compute token-level and character-level similarity."""
        if not s1 or not s2:
            return 0.0
        if s1 == s2:
            return 1.0
        w1 = set(s1.split())
        w2 = set(s2.split())
        if not w1 or not w2:
            return 0.0
        intersection = w1.intersection(w2)
        union = w1.union(w2)
        jaccard = len(intersection) / len(union) if union else 0.0

        # Substring / Containment bonus
        if s1 in s2 or s2 in s1:
            jaccard = max(jaccard, 0.95)

        # Character sequence similarity
        seq_ratio = SequenceMatcher(None, s1, s2).ratio()
        return max(jaccard, seq_ratio)

    async def get(
        self,
        query: str,
        event_id: Optional[int] = None,
        role: str = "ATTENDEE",
        query_embedding: Optional[List[float]] = None,
        similarity_threshold: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Query Redis Cache (Exact match + Semantic match > 92%).
        Returns cached payload or None in < 5ms.
        """
        start_ts = time.perf_counter()
        client = await self.get_client()
        if not client:
            return None

        norm_q = self.normalize_query(query)
        ev_key = str(event_id) if event_id is not None else "global"
        role_key = (role or "ATTENDEE").upper()
        q_hash = hashlib.md5(norm_q.encode("utf-8")).hexdigest()

        exact_key = f"chat_cache:exact:{ev_key}:{role_key}:{q_hash}"
        index_key = f"chat_cache:idx:{ev_key}:{role_key}"

        # 1. Exact Match Check (Sub-millisecond)
        try:
            exact_val = await client.get(exact_key)
            if exact_val:
                data = json.loads(exact_val)
                elapsed_ms = (time.perf_counter() - start_ts) * 1000
                data["cache_hit"] = "EXACT"
                data["cached"] = True
                data["cache_latency_ms"] = round(elapsed_ms, 2)
                logger.info(f"Redis Cache EXACT HIT in {elapsed_ms:.2f}ms for: '{query}'")
                return data
        except Exception as e:
            logger.warning(f"Redis exact cache get failed: {e}")

        # 2. Semantic Similarity Match Check (> 92%)
        try:
            entries = await client.lrange(index_key, 0, 50)
            if entries:
                for entry_str in entries:
                    entry = json.loads(entry_str)
                    cached_norm = entry.get("norm_q", "")
                    cached_key = entry.get("key", "")

                    sim = 0.0
                    # Vector Cosine similarity check if embeddings are present
                    cached_emb = entry.get("embedding")
                    if query_embedding and cached_emb and len(query_embedding) == len(cached_emb):
                        sim = self.compute_cosine_similarity(query_embedding, cached_emb)

                    # Text semantic similarity check fallback/complement
                    text_sim = self.compute_text_similarity(norm_q, cached_norm)
                    final_sim = max(sim, text_sim)

                    effective_thresh = similarity_threshold if similarity_threshold is not None else self.similarity_threshold
                    if final_sim >= effective_thresh:
                        cached_raw = await client.get(cached_key)
                        if cached_raw:
                            cached_data = json.loads(cached_raw)
                            elapsed_ms = (time.perf_counter() - start_ts) * 1000
                            cached_data["cache_hit"] = "SEMANTIC"
                            cached_data["cached"] = True
                            cached_data["similarity"] = round(final_sim * 100, 1)
                            cached_data["cache_latency_ms"] = round(elapsed_ms, 2)
                            logger.info(
                                f"Redis Cache SEMANTIC HIT ({final_sim:.1%}) in {elapsed_ms:.2f}ms for: '{query}'"
                            )
                            return cached_data
        except Exception as e:
            logger.warning(f"Redis semantic cache search failed: {e}")

        return None

    async def set(
        self,
        query: str,
        response_data: Dict[str, Any],
        event_id: Optional[int] = None,
        role: str = "ATTENDEE",
        query_embedding: Optional[List[float]] = None,
        ttl: Optional[int] = None
    ) -> bool:
        """Store query response in Redis with TTL and register in semantic index."""
        client = await self.get_client()
        if not client:
            return False

        norm_q = self.normalize_query(query)
        ev_key = str(event_id) if event_id is not None else "global"
        role_key = (role or "ATTENDEE").upper()
        q_hash = hashlib.md5(norm_q.encode("utf-8")).hexdigest()

        exact_key = f"chat_cache:exact:{ev_key}:{role_key}:{q_hash}"
        index_key = f"chat_cache:idx:{ev_key}:{role_key}"
        cache_ttl = ttl or self.default_ttl

        # Clean response data for serialization
        payload = {
            "answer": response_data.get("answer", ""),
            "suggested_questions": response_data.get("suggested_questions", []),
            "sources": response_data.get("sources", []),
            "is_fallback": response_data.get("is_fallback", False),
            "ai_category": response_data.get("ai_category", "COPILOT_SQL_RAG"),
            "action_links": response_data.get("action_links", []),
            "cached_at": time.time(),
        }

        try:
            # 1. Save Exact Key with TTL
            await client.set(exact_key, json.dumps(payload, ensure_ascii=False), ex=cache_ttl)

            # 2. Add to Semantic Index (limiting to top 50 recent queries)
            index_entry = {
                "norm_q": norm_q,
                "key": exact_key,
                "embedding": query_embedding[:768] if query_embedding else None,
                "created_at": time.time(),
            }
            await client.lpush(index_key, json.dumps(index_entry))
            await client.ltrim(index_key, 0, 50)
            await client.expire(index_key, cache_ttl * 2)
            return True
        except Exception as e:
            logger.warning(f"Failed to write to Redis cache: {e}")
            return False

    async def set_cached_answer(
        self,
        question: str,
        answer: str,
        suggested_questions: Optional[List[str]] = None,
        sources: Optional[List[str]] = None,
        event_id: Optional[int] = None,
        role: str = "ATTENDEE",
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        """Convenience method to set cached answer with suggested questions."""
        return await self.set(
            query=question,
            response_data={
                "answer": answer,
                "suggested_questions": suggested_questions or [],
                "sources": sources or [],
            },
            event_id=event_id,
            role=role,
            ttl=ttl_seconds,
        )

    async def get_cached_answer(
        self,
        question: str,
        event_id: Optional[int] = None,
        role: str = "ATTENDEE",
        similarity_threshold: float = 0.92,
    ) -> Optional[Dict[str, Any]]:
        """Convenience method to retrieve cached answer."""
        return await self.get(
            query=question,
            event_id=event_id,
            role=role,
            similarity_threshold=similarity_threshold,
        )

    async def clear_all(self) -> bool:
        """Utility to flush chat cache."""
        client = await self.get_client()
        if not client:
            return False
        try:
            keys = await client.keys("chat_cache:*")
            if keys:
                await client.delete(*keys)
            return True
        except Exception as e:
            logger.warning(f"Failed to clear Redis chat cache: {e}")
            return False


redis_semantic_cache = RedisSemanticCacheService()
redis_cache_service = redis_semantic_cache
