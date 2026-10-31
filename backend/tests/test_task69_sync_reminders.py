import pytest
import sys
import uuid
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

@pytest.mark.asyncio
async def test_task69_registration_guard_and_reminders():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch available events
        res_events = await client.get("/api/v1/events")
        assert res_events.status_code == 200
        events = res_events.json()
        assert len(events) > 0
        target_event = events[0]
        event_id = target_event["id"]
        initial_count = target_event.get("registered_count", 0)

        # 2. Register for event
        test_email = f"task69_user_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "event_id": event_id,
            "full_name": "Test Attendee Task69",
            "email": test_email,
            "ticket_type": "Vé Tiêu Chuẩn (Standard)",
        }
        res_reg = await client.post("/api/v1/registrations/register", json=reg_payload)
        assert res_reg.status_code == 201
        reg_data = res_reg.json()
        reg_id = reg_data["id"]
        assert reg_data["event_id"] == event_id
        assert "qr_code_token" in reg_data

        # 3. Registration Guard: Attempt to register again with same user/email -> MUST BE REJECTED WITH 400
        res_dup = await client.post("/api/v1/registrations/register", json=reg_payload)
        assert res_dup.status_code == 400
        dup_err = res_dup.json()
        assert "đã đăng ký" in dup_err["detail"].lower()

        # 4. Check my-registrations endpoint
        res_my_regs = await client.get(f"/api/v1/registrations/my-registrations?email={test_email}")
        assert res_my_regs.status_code == 200
        my_regs = res_my_regs.json()
        assert len(my_regs) >= 1
        assert any(r["id"] == reg_id for r in my_regs)

        # 5. Trigger reminders endpoint
        res_remind = await client.post("/api/v1/notifications/trigger-reminders")
        assert res_remind.status_code == 200
        remind_data = res_remind.json()
        assert remind_data.get("success") is True

        # 6. Cancel registration: must release capacity and return success
        res_cancel = await client.delete(f"/api/v1/registrations/{reg_id}")
        assert res_cancel.status_code == 200
        cancel_data = res_cancel.json()
        assert cancel_data.get("success") is True
        assert "hoàn trả" in cancel_data.get("message", "").lower() or "thành công" in cancel_data.get("message", "").lower()
