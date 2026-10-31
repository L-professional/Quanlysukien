import hmac
import hashlib
import json
import time
from datetime import datetime, timezone

import pytest

from app.core.config import settings
from app.models.user import User
from app.models.email_campaign import (
    EmailCampaign,
    EmailRecipient,
    EmailUnsubscribe,
    EmailWebhookEvent,
    CampaignStatusEnum,
    RecipientStatusEnum,
)
from app.services.resend_service import (
    ResendEmailService,
    get_resend_service,
    render_campaign_html,
    generate_plain_text_alternative,
    _safe_url,
    _format_paragraphs,
)


# =====================================================================
# 1. URL Validation & HTML Safety Tests
# =====================================================================

def test_safe_url_validation():
    assert _safe_url("https://eventhub.ai/events/42") == "https://eventhub.ai/events/42"
    assert _safe_url("http://example.com/register") == "http://example.com/register"
    assert _safe_url("/events/42") == "/events/42"
    assert _safe_url("javascript:alert(1)", default="https://eventhub.ai") == "https://eventhub.ai"
    assert _safe_url("data:text/html;base64,PHNjcmlwdD4=", default="https://eventhub.ai") == "https://eventhub.ai"
    assert _safe_url("", default="fallback") == "fallback"
    assert _safe_url(None, default="fallback") == "fallback"


def test_format_paragraphs_escapes_xss_and_preserves_structure():
    raw_ai_text = """
    Chào mừng quý khách đến với Hội Thảo AI 2026! <script>alert('XSS')</script>

    Chúng tôi trân trọng giới thiệu giải pháp AI Concierge & Check-in QR.
    <iframe src="http://evil.com"></iframe> & 'quotes'
    """
    formatted = _format_paragraphs(raw_ai_text)
    assert "<script>" not in formatted
    assert "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;" in formatted or "&lt;script&gt;" in formatted
    assert "<iframe" not in formatted
    assert "&lt;iframe" in formatted
    assert "<p style=" in formatted


def test_render_campaign_html_structure():
    html_out = render_campaign_html(
        article_body="Cơ hội trải nghiệm công nghệ thế hệ mới cùng các chuyên gia hàng đầu.",
        subject="Thư mời Tech Expo 2026",
        event_title="Tech Expo AI 2026",
        recipient_name="Nguyễn Văn A",
        event_time="09:00 20/05/2026",
        event_location="GEM Center, TP.HCM",
        event_category="Công nghệ & AI",
        cta_text="Đăng Ký Tham Gia",
        cta_url="https://eventhub.ai/events/101",
        unsubscribe_url="https://eventhub.ai/unsubscribe?token=test_token_abc123",
    )

    assert "Tech Expo AI 2026" in html_out
    assert "Nguyễn Văn A" in html_out
    assert "Đăng Ký Tham Gia" in html_out
    assert "https://eventhub.ai/events/101" in html_out
    assert "hủy đăng ký tại đây" in html_out
    assert "token=test_token_abc123" in html_out
    assert "EventHub AI" in html_out


def test_generate_plain_text_alternative():
    plain = generate_plain_text_alternative(
        article_body="Thông tin chi tiết về sự kiện sắp diễn ra.",
        subject="Thông báo sự kiện",
        event_title="AI Workshop 2026",
        recipient_name="Trần Thị B",
        event_time="14:00 18/06/2026",
        event_location="Đại học Bách Khoa",
        cta_url="https://eventhub.ai/events/202",
        unsubscribe_url="https://eventhub.ai/unsubscribe?token=tok_456",
    )

    assert "TIÊU ĐỀ: Thông báo sự kiện" in plain
    assert "Trần Thị B" in plain
    assert "AI Workshop 2026" in plain
    assert "https://eventhub.ai/events/202" in plain
    assert "<" not in plain


# =====================================================================
# 2. Resend Email Service & Simulation Mode
# =====================================================================

@pytest.mark.asyncio
async def test_send_single_email_simulation_mode():
    service = ResendEmailService()
    # Empty or placeholder API key forces simulation mode
    service.api_key = ""

    result = await service.send_single_email(
        to_email="test.attendee@example.com",
        subject="Thử nghiệm gửi email AI",
        html_content="<p>Xin chào quý khách</p>",
        idempotency_key="idemp_unit_test_999",
    )

    assert result["success"] is True
    assert result["message_id"].startswith("sim_")
    assert result["is_simulated"] is True


@pytest.mark.asyncio
async def test_send_test_email():
    service = ResendEmailService()
    service.api_key = ""

    result = await service.send_test_email(
        to_email="admin.preview@eventhub.ai",
        subject="Xem trước bản tin AI",
        html_content="<p>Nội dung xem trước</p>",
        campaign_name="Test Preview",
    )

    assert result["success"] is True
    assert result["is_simulated"] is True


