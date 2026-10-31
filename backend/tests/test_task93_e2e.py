import pytest
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import AsyncSessionLocal, init_db
from app.models.event import Event
from app.models.category import EventCategory
from app.services.ai_copilot_service import ai_copilot_service


@pytest.mark.asyncio
async def test_task93_full_end_to_end_copilot_suite():
    """
    Task 93 End-to-End Comprehensive Test Suite:
    1. Admin creates event 'Hội Thảo Công Nghệ Tương Lai 2026' in PostgreSQL.
    2. Chatbot AI is queried: 'Có sự kiện Hội Thảo Công Nghệ Tương Lai 2026 không?' -> Returns 100% accurate info via live tool.
    3. Admin updates event location to 'Tòa nhà FPT Tower, Cầu Giấy, Hà Nội'.
    4. Chatbot AI is queried again -> Zero-cache reflects new location immediately.
    5. Admin deletes test event -> Chatbot AI triggers Anti-Hallucination Guardrail and confirms not found/deleted.
    6. User queries 'Diễn đàn ASEAN' -> Chatbot AI confirms ONGOING state today under UTC+7.
    7. RBAC Guardrail: Attendee denied admin check-in stats; Admin receives full metrics.
    """
    await init_db()

    async with AsyncSessionLocal() as session:
        # Cleanup any previous test artifacts
        await session.execute(delete(Event).where(Event.title == "Hội Thảo Công Nghệ Tương Lai 2026"))
        await session.commit()

        # Step 1: Ensure Category exists
        cat_res = await session.execute(select(EventCategory).limit(1))
        category = cat_res.scalars().first()
        if not category:
            category = EventCategory(name="Công nghệ cao", code="TECH_FUTURE_2026")
            session.add(category)
            await session.commit()
            await session.refresh(category)

        now = datetime.now(timezone.utc)
        # Step 1: Create Test Event in PostgreSQL
        test_event = Event(
            title="Hội Thảo Công Nghệ Tương Lai 2026",
            description="Hội thảo chuyên sâu về Trí Tuệ Nhân Tạo thế hệ mới và Điện Toán Lượng Tử.",
            category_id=category.id,
            location="Trung Tâm Hội Nghị Quốc Gia",
            location_address="Đại lộ Thăng Long, Mễ Trì, Nam Từ Liêm, Hà Nội",
            start_time=now + timedelta(days=45),
            end_time=now + timedelta(days=46),
            start_date="15/11/2026 08:30",
            end_date="16/11/2026 17:30",
            status="PUBLISHED",
            capacity=1200,
            registered_count=450,
        )
        session.add(test_event)
        await session.commit()
        await session.refresh(test_event)
        event_id = test_event.id
        assert event_id is not None

        # Step 2: Query Chatbot AI about newly created event
        res_create = await ai_copilot_service.execute_copilot(
            db=session,
            question="Có sự kiện Hội Thảo Công Nghệ Tương Lai 2026 không?",
            user_role="ADMIN"
        )
        ans_create = res_create["answer"]
        assert "Hội Thảo Công Nghệ Tương Lai 2026" in ans_create
        assert "Trung Tâm Hội Nghị Quốc Gia" in ans_create or "Hà Nội" in ans_create
        assert any("/events" in link["url"] for link in res_create.get("action_links", []))

        # Step 3: Admin updates event location (Update Event in DB)
        test_event.location = "Tòa nhà FPT Tower, Cầu Giấy, Hà Nội"
        test_event.location_address = "Số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội"
        await session.commit()

        # Query Chatbot AI again -> Must reflect new location with Zero-Cache
        res_update = await ai_copilot_service.execute_copilot(
            db=session,
            question="Có sự kiện Hội Thảo Công Nghệ Tương Lai 2026 không?",
            user_role="ADMIN"
        )
        ans_update = res_update["answer"]
        assert "Hội Thảo Công Nghệ Tương Lai 2026" in ans_update
        assert "FPT Tower" in ans_update or "Phạm Văn Bạch" in ans_update

        # Step 4: Admin deletes the test event
        await session.execute(delete(Event).where(Event.id == event_id))
        await session.commit()

        # Query Chatbot AI again -> Anti-Hallucination Guardrail: Must report NOT FOUND / DELETED
        res_delete = await ai_copilot_service.execute_copilot(
            db=session,
            question="Có sự kiện Hội Thảo Công Nghệ Tương Lai 2026 không?",
            user_role="ADMIN"
        )
        ans_delete = res_delete["answer"]
        assert any(phrase in ans_delete.lower() for phrase in ["không tìm thấy", "chưa từng được tạo", "đã bị xóa", "không tồn tại"])
        assert "Hội Thảo Công Nghệ Tương Lai 2026" in ans_delete

        # Step 5: Ensure ASEAN event exists in PostgreSQL
        asean_res = await session.execute(select(Event).where(Event.title.ilike("%asean%")))
        asean_ev = asean_res.scalars().first()
        if not asean_ev:
            asean_ev = Event(
                title="Diễn đàn ASEAN",
                description="Báo cáo chuyên môn 'Diễn đàn ASEAN' mang đến góc nhìn học thuật chuyên sâu và phương pháp luận nghiên cứu nghiêm cẩn trong lĩnh vực Khoa học & Công nghệ.",
                category_id=category.id,
                location="ICTU Quyết Thắng, tỉnh Thái Nguyên",
                location_address="ICTU Quyết Thắng, tỉnh Thái Nguyên",
                start_date="29/09/2026 00:37",
                end_date="29/09/2026 03:37",
                start_time=now,
                end_time=now + timedelta(hours=3),
                status="ONGOING",
                capacity=500,
                registered_count=180
            )
            session.add(asean_ev)
            await session.commit()
            await session.refresh(asean_ev)

        # Query about 'Diễn đàn ASEAN' (Ongoing event in UTC+7)
        res_asean = await ai_copilot_service.execute_copilot(
            db=session,
            question="tôi thấy có sự kiện Diễn đàn ASEAN đang diễn ra hôm nay mà",
            user_role="ATTENDEE"
        )
        ans_asean = res_asean["answer"]
        print("ANS_ASEAN:", repr(ans_asean))
        assert "Diễn đàn ASEAN" in ans_asean
        assert any(kw in ans_asean for kw in ["Đang diễn ra", "ONGOING", "00:37", "ICTU"])

        # Step 6: Strict RBAC Guardrail Check
        # Attendee asks for check-in rate -> Must be blocked
        res_attendee_blocked = await ai_copilot_service.execute_copilot(
            db=session,
            question="Tỷ lệ check-in hiện tại của sự kiện là bao nhiêu?",
            user_role="ATTENDEE"
        )
        assert "chỉ dành cho Ban Tổ Chức" in res_attendee_blocked["answer"]
        assert any("/events" in l["url"] for l in res_attendee_blocked.get("action_links", []))

        # Admin asks for check-in rate -> Must be allowed with live stats
        res_admin_allowed = await ai_copilot_service.execute_copilot(
            db=session,
            question="Báo cáo tỷ lệ check-in hiện tại bao nhiêu?",
            user_role="ADMIN"
        )
        assert any(term in res_admin_allowed["answer"].lower() for term in ["tỷ lệ check-in", "báo cáo thống kê", "%"])
