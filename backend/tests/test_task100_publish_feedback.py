import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
from sqlalchemy import select, delete

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.event import Event
from app.models.category import EventCategory
from app.models.user import User
from app.models.registration import Registration
from app.models.feedback import Feedback


@pytest.mark.asyncio
async def test_task100_publish_and_interactive_feedback():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with AsyncSessionLocal() as db:
            # 0. Ensure category exists
            stmt_cat = select(EventCategory)
            res_cat = await db.execute(stmt_cat)
            cat = res_cat.scalars().first()
            if not cat:
                cat = EventCategory(name="Công Nghệ & AI", code="TECH_AI")
                db.add(cat)
                await db.commit()
                await db.refresh(cat)
            cat_id = cat.id

            # 1. Setup test events: One UPCOMING and one COMPLETED
            upcoming_event = Event(
                title="Sự Kiện Chuẩn Bị Diễn Ra (Upcoming Summit)",
                category_id=cat_id,
                status="UPCOMING",
                location="Hội Trường A",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc),
            )
            completed_event = Event(
                title="Sự Kiện Đã Hoàn Tất (Completed Expo)",
                category_id=cat_id,
                status="COMPLETED",
                location="Hội Trường B",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc),
            )
            db.add_all([upcoming_event, completed_event])
            await db.commit()
            await db.refresh(upcoming_event)
            await db.refresh(completed_event)

            # 2. Setup test registrations
            stmt_user = select(User).where(User.is_active == True).limit(1)
            res_user = await db.execute(stmt_user)
            existing_user = res_user.scalars().first()
            user_pid = existing_user.id if existing_user else 1

            reg_checked_in = Registration(
                event_id=completed_event.id,
                participant_id=user_pid,
                full_name="Nguyễn Văn Tham Dự",
                email="attending_user@example.com",
                qr_code_token="QR-TEST-CHK-001",
                is_checked_in=True,
                ticket_type="VIP-001",
            )
            reg_no_show = Registration(
                event_id=completed_event.id,
                participant_id=user_pid,
                full_name="Trần Thị Vắng Mặt",
                email="noshow_user@example.com",
                qr_code_token="QR-TEST-NOSHW-002",
                is_checked_in=False,
                ticket_type="REG-002",
            )
            db.add_all([reg_checked_in, reg_no_show])
            await db.commit()

        try:
            # Test A: VALIDATION GUARD BLOCKS RECAP FOR UPCOMING EVENT (Task 100)
            res_guard = await client.post(
                "/api/v1/pr-studio/dispatch-publish",
                json={
                    "event_id": upcoming_event.id,
                    "event_name": upcoming_event.title,
                    "campaign_type": "RECAP_THANKYOU",
                    "target_audience": "CHECKED_IN_ONLY",
                    "title": "Thư Tri Ân & Khảo Sát",
                    "channels": ["email"],
                },
            )
            assert res_guard.status_code == 400
            assert "Sự kiện chưa kết thúc" in res_guard.json()["detail"]

            # Test B: SUCCESSFUL RECAP DISPATCH FOR COMPLETED EVENT (CHECKED_IN_ONLY)
            res_recap = await client.post(
                "/api/v1/pr-studio/dispatch-publish",
                json={
                    "event_id": completed_event.id,
                    "event_name": completed_event.title,
                    "campaign_type": "RECAP_THANKYOU",
                    "target_audience": "CHECKED_IN_ONLY",
                    "title": "Thư Tri Ân & Đánh Giá Sự Kiện",
                    "channels": ["email"],
                },
            )
            assert res_recap.status_code == 200
            data_recap = res_recap.json()
            assert data_recap["success"] is True
            assert data_recap["target_count"] >= 1  # Found checked-in attendee

            # Test C: NO-SHOW RECAP DISPATCH (NO_SHOW_ONLY)
            res_noshow = await client.post(
                "/api/v1/pr-studio/dispatch-publish",
                json={
                    "event_id": completed_event.id,
                    "event_name": completed_event.title,
                    "campaign_type": "RECAP_THANKYOU",
                    "target_audience": "NO_SHOW_ONLY",
                    "title": "Rất tiếc bạn đã bỏ lỡ sự kiện",
                    "channels": ["email"],
                },
            )
            assert res_noshow.status_code == 200
            data_noshow = res_noshow.json()
            assert data_noshow["success"] is True
            assert data_noshow["target_count"] >= 1

            # Test D: INTERACTIVE 1-CLICK FEEDBACK QUICK RATE (GET /api/v1/feedback/quick-rate)
            res_rate = await client.get(
                f"/api/v1/feedback/quick-rate?eventId={completed_event.id}&email=attending_user@example.com&stars=5&format=json",
                headers={"Accept": "application/json"},
            )
            assert res_rate.status_code == 200
            rate_data = res_rate.json()
            assert rate_data["success"] is True
            assert rate_data["rating"] == 5
            feedback_id = rate_data["feedback_id"]

            # Test E: GET HTML LANDING PAGE FOR 1-CLICK RATING
            res_html = await client.get(
                f"/api/v1/feedback/quick-rate?eventId={completed_event.id}&email=attending_user@example.com&stars=4"
            )
            assert res_html.status_code == 200
            assert "Khảo Sát Hài Lòng" in res_html.text
            assert "4 / 5 Sao" in res_html.text

            # Test F: POST QUALITATIVE COMMENT (/api/v1/feedback/quick-rate/comment)
            res_comment = await client.post(
                "/api/v1/feedback/quick-rate/comment",
                data={"feedback_id": feedback_id, "comment": "Sự kiện rất tuyệt vời và chuyên nghiệp!"},
                headers={"Accept": "application/json"},
            )
            assert res_comment.status_code == 200
            comment_data = res_comment.json()
            assert comment_data["success"] is True
            assert comment_data["sentiment"] == "positive"

            # Verify in DB
            async with AsyncSessionLocal() as db:
                fb_stmt = select(Feedback).where(Feedback.id == feedback_id)
                fb_res = await db.execute(fb_stmt)
                db_fb = fb_res.scalars().first()
                assert db_fb is not None
                assert db_fb.comment == "Sự kiện rất tuyệt vời và chuyên nghiệp!"
                assert db_fb.rating == 4

        finally:
            # Cleanup test data
            async with AsyncSessionLocal() as db:
                await db.execute(delete(Feedback).where(Feedback.event_id.in_([upcoming_event.id, completed_event.id])))
                await db.execute(delete(Registration).where(Registration.event_id.in_([upcoming_event.id, completed_event.id])))
                await db.execute(delete(Event).where(Event.id.in_([upcoming_event.id, completed_event.id])))
                await db.commit()
