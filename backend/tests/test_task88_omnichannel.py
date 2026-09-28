import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.sms_service import normalize_phone_number, send_sms
from app.services.zalo_service import send_zalo_message
from app.services.omnichannel_service import dispatch_omnichannel_message, broadcast_campaign


def test_phone_normalization():
    """Verify Vietnamese and international phone normalization to E.164."""
    assert normalize_phone_number("0912345678") == "84912345678"
    assert normalize_phone_number("0912 345 678") == "84912345678"
    assert normalize_phone_number("+84912345678") == "84912345678"
    assert normalize_phone_number("84912345678") == "84912345678"


@pytest.mark.asyncio
async def test_sms_service_fallback():
    """Verify SMS dispatch completes successfully in sandbox/simulation mode."""
    res = await send_sms(to_phone="0912345678", message="Test SMS message from EventHub AI")
    assert res["success"] is True
    assert "84912345678" in res["phone"]


@pytest.mark.asyncio
async def test_zalo_service_fallback():
    """Verify Zalo ZNS dispatch completes successfully in sandbox/simulation mode."""
    res = await send_zalo_message(
        to_phone="0912345678",
        message="Test Zalo message from EventHub AI",
        event_title="AI Summit Vietnam 2026",
    )
    assert res["success"] is True
    assert "84912345678" in res["phone"]


@pytest.mark.asyncio
async def test_omnichannel_concurrent_dispatch():
    """Verify parallel concurrent dispatch across all channels."""
    results = await dispatch_omnichannel_message(
        channels=["email", "sms", "zalo"],
        email="test_user@example.com",
        phone="0912345678",
        subject="[EventHub AI] Thư Mời Tham Dự Sự Kiện",
        content="Nội dung truyền thông đa kênh thử nghiệm",
        event_title="Tech Innovation Expo 2026",
    )
    assert "sms" in results
    assert results["sms"]["success"] is True
    assert "zalo" in results
    assert results["zalo"]["success"] is True
    assert "email" in results
    assert results["email"]["success"] is True


@pytest.mark.asyncio
async def test_broadcast_campaign():
    """Verify broadcast_campaign function processes list of recipients."""
    recipients = [
        {"email": "attendee1@example.com", "phone": "0901111111", "name": "Nguyễn Văn A"},
        {"email": "attendee2@example.com", "phone": "0902222222", "name": "Trần Thị B"},
    ]
    res = await broadcast_campaign(
        channels=["sms", "zalo"],
        recipients=recipients,
        subject="Thông báo sự kiện",
        content="Nội dung thông báo",
        event_title="AI Summit 2026",
    )
    assert res["total"] == 2
    assert res["success"] == 2


@pytest.mark.asyncio
async def test_api_dispatch_test_endpoints():
    """Verify /api/v1/ai/dispatch-test for Email, SMS, and Zalo."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Email Test
        res_email = await client.post(
            "/api/v1/ai/dispatch-test",
            json={
                "channel": "email",
                "recipient": "dev@eventhub.ai",
                "subject": "Thử nghiệm PR Email",
                "content": "Nội dung PR Email",
                "event_name": "AI Summit 2026",
            },
        )
        assert res_email.status_code == 200
        data_email = res_email.json()
        assert data_email["success"] is True

        # 2. SMS Test
        res_sms = await client.post(
            "/api/v1/ai/dispatch-test",
            json={
                "channel": "sms",
                "recipient": "0987654321",
                "content": "Thử nghiệm tin nhắn SMS",
                "event_name": "AI Summit 2026",
            },
        )
        assert res_sms.status_code == 200
        data_sms = res_sms.json()
        assert data_sms["success"] is True
        assert data_sms["channel"] == "sms"

        # 3. Zalo Test
        res_zalo = await client.post(
            "/api/v1/ai/dispatch-test",
            json={
                "channel": "zalo",
                "recipient": "0987654321",
                "content": "Thử nghiệm tin nhắn Zalo ZNS",
                "event_name": "AI Summit 2026",
            },
        )
        assert res_zalo.status_code == 200
        data_zalo = res_zalo.json()
        assert data_zalo["success"] is True
        assert data_zalo["channel"] == "zalo"


@pytest.mark.asyncio
async def test_api_dispatch_publish_endpoint():
    """Verify /api/v1/ai/dispatch-publish creates campaign notification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ai/dispatch-publish",
            json={
                "event_name": "Vietnam AI Summit 2026",
                "target_audience": "ALL_REGISTERED",
                "schedule_type": "IMMEDIATE",
                "channels": ["email", "zalo_sms"],
                "title": "Ra mắt phiên bản EventHub AI 2026",
                "content_summary": "Tổng hợp các điểm mới và chương trình nghị sự đặc biệt",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["status"] == "SENT"
        assert "CMP-" in data["campaign_id"]


@pytest.mark.asyncio
async def test_google_auth_registration_and_login():
    """Verify Google OAuth endpoint registers new user and logs in existing user."""
    import uuid
    random_google_email = f"google_user_{uuid.uuid4().hex[:6]}@gmail.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. First time Google login -> Auto-registers as PARTICIPANT
        res_register = await client.post(
            "/api/v1/auth/google",
            json={
                "email": random_google_email,
                "full_name": "Google Test Attendee",
                "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c",
            },
        )
        assert res_register.status_code == 200
        reg_data = res_register.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["email"] == random_google_email
        assert reg_data["user"]["role_name"] in ("PARTICIPANT", "ATTENDEE")

        # 2. Subsequent Google login -> Authenticates existing user
        res_login = await client.post(
            "/api/v1/auth/google",
            json={
                "email": random_google_email,
                "full_name": "Google Test Attendee",
            },
        )
        assert res_login.status_code == 200
        login_data = res_login.json()
        assert "access_token" in login_data
        assert login_data["user"]["email"] == random_google_email


@pytest.mark.asyncio
async def test_api_dispatch_publish_to_members_with_email():
    """Verify /api/v1/ai/dispatch-publish targets registered member accounts with email."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ai/dispatch-publish",
            json={
                "event_name": "Cloud & AI Expo 2026",
                "target_audience": "MEMBERS_WITH_EMAIL",
                "schedule_type": "IMMEDIATE",
                "channels": ["email", "zalo_sms"],
                "title": "Bản tin đặc biệt gửi thành viên EventHub AI",
                "content_summary": "Thông báo dành riêng cho tất cả thành viên có liên kết email",
                "content": "Kính gửi quý thành viên, đây là thông báo cập nhật về các sự kiện công nghệ mới nhất.",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["status"] == "SENT"
        assert data["target_count"] >= 1

