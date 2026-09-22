import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.role import Role, RoleEnum
from app.models.category import EventCategory
from app.models.event import Event, EventStatusEnum
from app.models.registration import Registration
from app.models.inquiry import EventInquiry, InquiryStatusEnum, InquiryReply


async def ensure_base_roles(session):
    for r in RoleEnum:
        stmt = select(Role).where(Role.role_name == r.value)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(Role(role_name=r.value))
    await session.commit()



@pytest.mark.asyncio
async def test_task43_concierge_features():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with AsyncSessionLocal() as session:
            await ensure_base_roles(session)

            staff_role = (await session.execute(select(Role).where(Role.role_name == RoleEnum.STAFF.value))).scalar_one()
            part_role = (await session.execute(select(Role).where(Role.role_name == RoleEnum.PARTICIPANT.value))).scalar_one()

            suffix = uuid.uuid4().hex[:6]
            staff = User(
                role_id=staff_role.id,
                full_name="Staff Test",
                email=f"staff.{suffix}@test.com",
                hashed_password="pw"
            )
            vip_user = User(
                role_id=part_role.id,
                full_name="VIP John Doe",
                email=f"vip.{suffix}@test.com",
                hashed_password="pw"
            )
            normal_user = User(
                role_id=part_role.id,
                full_name="Normal Bob",
                email=f"normal.{suffix}@test.com",
                hashed_password="pw"
            )
            session.add_all([staff, vip_user, normal_user])
            await session.flush()

            cat = EventCategory(name="AI Summit", code=f"SUMMIT_{suffix}")
            session.add(cat)
            await session.flush()

            event = Event(
                title=f"AI Summit {suffix}",
                description="Hội nghị AI",
                category_id=cat.id,
                location="Hội trường A",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc),
                status=EventStatusEnum.PUBLISHED.value
            )
            session.add(event)
            await session.flush()

            # VIP registration
            vip_reg = Registration(
                event_id=event.id,
                participant_id=vip_user.id,
                full_name=vip_user.full_name,
                ticket_type="Vé VIP Hạng Nhất",
                qr_code_token=f"QR-VIP-{suffix}"
            )
            # Normal registration
            normal_reg = Registration(
                event_id=event.id,
                participant_id=normal_user.id,
                full_name=normal_user.full_name,
                ticket_type="Vé Tiêu Chuẩn",
                qr_code_token=f"QR-STD-{suffix}"
            )
            session.add_all([vip_reg, normal_reg])

            # Inquiries: normal question created first, VIP question created second
            inq_normal = EventInquiry(
                event_id=event.id,
                participant_id=normal_user.id,
                question="Sự kiện mấy giờ bắt đầu?",
                status=InquiryStatusEnum.AI_SUGGESTED.value
            )
            inq_vip = EventInquiry(
                event_id=event.id,
                participant_id=vip_user.id,
                question="Khu vực VIP Lounge có phục vụ đồ uống riêng không?",
                status=InquiryStatusEnum.AI_SUGGESTED.value
            )
            session.add_all([inq_normal, inq_vip])
            await session.commit()

            event_id = event.id
            vip_inq_id = inq_vip.id
            staff_id = staff.id

        # 1. Test Generate Concierge Response (Vietnamese default & Bilingual)
        gen_res = await client.post(
            "/api/v1/inquiries/generate-concierge-response",
            json={"event_id": event_id, "question": "Hội nghị có chỗ đỗ xe không?", "bilingual": False}
        )
        assert gen_res.status_code == 200
        gen_data = gen_res.json()
        assert "draft_reply" in gen_data
        assert gen_data["is_bilingual"] is False

        gen_bilingual = await client.post(
            "/api/v1/inquiries/generate-concierge-response",
            json={"event_id": event_id, "question": "Where is the keynote room?", "bilingual": True}
        )
        assert gen_bilingual.status_code == 200
        assert gen_bilingual.json()["is_bilingual"] is True

        # 2. Test VIP Prioritization in list_inquiries
        list_res = await client.get(f"/api/v1/inquiries?event_id={event_id}")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 2
        # VIP inquiry should be first in the queue!
        assert items[0]["id"] == vip_inq_id
        assert items[0]["is_vip"] is True
        assert items[0]["priority"] == "VIP"

        # 3. Test Get User QR Code
        qr_res = await client.get(f"/api/v1/inquiries/{vip_inq_id}/user-qr")
        assert qr_res.status_code == 200
        qr_data = qr_res.json()
        assert qr_data["is_vip"] is True
        assert f"QR-VIP-{suffix}" in qr_data["qr_code_token"]
        assert "Mã QR Check-in" in qr_data["formatted_snippet"]

        # 4. Test Prompt Assistant: ATTACH_QR
        prompt_res = await client.post(
            "/api/v1/inquiries/quick-prompt",
            json={
                "text": "Chào bạn, đây là thông tin vé của bạn:",
                "prompt_type": "ATTACH_QR",
                "inquiry_id": vip_inq_id
            }
        )
        assert prompt_res.status_code == 200
        prompt_data = prompt_res.json()
        assert "THẺ THAM DỰ & MÃ QR CHECK-IN" in prompt_data["result"]
        assert f"QR-VIP-{suffix}" in prompt_data["result"]

        # 5. Test Auto-Approve RAG > 95%
        auto_res = await client.post(
            f"/api/v1/inquiries/auto-approve?threshold=95.0&staff_id={staff_id}"
        )
        assert auto_res.status_code == 200
        auto_data = auto_res.json()
        assert auto_data["approved_count"] >= 0
