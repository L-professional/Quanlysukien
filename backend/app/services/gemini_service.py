"""
Gemini AI Service — Migrated to google-genai SDK v2.x
Provides:
  - Text generation via gemini-1.5-flash
  - 768-dimension vector embeddings via text-embedding-004
Includes graceful fallback when API key is absent or calls fail.
"""
import asyncio
import time
import logging
from dataclasses import dataclass
from typing import List, Optional

from google import genai
from google.genai import types as genai_types

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class GeminiGenerationResult:
    text: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    is_fallback: bool = False
    error_message: Optional[str] = None


class GeminiService:
    """
    Service wrapper for Google Gemini API (google-genai SDK v2):
    - Text Generation: gemini-1.5-flash
    - Embeddings: text-embedding-004 (768 dimensions)
    Includes graceful fallbacks, timeout handling, and token telemetry.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self._client: Optional[genai.Client] = None

        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                self._client = genai.Client(api_key=self.api_key)
                logger.info("Gemini Client initialized successfully (google-genai SDK v2).")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    def _generate_mock_embedding(self, text: str) -> List[float]:
        """Generate a deterministic 768-dimensional fallback embedding vector."""
        seed = sum(ord(c) for c in text) if text else 42
        return [float((((i + seed) * 17) % 1000) / 1000.0) for i in range(768)]

    async def generate_embedding(self, text: str, timeout_seconds: float = 8.0) -> List[float]:
        """
        Generate 768-dimensional vector embedding for given text using text-embedding-004.
        Falls back to deterministic mock vector if API is unavailable.
        """
        if self._client is None:
            logger.warning("Gemini Client not configured; using deterministic mock embedding.")
            return self._generate_mock_embedding(text)

        start_time = time.perf_counter()
        try:
            def _call_embed() -> List[float]:
                response = self._client.models.embed_content(  # type: ignore[union-attr]
                    model=f"models/{self.embedding_model}",
                    contents=text,
                    config=genai_types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
                )
                # SDK v2: response.embeddings is a list of ContentEmbedding objects
                if response.embeddings and len(response.embeddings) > 0:
                    values = response.embeddings[0].values
                    return list(values) if values else []
                return []

            embedding = await asyncio.wait_for(
                asyncio.to_thread(_call_embed),
                timeout=timeout_seconds,
            )
            if embedding and len(embedding) == 768:
                return embedding
            return self._generate_mock_embedding(text)

        except (asyncio.TimeoutError, Exception) as e:
            latency = (time.perf_counter() - start_time) * 1000
            logger.error(f"Gemini embedding call failed after {latency:.2f}ms: {e}")
            return self._generate_mock_embedding(text)

    async def generate_draft_answer(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        timeout_seconds: float = 20.0,
        temperature: float = 0.4,
        max_output_tokens: int = 2048,
    ) -> GeminiGenerationResult:
        """
        Generate a draft answer using gemini model with automatic fallback.
        """
        start_time = time.perf_counter()

        if self._client is None:
            latency_ms = (time.perf_counter() - start_time) * 1000
            return GeminiGenerationResult(
                text=(
                    "Hiện chưa có thông tin về vấn đề này."
                ),
                prompt_tokens=len(prompt.split()),
                completion_tokens=30,
                latency_ms=latency_ms,
                is_fallback=True,
                error_message="Gemini API Key is not configured.",
            )

        try:
            def _call_generate():
                config_kwargs = {
                    "temperature": temperature,
                    "max_output_tokens": max_output_tokens,
                }
                if system_instruction:
                    config_kwargs["system_instruction"] = system_instruction
                config = genai_types.GenerateContentConfig(**config_kwargs)

                # Try preferred model first, then fallback models
                candidate_models = [self.model_name, "gemini-2.5-flash", "gemini-flash-latest"]
                # Deduplicate while preserving order
                seen = set()
                models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

                last_err = None
                for m in models_to_try:
                    try:
                        response = self._client.models.generate_content(
                            model=m,
                            contents=prompt,
                            config=config,
                        )
                        return response
                    except Exception as err:
                        last_err = err
                        logger.warning(f"Gemini model '{m}' call failed: {err}. Trying next fallback...")
                raise last_err

            response = await asyncio.wait_for(
                asyncio.to_thread(_call_generate),
                timeout=timeout_seconds,
            )

            latency_ms = (time.perf_counter() - start_time) * 1000

            prompt_tokens = 0
            completion_tokens = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                completion_tokens = (
                    getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                )

            generated_text = ""
            if response.candidates:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    generated_text = "".join(
                        part.text for part in candidate.content.parts if hasattr(part, "text")
                    )

            if not generated_text and hasattr(response, "text"):
                generated_text = response.text or ""

            if prompt_tokens == 0:
                prompt_tokens = len(prompt.split())
            if completion_tokens == 0 and generated_text:
                completion_tokens = len(generated_text.split())

            return GeminiGenerationResult(
                text=generated_text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
                is_fallback=False,
            )

        except (asyncio.TimeoutError, Exception) as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"Gemini generation call failed after {latency_ms:.2f}ms: {e}")
            return GeminiGenerationResult(
                text=(
                    "Hiện chưa có thông tin về vấn đề này."
                ),
                prompt_tokens=len(prompt.split()),
                completion_tokens=25,
                latency_ms=latency_ms,
                is_fallback=True,
                error_message=str(e),
            )


gemini_service = GeminiService()
