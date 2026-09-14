import asyncio
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime, timezone
import pytest
from sqlalchemy import text, select
from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal, init_db
from app.models.role import Role, RoleEnum
from app.models.user import User
from app.models.category import EventCategory
from app.models.event import Event, EventStatusEnum
from app.models.registration import Registration
from app.models.inquiry import EventInquiry, InquiryReply, InquiryStatusEnum
from app.models.knowledge import KnowledgeBase
from app.models.ai_log import AILog


@pytest.mark.asyncio
async def test_full_database_lifecycle():
    print(f"[*] Testing connection to: {settings.async_database_url}")
    
    # 1. Initialize DB (Extension + Tables)
    print("[1/5] Initializing database and extensions (pgvector)...")
    await init_db()
    print("      -> DB schema & extensions initialized successfully.")

    # 2. Open Async Session
    async with AsyncSessionLocal() as session:
        print("[2/5] Inserting test roles and category...")
        suffix = uuid.uuid4().hex[:6]
        
        # Check or add roles
        roles_res = await session.execute(select(Role))
        if not roles_res.scalars().first():
            admin_role = Role(role_name=RoleEnum.ADMIN.value)
            manager_role = Role(role_name=RoleEnum.EVENT_MANAGER.value)
            staff_role = Role(role_name=RoleEnum.STAFF.value)
            participant_role = Role(role_name=RoleEnum.PARTICIPANT.value)
            session.add_all([admin_role, manager_role, staff_role, participant_role])
            await session.flush()
        
        staff_role = (await session.execute(select(Role).where(Role.role_name == RoleEnum.STAFF.value))).scalar_one()
        participant_role = (await session.execute(select(Role).where(Role.role_name == RoleEnum.PARTICIPANT.value))).scalar_one()

        # Category
        category = EventCategory(name="Công nghệ & AI", code=f"TECH_AI_{suffix}")
        session.add(category)
        await session.flush()

        print("[3/5] Inserting test users and event...")
        # Users
        staff_user = User(
            role_id=staff_role.id,
            full_name="Nguyễn Văn Staff",
            email=f"staff.{suffix}@eventhub.ai",
            hashed_password="hashed_pw_staff",
            phone_number="0987654321"
        )
        participant_user = User(
            role_id=participant_role.id,
            full_name="Trần Thị Khách",
            email=f"participant.{suffix}@gmail.com",
            hashed_password="hashed_pw_user",
            phone_number="0912345678"
        )
        session.add_all([staff_user, participant_user])
        await session.flush()

        # Event
        event = Event(
            title="Hội thảo EventHub AI 2026",
            description="Ứng dụng AI Concierge và HITL trong quản trị sự kiện.",
            category_id=category.id,
            location="Trung tâm Hội nghị Quốc Gia",
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc),
            status=EventStatusEnum.PUBLISHED.value
        )
        session.add(event)
        await session.flush()

        # Registration
        reg = Registration(
            event_id=event.id,
            participant_id=participant_user.id,
            qr_code_token=f"QR-TOKEN-{suffix}",
            is_checked_in=False
        )
        session.add(reg)

        # Inquiry & Reply
        inquiry = EventInquiry(
            event_id=event.id,
            participant_id=participant_user.id,
            assigned_staff_id=staff_user.id,
            question="Địa điểm đỗ xe ô tô của sự kiện ở đâu?",
            ai_category="LOGISTICS",
            status=InquiryStatusEnum.AI_SUGGESTED.value
        )
        session.add(inquiry)
        await session.flush()

        reply = InquiryReply(
            inquiry_id=inquiry.id,
            sender_id=staff_user.id,
            content="Bãi đỗ xe ô tô nằm tại cổng số 2 của trung tâm.",
            is_ai_generated=True,
            edited_by_staff=True
        )
        session.add(reply)

        print("[4/5] Testing KnowledgeBase with 768-dimensional vector embedding...")
        sample_vector = [0.01 * (i % 50) for i in range(768)]
        assert len(sample_vector) == 768

        knowledge = KnowledgeBase(
            event_id=event.id,
            title="Hướng dẫn gửi xe và check-in",
            content="Cổng số 2 dành cho ô tô, cổng số 1 cho xe máy. Check-in quét mã QR tại sảnh A.",
            embedding=sample_vector
        )
        session.add(knowledge)

        # AI Log
        ai_log = AILog(
            task_type="RAG_QUERY",
            prompt_tokens=150,
            completion_tokens=45,
            latency_ms=320.5,
            staff_action="ACCEPT"
        )
        session.add(ai_log)

        await session.commit()
        print("      -> All records committed to database.")

        print("[5/5] Testing Vector distance query from knowledge_base...")
        query_vector = [0.01 * (i % 50) for i in range(768)]
        stmt = (
            select(
                KnowledgeBase.id,
                KnowledgeBase.title,
                KnowledgeBase.embedding.cosine_distance(query_vector).label("distance")
            )
            .where(KnowledgeBase.id == knowledge.id)
            .order_by("distance")
            .limit(1)
        )
        result = await session.execute(stmt)
        row = result.first()
        print(f"      -> Retrieved KnowledgeBase item: ID={row[0]}, Title='{row[1]}', Cosine Distance={row[2]:.6f}")

    print("\nSUCCESS: All models, relations, pgvector(768) and queries verified without errors!")


if __name__ == "__main__":
    asyncio.run(test_full_database_lifecycle())