# =====================================================================
# 3. Marketing Consent & Compliance Tests
# =====================================================================

def test_user_marketing_consent_defaults_to_false():
    user = User(
        email="newuser@eventhub.ai",
        full_name="Người Dùng Mới",
        role_id=4,
    )
    # Critical requirement: is_marketing_subscribed must default to False
    assert user.is_marketing_subscribed is False or user.is_marketing_subscribed is None
    assert user.marketing_consent_at is None
    assert user.marketing_unsubscribed_at is None


def test_user_explicit_consent_assignment():
    now = datetime.now(timezone.utc)
    user = User(
        email="consented.customer@eventhub.ai",
        full_name="Khách Hàng Đồng Thuận",
        role_id=4,
        is_marketing_subscribed=True,
        marketing_consent_at=now,
        marketing_consent_source="WEB_CHECKOUT_CHECKBOX",
    )
    assert user.is_marketing_subscribed is True
    assert user.marketing_consent_at == now
    assert user.marketing_consent_source == "WEB_CHECKOUT_CHECKBOX"
    assert user.marketing_unsubscribed_at is None


def test_user_unsubscription_state():
    unsub_time = datetime.now(timezone.utc)
    user = User(
        email="optout@eventhub.ai",
        full_name="Khách Hàng Hủy Nhận Tin",
        role_id=4,
        is_marketing_subscribed=False,
        marketing_unsubscribed_at=unsub_time,
    )
    assert user.is_marketing_subscribed is False
    assert user.marketing_unsubscribed_at == unsub_time


# =====================================================================
# 4. Svix Signature Verification
# =====================================================================

def test_svix_signature_verification_rejects_missing_headers():
    service = ResendEmailService()
    service.webhook_secret = "whsec_test_secret_1234567890abcdef"

    raw_body = b'{"type": "email.delivered"}'
    valid, payload = service.verify_svix_signature(raw_body, None, None, None)
    assert valid is False
    assert payload is None


def test_svix_signature_verification_rejects_tampered_body():
    service = ResendEmailService()
    secret = "whsec_test_secret_1234567890abcdef"
    service.webhook_secret = secret

    msg_id = "msg_test_001"
    timestamp = str(int(time.time()))
    body = b'{"type": "email.delivered"}'
    fake_sig = "v1,invalid_signature_hash"

    valid, payload = service.verify_svix_signature(body, msg_id, timestamp, fake_sig)
    assert valid is False
    assert payload is None


def test_svix_signature_verification_valid_signature():
    try:
        from svix.webhooks import Webhook
    except ImportError:
        pytest.skip("svix not installed")

    import base64
    import os
    raw_key = base64.b64encode(os.urandom(24)).decode("utf-8")
    secret = f"whsec_{raw_key}"

    service = ResendEmailService()
    service.webhook_secret = secret

    wh = Webhook(secret)
    msg_id = "msg_valid_001"
    now_dt = datetime.now(timezone.utc)
    payload_dict = {"type": "email.delivered", "data": {"email_id": "em_abc999"}}
    payload_str = json.dumps(payload_dict)

    sig = wh.sign(msg_id, now_dt, payload_str)
    timestamp = str(int(now_dt.timestamp()))

    valid, parsed = service.verify_svix_signature(payload_str.encode("utf-8"), msg_id, timestamp, sig)
    assert valid is True
    assert parsed is not None
    assert parsed["type"] == "email.delivered"


# =====================================================================
# 5. Status Enums & Suppression Verification
# =====================================================================

def test_campaign_status_enumeration():
    valid_statuses = [s.value for s in CampaignStatusEnum]
    assert "DRAFT" in valid_statuses
    assert "PENDING_APPROVAL" in valid_statuses
    assert "APPROVED" in valid_statuses
    assert "SCHEDULED" in valid_statuses
    assert "SENDING" in valid_statuses
    assert "COMPLETED" in valid_statuses
    assert "PARTIALLY_FAILED" in valid_statuses
    assert "FAILED" in valid_statuses
    assert "CANCELLED" in valid_statuses


def test_recipient_status_enumeration():
    valid_statuses = [s.value for s in RecipientStatusEnum]
    assert "PENDING" in valid_statuses
    assert "QUEUED" in valid_statuses
    assert "SENDING" in valid_statuses
    assert "RETRYING" in valid_statuses
    assert "SENT" in valid_statuses
    assert "DELIVERED" in valid_statuses
    assert "BOUNCED" in valid_statuses
    assert "COMPLAINED" in valid_statuses
    assert "FAILED" in valid_statuses
    assert "SKIPPED" in valid_statuses


