import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeBase
from app.services.pii_masker import pii_masker, PIIMaskResult
from app.services.gemini_service import gemini_service, GeminiGenerationResult

logger = logging.getLogger(__name__)


@dataclass
class RetrievedContext:
    id: int
    title: str
    content: str
    distance: float


@dataclass
class RAGResult:
    original_question: str
    masked_question: str
    has_pii: bool
    ai_category: str
    draft_reply: str
    contexts: List[RetrievedContext]
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    is_fallback: bool


class RAGEngine:
    """
    Retrieval-Augmented Generation (RAG) Engine with Human-in-the-Loop (HITL) support:
    1. Sanitizes user input with PII Masking.
    2. Embeds question using Gemini text-embedding-004.
    3. Retrieves top-3 matching context items from pgvector knowledge_base.
    4. Generates a draft answer using Gemini-1.5-Flash.
    5. Returns structured telemetry for Staff review and audit logging.
    """

    SYSTEM_INSTRUCTION = (
        "Bạn là trợ lý AI Concierge thông minh và lịch sự của nền tảng quản lý sự kiện EventHub AI. "
        "Nhiệm vụ của bạn là dựa vào THÔNG TIN CẨM NANG NGỮ CẢNH (Context) được cung cấp để soạn thảo "
        "câu trả lời nháp cho khách tham dự sự kiện. "
        "Yêu cầu:\n"
        "1. Trả lời bằng tiếng Việt lịch sự, súc tích, chính xác theo thông tin cẩm nang.\n"
        "2. Nếu thông tin không có trong cẩm nang, hãy thông báo lịch sự rằng thông tin sẽ được nhân viên sự kiện hỗ trợ xác nhận.\n"
        "3. Tuyệt đối không bịa đặt thông tin không có trong ngữ cảnh."
    )

    @staticmethod
    def _classify_category(question: str) -> str:
        """Heuristic and keyword-based category classifier."""
        q_lower = question.lower()
        if any(w in q_lower for w in ["vé", "ticket", "qr", "check-in", "đăng ký", "quét mã", "mua vé"]):
            return "TICKETING"
        elif any(w in q_lower for w in ["đỗ xe", "bãi xe", "gửi xe", "vị trí", "địa điểm", "ở đâu", "đường đi", "cổng"]):
            return "LOGISTICS"
        elif any(w in q_lower for w in ["thời gian", "lịch trình", "mấy giờ", "khi nào", "bắt đầu", "kết thúc", "agenda"]):
            return "SCHEDULE"
        elif any(w in q_lower for w in ["diễn giả", "speaker", "khách mời", "chủ trì", "mc"]):
            return "SPEAKERS"
        elif any(w in q_lower for w in ["ăn", "uống", "tiệc", "teabreak", "lunch", "wifi"]):
            return "SERVICES"
        return "GENERAL"

    async def retrieve_contexts(
        self,
        db: AsyncSession,
        event_id: int,
        query_embedding: List[float],
        top_k: int = 3
    ) -> List[RetrievedContext]:
        """
        Query top-k most similar knowledge items for the event using pgvector cosine distance (<=>).
        """
        try:
            stmt = (
                select(
                    KnowledgeBase.id,
                    KnowledgeBase.title,
                    KnowledgeBase.content,
                    KnowledgeBase.embedding.cosine_distance(query_embedding).label("distance")
                )
                .where(KnowledgeBase.event_id == event_id)
                .where(KnowledgeBase.embedding.is_not(None))
                .order_by("distance")
                .limit(top_k)
            )

            result = await db.execute(stmt)
            rows = result.all()

            contexts = [
                RetrievedContext(
                    id=row[0],
                    title=row[1],
                    content=row[2],
                    distance=float(row[3]) if row[3] is not None else 1.0
                )
                for row in rows
            ]
            return contexts
        except Exception as e:
            logger.error(f"Error querying pgvector knowledge_base: {e}")
            return []

    async def generate_rag_response(
        self,
        db: AsyncSession,
        event_id: int,
        raw_question: str
    ) -> RAGResult:
        """
        Execute the full RAG pipeline for an event inquiry.
        """
        # Step 1: PII Masking
        pii_result: PIIMaskResult = pii_masker.mask_all(raw_question)
        masked_question = pii_result.masked_text

        # Step 2: Auto-classification
        category = self._classify_category(raw_question)

        # Step 3: Question Embedding (768 dimensions)
        embedding = await gemini_service.generate_embedding(masked_question)

        # Step 3.5: SQL Fallback (Keyword Matching)
        from app.models.event import EventSchedule, Event

        sched_stmt = (
            select(EventSchedule, Event)
            .join(Event, EventSchedule.event_id == Event.id)
            .where(EventSchedule.event_id == event_id)
        )
        all_res = await db.execute(sched_stmt)
        all_rows = all_res.all()

        q_lower = masked_question.lower()
        sql_rows = []
        for row in all_rows:
            sched, ev = row[0], row[1]
            title_clean = (sched.title or "").lower()
            speaker_clean = (sched.speaker_name or "").lower()
            title_words = [w for w in title_clean.split() if len(w) >= 4]
            speaker_words = [w for w in speaker_clean.split() if len(w) >= 3]
            title_match = any(w in q_lower for w in title_words) if title_words else False
            speaker_match = any(w in q_lower for w in speaker_words) if speaker_words else False
            room_match = bool(sched.room_location and sched.room_location.lower() in q_lower)
            if (title_clean and title_clean in q_lower) or title_match or speaker_match or room_match:
                sql_rows.append(row)

        print(f"[DEBUG RAG] Câu hỏi: {raw_question}", flush=True)
        print(f"[DEBUG SQL MATCH]: {[r[0].title for r in sql_rows]}", flush=True)

        contexts = []
        if sql_rows:
            for idx, row in enumerate(sql_rows):
                sched = row[0]
                ev = row[1]
                content = (
                    f"Tên phiên: {sched.title}\\n"
                    f"Diễn giả: {sched.speaker_name}\\n"
                    f"Thời gian: {sched.start_time} - {sched.end_time} ({sched.date_label})\\n"
                    f"Địa điểm: {sched.room_location} (Sự kiện: {ev.title})\\n"
                    f"Mô tả: {sched.description or ''}"
                )
                contexts.append(
                    RetrievedContext(
                        id=-1 - idx,
                        title=f"DB Match: {sched.title}",
                        content=content,
                        distance=0.0
                    )
                )
        else:
            # Step 4: Context Retrieval from pgvector
            contexts = await self.retrieve_contexts(db, event_id, embedding, top_k=3)

        # Step 5: Build RAG Prompt
        if contexts:
            context_text = "\n\n".join(
                [f"--- Cẩm nang {i+1}: {c.title} ---\n{c.content}" for i, c in enumerate(contexts)]
            )
        else:
            context_text = "Hiện chưa có tài liệu cẩm nang cụ thể trong cơ sở tri thức cho câu hỏi này."

        prompt = (
            f"NGỮ CẢNH CẨM NANG SỰ KIỆN:\n{context_text}\n\n"
            f"CÂU HỎI CỦA KHÁCH THAM DỰ:\n{masked_question}\n\n"
            f"Hãy soạn thảo câu trả lời nháp:"
        )

        # Step 6: Generate Draft Answer via Gemini
        gemini_result: GeminiGenerationResult = await gemini_service.generate_draft_answer(
            prompt=prompt,
            system_instruction=self.SYSTEM_INSTRUCTION
        )

        return RAGResult(
            original_question=raw_question,
            masked_question=masked_question,
            has_pii=pii_result.has_pii,
            ai_category=category,
            draft_reply=gemini_result.text,
            contexts=contexts,
            prompt_tokens=gemini_result.prompt_tokens,
            completion_tokens=gemini_result.completion_tokens,
            latency_ms=gemini_result.latency_ms,
            is_fallback=gemini_result.is_fallback
        )


rag_engine = RAGEngine()
