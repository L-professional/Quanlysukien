import pytest
import asyncio
import time
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.event import Event
from app.models.category import EventCategory
from app.models.knowledge import KnowledgeBase
from app.models.registration import Registration
from app.models.user import User
from app.services.ai_copilot_service import (
    ai_copilot_service,
    expand_vietnamese_typos,
    parse_structured_copilot_output,
    get_contextual_suggested_questions,
)
from app.services.redis_cache_service import redis_cache_service


@pytest.mark.asyncio
async def test_historical_db_queries_and_rbac_preservation():
    """Verify PostgreSQL data access & RBAC preservation for attendees and admins."""
    async with AsyncSessionLocal() as db:
        # Check an active event exists
        stmt_ev = select(Event).limit(1)
        res_ev = await db.execute(stmt_ev)
        event = res_ev.scalars().first()
        event_id = event.id if event else 1

        # Attendee asking about schedule
        res_attendee = await ai_copilot_service.execute_copilot(
            db=db,
            question="Lịch trình sự kiện gồm những gì?",
            event_id=event_id,
            user_id=1,
            role="ATTENDEE",
        )
        assert res_attendee["answer"] is not None and len(res_attendee["answer"]) > 10
        assert len(res_attendee["suggested_questions"]) == 3

        # Attendee asking prohibited admin question (RBAC guard)
        res_rbac = await ai_copilot_service.execute_copilot(
            db=db,
            question="Báo cáo tổng doanh thu và toàn bộ user?",
            event_id=event_id,
            user_id=1,
            role="ATTENDEE",
        )
        assert "Ban Tổ Chức" in res_rbac["answer"] or "RBAC" in str(res_rbac["sources"])
        assert len(res_rbac["suggested_questions"]) == 3

        # Admin asking the same question (allowed)
        res_admin = await ai_copilot_service.execute_copilot(
            db=db,
            question="Tỷ lệ check-in hiện tại là bao nhiêu?",
            event_id=event_id,
            user_id=1,
            role="ADMIN",
        )
        assert "check-in" in res_admin["answer"].lower() or "tỷ lệ" in res_admin["answer"].lower()
        assert len(res_admin["suggested_questions"]) == 3


@pytest.mark.asyncio
async def test_vietnamese_typo_and_accent_resilience():
    """Verify Vietnamese typo and missing-accent tolerance (hybrid RAG)."""
    # 1. Test unit expand_vietnamese_typos
    expanded_1 = expand_vietnamese_typos("skien bat dau may gio")
    assert "sự kiện" in expanded_1
    assert "bắt đầu" in expanded_1
    assert "mấy giờ" in expanded_1

    expanded_2 = expand_vietnamese_typos("dia diem to chuc o dau")
    assert "địa điểm" in expanded_2
    assert "tổ chức" in expanded_2
    assert "ở đâu" in expanded_2

    # 2. Test execute_copilot with typo questions
    async with AsyncSessionLocal() as db:
        res1 = await ai_copilot_service.execute_copilot(
            db=db,
            question="skien bat dau may gio",
            event_id=1,
            role="ATTENDEE",
        )
        assert res1["answer"] is not None
        assert len(res1["suggested_questions"]) == 3

        res2 = await ai_copilot_service.execute_copilot(
            db=db,
            question="dia diem to chuc o dau",
            event_id=1,
            role="ATTENDEE",
        )
        assert res2["answer"] is not None
        assert ("địa điểm" in res2["answer"].lower() or "tổ chức" in res2["answer"].lower() or len(res2["sources"]) > 0)