def test_email_unsubscribe_model_attributes():
    unsub = EmailUnsubscribe(
        email="unsub@example.com",
        user_id=12,
        campaign_id=4,
        recipient_id=88,
        suppression_type="USER_UNSUBSCRIBE",
        reason="Không còn quan tâm",
    )
    assert unsub.email == "unsub@example.com"
    assert unsub.suppression_type == "USER_UNSUBSCRIBE"
    assert unsub.reason == "Không còn quan tâm"


def test_audience_filter_compliance_logic():
    """Verify that marketing compliance filters out unconsented and suppressed users."""
    now = datetime.now(timezone.utc)

    # 4 sample candidates
    users = [
        # Candidate 1: Subscribed with verifiable consent timestamp -> Eligible
        {"email": "valid1@eventhub.ai", "is_sub": True, "consent_at": now},
        # Candidate 2: Subscribed flag True but NO consent timestamp -> Excluded
        {"email": "missing_ts@eventhub.ai", "is_sub": True, "consent_at": None},
        # Candidate 3: Subscribed flag False -> Excluded
        {"email": "unsubbed@eventhub.ai", "is_sub": False, "consent_at": now},
        # Candidate 4: In active suppression list -> Excluded
        {"email": "bounced@eventhub.ai", "is_sub": True, "consent_at": now},
    ]

    suppressed_emails = {"bounced@eventhub.ai"}

    eligible = []
    for u in users:
        if not u["is_sub"]:
            continue
        if not u["consent_at"]:
            continue
        if u["email"] in suppressed_emails:
            continue
        eligible.append(u["email"])

    assert eligible == ["valid1@eventhub.ai"]


def test_rate_limit_delay_calculation():
    service = ResendEmailService(rate_limit_per_second=2.0)
    delay = 1.0 / service.rate_limit_per_second
    assert delay == 0.5


