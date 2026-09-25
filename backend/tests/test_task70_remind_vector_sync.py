import pytest
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.event import Event
from app.models.user import User
from app.models.reminder import UserReminder
from app.models.notification import Notification
from sqlalchemy import select, delete


@pytest.mark.asyncio
async def test_task70_remind_and_vector_sync():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        from datetime import datetime, timezone, timedelta
        # 1. Setup an event in DB
        async with AsyncSessionLocal() as session:
            now = datetime.now(timezone.utc)
            test_ev = Event(
                title="Sự kiện Kiểm thử Đặt Lịch Task 70",
                description="Mô tả sự kiện kiểm thử",
                category_id=1,
                location="Trung tâm Hội nghị Quốc gia",
                start_time=now + timedelta(days=2),
                end_time=now + timedelta(days=2, hours=4),
                status="PUBLISHED",
                capacity=200,
                registered_count=0,
            )
            session.add(test_ev)
            await session.commit()
            await session.refresh(test_ev)
            event_id = test_ev.id

        try:
            from app.core.security import create_access_token
            auth_token = create_access_token(data={"sub": "attendee@eventhub.ai"})
            headers = {"Authorization": f"Bearer {auth_token}"}

            # 2. Test POST /api/v1/events/{id}/remind
            resp_remind = await client.post(f"/api/v1/events/{event_id}/remind", headers=headers)
            assert resp_remind.status_code == 200, resp_remind.text
            data_remind = resp_remind.json()
            assert data_remind["status"] == "success"
            assert data_remind["is_reminded"] is True
            assert "ticket_token" in data_remind

            # Verify in DB that UserReminder was created
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(UserReminder).where(UserReminder.event_id == event_id)
                )
                reminders = res.scalars().all()
                assert len(reminders) >= 1

                # Verify notification created
                notif_res = await session.execute(
                    select(Notification).where(Notification.title.like("%đặt lịch nhắc%"))
                )
                notifs = notif_res.scalars().all()
                assert len(notifs) >= 1

            # 3. Test GET /api/v1/events/{id} - is_reminded should be true for attendee
            resp_get = await client.get(f"/api/v1/events/{event_id}", headers=headers)
            assert resp_get.status_code == 200
            assert resp_get.json()["is_reminded"] is True

            # 4. Test DELETE /api/v1/events/{id}/remind
            resp_cancel = await client.delete(f"/api/v1/events/{event_id}/remind", headers=headers)
            assert resp_cancel.status_code == 200
            assert resp_cancel.json()["is_reminded"] is False

            # Verify GET now returns is_reminded: False
            resp_get_after = await client.get(f"/api/v1/events/{event_id}", headers=headers)
            assert resp_get_after.status_code == 200
            assert resp_get_after.json()["is_reminded"] is False

            # 5. Test PUT /api/v1/events/{id} vector sync
            resp_update = await client.put(
                f"/api/v1/events/{event_id}",
                json={"title": "Sự kiện Đã Cập Nhật Vector Sync Task 70"}
            )
            assert resp_update.status_code == 200
            assert resp_update.json()["title"] == "Sự kiện Đã Cập Nhật Vector Sync Task 70"

            # 6. Test DELETE /api/v1/events/{id} vector sync & cascade
            resp_del = await client.delete(f"/api/v1/events/{event_id}")
            assert resp_del.status_code == 200
            assert resp_del.json()["status"] == "success"

        finally:
            # Cleanup
            async with AsyncSessionLocal() as session:
                await session.execute(delete(UserReminder).where(UserReminder.event_id == event_id))
                await session.execute(delete(Event).where(Event.id == event_id))
                await session.commit()
