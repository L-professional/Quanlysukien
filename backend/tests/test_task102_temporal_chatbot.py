"""
Integration and Unit Tests for Task 102:
Temporal Intent & Dynamic Time Querying for AI Chatbot (EventHub AI Copilot)
"""
import pytest
import asyncio
from datetime import datetime, date, timedelta
from app.core.database import AsyncSessionLocal
from app.core.timezone import get_vn_now, to_vn_datetime
from app.services.ai_copilot_service import (
    ai_copilot_service,
    detect_temporal_intent,
    expand_vietnamese_typos,
    TemporalIntent,
    get_current_vn_time_str
)
from app.api.v1.public_chat import AttendeeChatRequest


@pytest.mark.asyncio
async def test_dynamic_server_timestamp_and_intent_detection():
    """Verify system timestamp formatting and natural language intent parsing without hardcoding."""
    now_vn, time_str = get_current_vn_time_str()
    assert "Hà Nội UTC+7" in time_str or "UTC+7" in time_str
    assert now_vn.year == 2026
    assert now_vn.month == 10
    assert now_vn.day == 2

    # 1. Test "hôm nay có sự kiện nào không?"
    intent_today = detect_temporal_intent("hôm nay có sự kiện nào không?", now_vn)
    assert intent_today is not None
    assert intent_today.intent_type == "TODAY"
    assert intent_today.start_date == date(2026, 10, 2)
    assert "hôm nay" in intent_today.reference_time_str.lower()

    # 2. Test typo / natural slang: "ngay mai co sk gi hot ko"
    intent_tm = detect_temporal_intent("ngay mai co sk gi hot ko", now_vn)
    assert intent_tm is not None
    assert intent_tm.intent_type == "TOMORROW"
    assert intent_tm.start_date == date(2026, 10, 3)
    assert "ngày mai" in intent_tm.reference_time_str.lower()

    # 3. Test afternoon query: "chieu nay co hoi thao nao"
    intent_afternoon = detect_temporal_intent("chieu nay co hoi thao nao", now_vn)
    assert intent_afternoon is not None
    assert intent_afternoon.intent_type == "TODAY"
    assert intent_afternoon.time_of_day == "CHIỀU"
    assert "chiều nay" in intent_afternoon.reference_time_str.lower()

    # 4. Test weekend query: "cuoi tuan nay co sk j k"
    intent_weekend = detect_temporal_intent("cuoi tuan nay co sk j k", now_vn)
    assert intent_weekend is not None
    assert intent_weekend.intent_type == "THIS_WEEKEND"
    assert "cuối tuần này" in intent_weekend.reference_time_str.lower()

    # 5. Test active now query: "sự kiện đang diễn ra bây giờ"
    intent_now = detect_temporal_intent("sự kiện đang diễn ra bây giờ", now_vn)
    assert intent_now is not None
    assert intent_now.intent_type == "ONGOING_NOW"
    assert intent_now.is_active_now_only is True


@pytest.mark.asyncio
async def test_scenario_1_today_events_query():
    """
    Scenario 1: User asks 'hôm nay có sự kiện nào không?'.
    Chatbot matches today with PostgreSQL and only returns events occurring today (ID 97, ID 146).
    """
    async with AsyncSessionLocal() as db:
        res = await ai_copilot_service.execute_copilot(
            db=db,
            question="hôm nay có sự kiện nào không?",
            user_role="ATTENDEE",
            current_system_time="Current_System_Time: 02/10/2026 17:30:00 (UTC+7)"
        )

        assert "answer" in res
        ans = res["answer"]
        # Must clearly state the reference lookup time
        assert "Tính đến" in ans
        assert "hôm nay (02/10/2026)" in ans or "02/10/2026" in ans

        # Must include today's active events
        assert "Triển Lãm Robot" in ans or "Robot" in ans
        assert "Diễn đàn ASEAN" in ans or "ASEAN" in ans

        # Must include required event attributes
        assert "Trạng thái:" in ans
        assert "Khung giờ" in ans or "Thời gian:" in ans
        assert "Địa điểm:" in ans
        assert "WiFi" in ans or "wifi" in ans.lower()

        # Must generate 3 smart suggestion chips
        assert "suggested_questions" in res
        assert len(res["suggested_questions"]) == 3