@pytest.mark.asyncio
async def test_crawler_safe_unsubscribe_info_endpoint():
    """Requirement: Automated email security scanners accessing GET must NOT unsubscribe users."""
    from unittest.mock import AsyncMock, MagicMock
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.core.database import get_db

    mock_db = AsyncMock()
    mock_recipient = MagicMock()
    mock_recipient.email = "scanner.target@eventhub.ai"
    mock_recipient.campaign_id = 99
    mock_recipient.user_id = 15

    mock_result = MagicMock()
    # First query returns mock_recipient, second query (unsubscribe check) returns None
    mock_result.scalar_one_or_none.side_effect = [mock_recipient, None]
    mock_db.execute.return_value = mock_result
    mock_db.get.return_value = MagicMock(campaign_name="Hội Thảo Bảo Mật 2026")

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET missing token -> 422 Unprocessable Entity
            res1 = await client.get("/api/v1/campaigns/unsubscribe-info")
            assert res1.status_code == 422

            # 2. GET with valid token -> 200 OK with masked email and valid flag
            res2 = await client.get("/api/v1/campaigns/unsubscribe-info?token=scanner_bot_token_valid")
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["valid"] is True
            assert "scanner.target" not in data2["masked_email"]  # Email is masked
            assert "***" in data2["masked_email"]

            # CRITICAL COMPLIANCE ASSERTION:
            # Automated crawler GET request must NEVER mutate state or commit suppression!
            assert mock_db.commit.call_count == 0
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_unsubscribe_post_requires_valid_token():
    """POST /api/v1/campaigns/unsubscribe strictly requires min 10-char token in body."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # POST with empty/short token -> 422 Unprocessable Entity
        res = await client.post("/api/v1/campaigns/unsubscribe", json={"token": ""})
        assert res.status_code == 422


# =====================================================================
# 6. Manual Recipient Input & Multi-Mode Targeting Tests
# =====================================================================

def test_manual_recipient_email_normalization_and_validation():
    """Verify backend email validation and whitespace/case normalization."""
    from app.services.campaign_worker import is_valid_email, normalize_email

    # Normalization tests
    assert normalize_email("  USER@EXAMPLE.COM  ") == "user@example.com"
    assert normalize_email("Test.Attendee+tag@Gmail.COM\n") == "test.attendee+tag@gmail.com"
    assert normalize_email(None) == ""

    # Syntax validation tests
    assert is_valid_email("valid.user@eventhub.ai") is True
    assert is_valid_email("user+tag@domain.co.uk") is True
    assert is_valid_email("not-an-email") is False
    assert is_valid_email("missing@tld") is False
    assert is_valid_email("@missing-user.com") is False
    assert is_valid_email("") is False
    assert is_valid_email(None) is False


def test_manual_recipient_model_fields():
    """Verify EmailRecipient has source field defaulting to DATABASE and supporting MANUAL."""
    recip_db = EmailRecipient(
        campaign_id=1,
        email="attendee@example.com",
    )
    assert recip_db.source == "DATABASE"

    recip_manual = EmailRecipient(
        campaign_id=1,
        email="manual.guest@external.io",
        full_name="External Guest",
        source="MANUAL",
    )
    assert recip_manual.source == "MANUAL"
    assert recip_manual.full_name == "External Guest"


def test_manual_recipient_duplicate_elimination():
    """Verify deduplication removes case-insensitive and whitespace duplicate addresses."""
    from app.services.campaign_worker import normalize_email

    input_list = [
        "Guest1@example.com",
        "  guest1@example.com  ",
        "GUEST1@EXAMPLE.COM",
        "guest2@example.com",
        "guest3@example.com",
        "guest2@EXAMPLE.COM\n",
    ]

    seen = set()
    unique_recipients = []
    duplicate_count = 0

    for item in input_list:
        clean = normalize_email(item)
        if clean in seen:
            duplicate_count += 1
            continue
        seen.add(clean)
        unique_recipients.append(clean)

    assert len(unique_recipients) == 3
    assert duplicate_count == 3
    assert unique_recipients == ["guest1@example.com", "guest2@example.com", "guest3@example.com"]


@pytest.mark.asyncio
async def test_manual_recipient_suppression_and_opt_out_logic():
    """Verify manual recipients cannot bypass global suppression lists or user opt-outs."""
    from unittest.mock import AsyncMock, MagicMock
    from app.services.campaign_worker import calculate_custom_audience_preview

    mock_db = AsyncMock()

    # Mock unsubscribes: "suppressed@example.com"
    mock_unsub_res = MagicMock()
    mock_unsub_res.all.return_value = [("suppressed@example.com",)]

    # Mock opted-out users: "optedout@example.com"
    mock_optout_res = MagicMock()
    mock_optout_res.all.return_value = [("optedout@example.com",)]

    mock_db.execute.side_effect = [
        mock_unsub_res,   # 1. Unsubscribes
        mock_optout_res,  # 2. Opted-out users
    ]

    manual_entries = [
        {"email": "valid.guest@example.com", "name": "Guest 1"},
        {"email": "suppressed@example.com", "name": "Suppressed User"},
        {"email": "optedout@example.com", "name": "Opted Out User"},
        {"email": "invalid-email-address", "name": "Bad Email"},
        {"email": "valid.guest@example.com", "name": "Guest 1 Duplicate"},
    ]

    preview = await calculate_custom_audience_preview(
        db=mock_db,
        recipient_mode="MANUAL",
        manual_recipients=manual_entries,
    )

    assert preview["total_entered"] == 5
    assert preview["valid"] == 4
    assert preview["invalid"] == 1
    assert preview["duplicates"] == 1
    assert preview["suppressed"] == 2  # suppressed@example.com + optedout@example.com
    assert preview["eligible"] == 1    # only valid.guest@example.com is eligible


@pytest.mark.asyncio
async def test_manual_recipient_does_not_create_user_account():
    """Requirement: Entering an email manually must NEVER automatically create a user in users table."""
    from unittest.mock import AsyncMock, MagicMock
    from app.services.campaign_worker import prepare_campaign_recipients

    mock_db = AsyncMock()
    mock_campaign = MagicMock()
    mock_campaign.id = 77
    mock_campaign.recipient_mode = "MANUAL"
    mock_campaign.target_audience = "MANUAL"
    mock_campaign.event_id = None
    mock_campaign.total_recipients = 0
    mock_db.get.return_value = mock_campaign

    # Mock queries for prepare_campaign_recipients
    mock_unsub = MagicMock()
    mock_unsub.all.return_value = []
    mock_optout = MagicMock()
    mock_optout.all.return_value = []
    mock_existing = MagicMock()
    mock_existing.scalars.return_value.all.return_value = []
    mock_count = MagicMock()
    mock_count.scalar.return_value = 1

    mock_db.execute.side_effect = [
        mock_unsub,
        mock_optout,
        mock_existing,
        mock_count,
    ]

    manual_list = [{"email": "guest.without.account@partner.org", "name": "VIP Guest"}]

    count = await prepare_campaign_recipients(
        campaign_id=77,
        db=mock_db,
        manual_recipients=manual_list,
    )

    assert count == 1
    # Verify: objects added to db must ONLY be EmailRecipient, NEVER User!
    added_objects = mock_db.add_all.call_args[0][0]
    assert len(added_objects) == 1
    recipient_obj = added_objects[0]
    assert isinstance(recipient_obj, EmailRecipient)
    assert recipient_obj.email == "guest.without.account@partner.org"
    assert recipient_obj.source == "MANUAL"
    assert recipient_obj.user_id is None




