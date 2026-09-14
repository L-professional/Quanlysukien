import pytest
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.database import AsyncSessionLocal, init_db
from app.models.role import Role, RoleEnum
from app.models.user import User
from app.models.category import EventCategory
from app.models.event import Event, EventStatusEnum
from app.models.knowledge import KnowledgeBase
from app.models.inquiry import EventInquiry, InquiryStatusEnum
from app.models.ai_log import AILog
from app.services.rag_engine import rag_engine
from app.services.gemini_service import gemini_service


async def ensure_base_roles(session):
    """Helper to ensure base roles exist."""
    roles_res = await session.execute(select(Role))
    if not roles_res.scalars().first():
        staff_role = Role(role_name=RoleEnum.STAFF.value)
        participant_role = Role(role_name=RoleEnum.PARTICIPANT.value)
        admin_role = Role(role_name=RoleEnum.ADMIN.value)
        manager_role = Role(role_name=RoleEnum.EVENT_MANAGER.value)
        session.add_all([admin_role, manager_role, staff_role, participant_role])
        await session.commit()


@pytest.mark.asyncio
async def test_rag_engine_with_pgvector_and_pii():
    await init_db()
    async with AsyncSessionLocal() as session:
        await ensure_base_roles(session)
        suffix = uuid.uuid4().hex[:6]

        # 1. Setup Category & Event
        cat = EventCategory(name="Hội thảo Quốc Tế", code=f"INTL_CONF_{suffix}")
        session.add(cat)
        await session.flush()

        event = Event(
            title=f"AI Summit Vietnam 2026 {suffix}",
            description="Hội nghị thượng đỉnh về Trí tuệ nhân tạo.",
            category_id=cat.id,
            location="Trung tâm GEM Center, TP.HCM",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            status=EventStatusEnum.PUBLISHED.value
        )
        session.add(event)
        await session.flush()

        # 2. Add KnowledgeBase item with 768-dim embedding
        sample_embedding = await gemini_service.generate_embedding("Bãi đỗ xe ô tô tại tầng hầm B2 và B3 của GEM Center.")
        kb_item = KnowledgeBase(
            event_id=event.id,
            title="Chỉ dẫn đỗ xe và di chuyển",
            content="Khách đi ô tô gửi tại hầm B2-B3, xe máy gửi tại sảnh sau. Miễn phí gửi xe cho khách có vé VIP.",
            embedding=sample_embedding
        )
        session.add(kb_item)
        await session.commit()

        # 3. Test RAG Engine with inquiry containing PII
        raw_question = "SĐT của tôi là 0918889999, email an@gmail.com. Cho tôi hỏi bãi đỗ xe ô tô ở tầng nào?"
        rag_result = await rag_engine.generate_rag_response(
            db=session,
            event_id=event.id,
            raw_question=raw_question
        )

        assert rag_result.has_pii is True
        assert "0918889999" not in rag_result.masked_question
        assert "an@gmail.com" not in rag_result.masked_question
        assert "[MASKED_PHONE]" in rag_result.masked_question
        assert "[MASKED_EMAIL]" in rag_result.masked_question
        assert rag_result.ai_category == "LOGISTICS"
        assert len(rag_result.contexts) > 0
        assert rag_result.contexts[0].title == "Chỉ dẫn đỗ xe và di chuyển"
        assert rag_result.draft_reply != ""
        assert rag_result.latency_ms >= 0


@pytest.mark.asyncio
async def test_hitl_inquiry_api_lifecycle():
    """Test Participant submits inquiry -> Staff reviews with ACCEPT / EDIT / REJECT and logs to ai_logs."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Seed test event and users
        async with AsyncSessionLocal() as session:
            await ensure_base_roles(session)

            staff_role_stmt = select(Role).where(Role.role_name == RoleEnum.STAFF.value)
            staff_role = (await session.execute(staff_role_stmt)).scalar_one()

            part_role_stmt = select(Role).where(Role.role_name == RoleEnum.PARTICIPANT.value)
            part_role = (await session.execute(part_role_stmt)).scalar_one()

            # Staff & Participant
            unique_suffix = uuid.uuid4().hex[:6]
            staff = User(
                role_id=staff_role.id,
                full_name="Staff Duyệt Viên",
                email=f"staff.{unique_suffix}@eventhub.ai",
                hashed_password="pw",
                phone_number="0901234567"
            )
            part = User(
                role_id=part_role.id,
                full_name="Khách Hỏi Đáp",
                email=f"khach.{unique_suffix}@eventhub.ai",
                hashed_password="pw",
                phone_number="0907654321"
            )
            session.add_all([staff, part])
            await session.flush()

            cat = EventCategory(name="TechFest 2026", code=f"TECHFEST_{unique_suffix}")
            session.add(cat)
            await session.flush()

            event = Event(
                title=f"Triển Lãm Công Nghệ {unique_suffix}",
                description="Demo sản phẩm",
                category_id=cat.id,
                location="SECC Quận 7",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc),
                status=EventStatusEnum.PUBLISHED.value
            )
            session.add(event)
            await session.commit()

            staff_id = staff.id
            participant_id = part.id
            event_id = event.id

        # 1. Participant submits inquiry
        inquiry_payload = {
            "event_id": event_id,
            "participant_id": participant_id,
            "question": "Sự kiện có phát WiFi miễn phí không? SĐT tôi 0987654321"
        }
        res = await client.post("/api/v1/inquiries", json=inquiry_payload)
        assert res.status_code == 201
        inquiry_data = res.json()
        inquiry_id = inquiry_data["id"]
        assert inquiry_data["status"] == InquiryStatusEnum.AI_SUGGESTED.value
        assert len(inquiry_data["replies"]) == 1
        assert inquiry_data["replies"][0]["is_ai_generated"] is True

        # 2. Staff gets inquiry list (pending review)
        list_res = await client.get(f"/api/v1/inquiries?event_id={event_id}&status=AI_SUGGESTED")
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(it["id"] == inquiry_id for it in items)

        # 3. Staff reviews and EDITS the reply
        review_payload = {
            "staff_id": staff_id,
            "action": "EDIT",
            "edited_content": "Chào bạn, sự kiện có WiFi miễn phí tên 'EventHub_Free', mật khẩu là 'EventHub2026'.",
            "note": "Đã bổ sung thông tin pass wifi chính thức."
        }
        review_res = await client.post(f"/api/v1/inquiries/{inquiry_id}/review", json=review_payload)
        assert review_res.status_code == 200
        review_data = review_res.json()
        assert review_data["status"] == InquiryStatusEnum.APPROVED.value
        assert review_data["staff_action"] == "EDIT"
        assert "EventHub2026" in review_data["final_reply"]["content"]
        assert review_data["final_reply"]["edited_by_staff"] is True

        # 4. Verify that ai_logs recorded this Staff review action
        async with AsyncSessionLocal() as session:
            log_stmt = (
                select(AILog)
                .where(AILog.task_type == "HITL_REVIEW")
                .where(AILog.staff_action == "EDIT")
                .order_by(AILog.id.desc())
            )
            log_res = await session.execute(log_stmt)
            latest_log = log_res.scalars().first()
            assert latest_log is not None
            assert latest_log.staff_action == "EDIT"
            assert latest_log.task_type == "HITL_REVIEW"
