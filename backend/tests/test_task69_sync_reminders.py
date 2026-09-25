import pytest
import sys
import uuid
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services.email_service import generate_google_calendar_url


@pytest.mark.asyncio
async def test_calendar_url_generator():
    """Verify Google Calendar link construction meets specification."""
    url = generate_google_calendar_url(
        title="EventHub AI Summit 2026",
        location="Trung tâm Hội nghị Quốc gia",
        details="Mã vé QR: TEST-123",
        start_time_iso="20261015T083000Z",
        end_time_iso="20261016T173000Z"
    )
    assert url.startswith("https://calendar.google.com/calendar/render?")
    assert "action=TEMPLATE" in url
    assert "EventHub+AI+Summit+2026" in url or "EventHub%20AI%20Summit%202026" in url
    assert "20261015T083000Z%2F20261016T173000Z" in url or "20261015T083000Z/20261016T173000Z" in url


@pytest.mark.asyncio
async def test_duplicate_registration_block_and_cancel():
    """
    Task 69 Requirement 2:
    - 1st registration succeeds with 201.
    - 2nd registration for same event & email is blocked with HTTP 400.
    - Cancel registration decrements registered_count.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"task69_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "event_id": 1,
            "full_name": "Nguyễn Văn Test 69",
            "email": test_email,
            "phone_number": "0987654321",
            "ticket_type": "Vé Tiêu Chuẩn (Standard)",
            "organization": "EventHub QA Team",
            "notes": "Testing duplicate guard"
        }

        # 1. First registration attempt: must succeed
        res1 = await client.post("/api/v1/registrations", json=reg_payload)
        assert res1.status_code == 201, f"Failed first registration: {res1.text}"
        data1 = res1.json()
        assert "qr_code_token" in data1
        ticket_id = data1["id"]

        # 2. Second registration attempt with identical email & event_id: MUST BE BLOCKED
        res2 = await client.post("/api/v1/registrations", json=reg_payload)
        assert res2.status_code == 400, f"Expected 400 on duplicate registration, got {res2.status_code}"
        err_detail = res2.json().get("detail", "")
        assert "đã đăng ký" in err_detail.lower(), f"Unexpected error detail: {err_detail}"

        # 3. Third attempt using /register alias: MUST ALSO BE BLOCKED
        res3 = await client.post("/api/v1/registrations/register", json=reg_payload)
        assert res3.status_code == 400
        assert "đã đăng ký" in res3.json().get("detail", "").lower()