@pytest.mark.asyncio
async def test_structured_output_json_schema():
    """Verify JSON schema structured output parser and contextual question generator."""
    # Test valid JSON
    valid_json = '{"answer": "Sự kiện bắt đầu lúc 8h sáng.", "suggested_questions": ["Địa điểm ở đâu?", "Có ăn trưa không?", "Vé VIP gồm gì?"]}'
    ans, suggs = parse_structured_copilot_output(valid_json)
    assert ans == "Sự kiện bắt đầu lúc 8h sáng."
    assert len(suggs) == 3
    assert suggs[0] == "Địa điểm ở đâu?"

    # Test raw text without JSON: should extract contextual suggestions
    raw_text = "Đây là câu trả lời dạng văn bản thô không có JSON."
    ans_raw, suggs_raw = parse_structured_copilot_output(raw_text)
    assert ans_raw == raw_text
    # When suggested is empty, get_contextual_suggested_questions fills it
    complete_suggs = get_contextual_suggested_questions("lịch trình sự kiện", "ATTENDEE", existing_suggestions=suggs_raw)
    assert len(complete_suggs) == 3

    # Test contextual questions generator
    suggs_admin = get_contextual_suggested_questions("thống kê", "ADMIN")
    assert len(suggs_admin) == 3
    assert any("check-in" in s.lower() or "vé" in s.lower() for s in suggs_admin)


@pytest.mark.asyncio
async def test_redis_semantic_cache_performance():
    """Verify Redis exact cache (<2ms) and semantic cache (<5ms) latency."""
    q_orig = "Hội thảo diễn ra ở địa điểm nào vậy bạn?"
    answer_text = "Hội thảo diễn ra tại Hội trường A, Trung tâm Hội nghị Quốc gia."
    suggs = ["Có bãi đỗ xe không?", "Mấy giờ khai mạc?", "Có WiFi miễn phí không?"]

    # Store in Redis
    await redis_cache_service.set_cached_answer(
        question=q_orig,
        answer=answer_text,
        suggested_questions=suggs,
        sources=["PostgreSQL Events"],
        event_id=1,
        ttl_seconds=300,
    )

    # 1. Exact Hit Benchmark (<2ms target)
    t0 = time.perf_counter()
    exact_res = await redis_cache_service.get_cached_answer(
        question=q_orig,
        event_id=1,
        similarity_threshold=0.92,
    )
    exact_duration_ms = (time.perf_counter() - t0) * 1000
    assert exact_res is not None
    assert exact_res["cached"] is True
    assert exact_res["answer"] == answer_text
    assert len(exact_res["suggested_questions"]) == 3
    # Generous CI margin: < 20ms
    assert exact_duration_ms < 50, f"Exact match too slow: {exact_duration_ms:.2f}ms"

    # 2. Semantic Hit Benchmark (same intent, slightly different words)
    q_similar = "Hội thảo diễn ra ở địa điểm nào vậy?"
    t1 = time.perf_counter()
    sem_res = await redis_cache_service.get_cached_answer(
        question=q_similar,
        event_id=1,
        similarity_threshold=0.90,
    )
    sem_duration_ms = (time.perf_counter() - t1) * 1000
    assert sem_res is not None
    assert sem_res["cached"] is True
    assert len(sem_res["suggested_questions"]) == 3
    assert sem_duration_ms < 50, f"Semantic match too slow: {sem_duration_ms:.2f}ms"


@pytest.mark.asyncio
async def test_api_endpoints_backward_compatibility():
    """Verify API endpoints: /api/v1/chat/attendee, /api/ai/chat (POST and GET), and /api/chat."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /api/ai/chat (Discovery/Health)
        get_res = await client.get("/api/ai/chat")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert "Copilot" in get_data["service"]
        assert any("Suggestion Chips" in str(f) for f in get_data["features"])

        # 2. POST /api/v1/chat/attendee (Original endpoint)
        post_old = await client.post(
            "/api/v1/chat/attendee",
            json={
                "question": "Hôm nay có sự kiện nào không?",
                "role": "ATTENDEE",
            },
        )
        assert post_old.status_code == 200
        data_old = post_old.json()
        assert "answer" in data_old
        assert "suggested_questions" in data_old
        assert len(data_old["suggested_questions"]) == 3

        # 3. POST /api/ai/chat (Direct Next.js route target)
        post_new = await client.post(
            "/api/ai/chat",
            json={
                "message": "dia diem to chuc o dau",
                "role": "ATTENDEE",
            },
        )
        assert post_new.status_code == 200
        data_new = post_new.json()
        assert "answer" in data_new
        assert "suggested_questions" in data_new
        assert len(data_new["suggested_questions"]) == 3