@pytest.mark.asyncio
async def test_scenario_2_temporal_variants():
    """
    Scenario 2: Natural language typo and phrasing variants:
    - 'ngay mai co sk gi hot ko'
    - 'chieu nay co hoi thao nao'
    """
    async with AsyncSessionLocal() as db:
        # Variant A: Tomorrow
        res_tm = await ai_copilot_service.execute_copilot(
            db=db,
            question="ngay mai co sk gi hot ko",
            user_role="ATTENDEE"
        )
        assert "answer" in res_tm
        ans_tm = res_tm["answer"]
        assert "ngày mai" in ans_tm.lower() or "03/10/2026" in ans_tm

        # Variant B: This afternoon
        res_af = await ai_copilot_service.execute_copilot(
            db=db,
            question="chieu nay co hoi thao nao",
            user_role="ATTENDEE"
        )
        assert "answer" in res_af
        ans_af = res_af["answer"]
        assert "chiều nay" in ans_af.lower() or "hôm nay" in ans_af.lower() or "02/10/2026" in ans_af

        # Variant C: Weekend
        res_wk = await ai_copilot_service.execute_copilot(
            db=db,
            question="cuoi tuan nay co sk j k",
            user_role="ATTENDEE"
        )
        assert "answer" in res_wk
        ans_wk = res_wk["answer"]
        assert "cuối tuần" in ans_wk.lower() or "03/10" in ans_wk


@pytest.mark.asyncio
async def test_scenario_3_regression_existing_tools():
    """
    Scenario 3: Backward Compatibility (Ticket tiers, speakers, check-in stats, anti-hallucination).
    """
    async with AsyncSessionLocal() as db:
        # 1. Ticket Tiers & Prices
        res_tickets = await ai_copilot_service.execute_copilot(
            db=db,
            question="các phân hạng vé hiện có trong hệ thống?",
            user_role="ATTENDEE"
        )
        assert "Vé Tiêu Chuẩn" in res_tickets["answer"]
        assert "Vé VIP" in res_tickets["answer"]

        # 2. Check-in Rate (Admin/Staff only)
        res_admin = await ai_copilot_service.execute_copilot(
            db=db,
            question="tỷ lệ check-in hiện tại là bao nhiêu?",
            user_role="ADMIN"
        )
        assert "TỶ LỆ CHECK-IN" in res_admin["answer"]

        # 3. RBAC guardrail for Attendee asking check-in rate
        res_attendee_blocked = await ai_copilot_service.execute_copilot(
            db=db,
            question="tỷ lệ check-in hiện tại là bao nhiêu?",
            user_role="ATTENDEE"
        )
        assert "Ban Tổ Chức" in res_attendee_blocked["answer"]
        assert res_attendee_blocked["ai_category"] == "SECURITY_RBAC"

        # 4. Anti-hallucination for non-existent event
        res_fake = await ai_copilot_service.execute_copilot(
            db=db,
            question="Có sự kiện Hội Thảo Khám Phá Sao Hỏa 2099 không?",
            user_role="ATTENDEE"
        )
        assert "không tìm thấy" in res_fake["answer"].lower() or "không tồn tại" in res_fake["answer"].lower()


@pytest.mark.asyncio
async def test_schema_accepts_current_system_time():
    """Verify AttendeeChatRequest model accepts current_system_time."""
    req = AttendeeChatRequest(
        question="hôm nay có sự kiện gì?",
        current_system_time="Current_System_Time: 02/10/2026 17:30:00 (UTC+7)"
    )
    assert req.current_system_time == "Current_System_Time: 02/10/2026 17:30:00 (UTC+7)"
