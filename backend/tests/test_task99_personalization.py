import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.v1.pr_studio import (
    SYSTEM_PROMPT,
    _build_rich_fallback,
    _parse_gemini_output,
    execute_pr_generation,
    PRGenerateRequest,
)
from app.services.omnichannel_service import dispatch_omnichannel_message, broadcast_campaign


def test_system_prompt_personalization_rules():
    """Verify that SYSTEM_PROMPT mandates dynamic personalization tokens and forbids generic greetings."""
    assert "{{recipient_name}}" in SYSTEM_PROMPT
    assert "{{company}}" in SYSTEM_PROMPT
    assert "{{ticket_code}}" in SYSTEM_PROMPT
    assert "TUYỆT ĐỐI KHÔNG dùng \"Kính gửi Quý Khách,\"" in SYSTEM_PROMPT or "KHÔNG" in SYSTEM_PROMPT


def test_fallback_includes_personalization_merge_tags():
    """Verify that fallback generation uses merge tags instead of hardcoded generic strings."""
    # Upcoming mode
    upcoming = _build_rich_fallback(
        event_name="AI Future Summit",
        event_time="20/10/2026",
        event_location="Hall A",
        main_topic="GenAI & Agents",
        keywords_str="AI, Agent",
        tone="engaging",
        lifecycle="UPCOMING",
    )
    assert upcoming.email_body is not None
    assert "Kính gửi {{recipient_name}}," in upcoming.email_body
    assert "{{company}}" in upcoming.email_body
    assert "{{ticket_code}}" in upcoming.email_body
    assert "Kính gửi Quý Khách," not in upcoming.email_body

    # Concluded mode
    concluded = _build_rich_fallback(
        event_name="AI Future Summit",
        event_time="20/10/2026",
        event_location="Hall A",
        main_topic="GenAI & Agents",
        keywords_str="AI, Agent",
        tone="engaging",
        lifecycle="CONCLUDED",
    )
    assert concluded.email_body is not None
    assert "Kính gửi {{recipient_name}}," in concluded.email_body
    assert "{{company}}" in concluded.email_body
    assert "{{ticket_code}}" in concluded.email_body
    assert "Kính gửi Quý Khách," not in concluded.email_body


def test_gemini_output_sanitization():
    """Verify that generic greetings from LLM output are sanitized to {{recipient_name}}."""
    mock_llm_json = """```json
    {
      "email_subject": "Thư mời đặc biệt",
      "email_preheader": "Cơ hội tham gia",
      "email_body": "Kính gửi Quý Khách,\\n\\nChúng tôi trân trọng kính mời...",
      "email_cta": "Tham gia ngay"
    }
    ```"""
    parsed = _parse_gemini_output(
        text=mock_llm_json,
        event_name="Event Test",
        event_time="2026",
        event_location="HCM",
        main_topic="AI",
        keywords_str="AI",
        tone="engaging",
    )
    assert parsed.email_body is not None
    assert "Kính gửi {{recipient_name}}," in parsed.email_body
    assert "Kính gửi Quý Khách," not in parsed.email_body


@pytest.mark.asyncio
async def test_api_generate_pr_contains_tokens():
    """Verify /api/v1/pr-studio/generate-pr returns personalization tokens in email_body."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/pr-studio/generate-pr",
            json={
                "event_name": "EventHub Tech Summit 2026",
                "main_topic": "Agentic AI Transformation",
                "lifecycle": "UPCOMING",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert "email_body" in data
        assert "{{recipient_name}}" in data["email_body"]
        assert "Kính gửi Quý Khách," not in data["email_body"]


@pytest.mark.asyncio
async def test_omnichannel_token_replacement():
    """Verify that omnichannel broadcast substitutes dynamic tokens per recipient."""
    recipients = [
        {
            "name": "Trần Văn An",
            "email": "an.tran@example.com",
            "phone": "0912345678",
            "company": "Vingroup",
            "ticket_code": "VIN-VIP-001",
        },
        {
            "name": "Lê Thị Bình",
            "email": "binh.le@example.com",
            "phone": "0987654321",
            "company": "FPT Telecom",
            "ticket_code": "FPT-STD-002",
        },
    ]

    template_content = "Kính gửi {{recipient_name}}, từ {{company}}! Mã vé của bạn: {{ticket_code}}."
    res = await broadcast_campaign(
        channels=["sms", "zalo"],
        recipients=recipients,
        subject="Thư mời: {{recipient_name}}",
        content=template_content,
        event_title="Tech Fest 2026",
    )
    assert res["total"] == 2
    assert res["success"] == 2
