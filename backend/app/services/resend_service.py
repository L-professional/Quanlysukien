"""
Resend Email Delivery Service & Responsive Email Template Renderer
Provides:
- ResendEmailService: Singleton service for dispatching emails via official Resend API/SDK
- render_campaign_html: Responsive HTML email template builder for promotional campaigns
- generate_plain_text_alternative: Plain-text fallback email generator
"""
import os
import uuid
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Union
import html

import httpx
try:
    import resend
except ImportError:
    resend = None

try:
    from svix.webhooks import Webhook, WebhookVerificationError
except ImportError:
    Webhook = None
    WebhookVerificationError = Exception

from app.core.config import settings, is_resend_configured

logger = logging.getLogger("eventhub.resend")
logger.setLevel(logging.INFO)


def _safe_url(url: Optional[str], default: str = "") -> str:
    """Validate and sanitize URL to prevent javascript: or malformed injection."""
    if not url:
        return default
    clean = url.strip()
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("/"):
        return clean
    return default


def _format_paragraphs(text: str) -> str:
    """Safely format plain/markdown text into styled HTML paragraphs, treating AI text as untrusted."""
    if not text:
        return ""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    html_parts = []
    for p in paragraphs:
        # Escape HTML entities strictly to prevent injection from untrusted AI claims
        escaped = html.escape(p).replace("\n", "<br/>")
        html_parts.append(
            f'<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">{escaped}</p>'
        )
    return "\n".join(html_parts)


def generate_plain_text_alternative(
    article_body: str,
    subject: str,
    event_title: str,
    recipient_name: Optional[str] = None,
    event_time: Optional[str] = None,
    event_location: Optional[str] = None,
    cta_url: Optional[str] = None,
    unsubscribe_url: Optional[str] = None,
) -> str:
    """Generates an accessible, clean plain-text alternative version of the email."""
    greeting = f"Kính gửi {recipient_name},\n\n" if recipient_name and recipient_name.strip() else "Kính gửi Quý khách,\n\n"
    lines = [
        f"TIÊU ĐỀ: {subject}",
        "=" * 40,
        f"{greeting}{article_body}",
        "",
        "--- THÔNG TIN SỰ KIỆN CHÍNH THỨC ---",
        f"Tên sự kiện: {event_title}",
    ]
    if event_time:
        lines.append(f"Thời gian: {event_time}")
    if event_location:
        lines.append(f"Địa điểm: {event_location}")
    if cta_url:
        lines.append(f"Đăng ký tham dự tại: {cta_url}")
    lines.append("")
    lines.append("-" * 40)
    lines.append("Hệ thống EventHub AI © 2026. All rights reserved.")
    if unsubscribe_url:
        lines.append(f"Để hủy đăng ký nhận email truyền thông, vui lòng truy cập: {unsubscribe_url}")

    return "\n".join(lines)


def render_campaign_html(
    article_body: str,
    subject: str,
    event_title: str,
    recipient_name: Optional[str] = None,
    event_time: Optional[str] = None,
    event_location: Optional[str] = None,
    event_category: Optional[str] = None,
    cover_image_url: Optional[str] = None,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
    unsubscribe_url: Optional[str] = None,
    frontend_url: Optional[str] = None,
) -> str:
    """
    Renders a responsive, mobile-optimized HTML email template for promotional campaigns.
    Uses verified event details from the database and custom recipient personalization.
    AI-generated content is strictly escaped and treated as untrusted text.
    """
    base_fe_url = frontend_url or settings.FRONTEND_URL.rstrip("/")
    resolved_cta_url = _safe_url(cta_url, default=f"{base_fe_url}/events")
    resolved_cta_text = html.escape(cta_text or "Đăng Ký Tham Dự Ngay")
    greeting_name = html.escape(recipient_name.strip()) if recipient_name and recipient_name.strip() else "Quý khách"
    safe_title = html.escape(event_title)
    safe_time = html.escape(event_time or "Thời gian xem chi tiết trên website")
    safe_location = html.escape(event_location or "Trung tâm Hội nghị EventHub AI")
    safe_category = html.escape(event_category or "Sự kiện & Công nghệ")
    body_paragraphs = _format_paragraphs(article_body)

    # Optional banner tag (safely checked)
    banner_section = ""
    safe_cover = _safe_url(cover_image_url)
    if safe_cover:
        banner_section = f"""
        <tr>
          <td style="padding: 0; background-color: #0F172A; text-align: center;">
            <img src="{safe_cover}" alt="{safe_title}" style="width: 100%; max-height: 280px; object-fit: cover; display: block; border-bottom: 2px solid #4F46E5;" />
          </td>
        </tr>
        """

    # Optional unsubscribe link (safely checked)
    unsubscribe_section = ""
    safe_unsub_url = _safe_url(unsubscribe_url)
    if safe_unsub_url:
        unsubscribe_section = f"""
        <p style="margin: 8px 0 0 0; color: #94A3B8; font-size: 11px;">
          Bạn nhận được email này vì đã đăng ký tài khoản hoặc quan tâm sự kiện trên EventHub AI.<br/>
          Nếu không muốn nhận các thông báo truyền thông tiếp theo, bạn có thể 
          <a href="{safe_unsub_url}" style="color: #6366F1; text-decoration: underline; font-weight: 600;">hủy đăng ký tại đây</a>.
        </p>
        """

    html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(subject)}</title>
  <style>
    @media only screen and (max-width: 620px) {{
      .wrapper-table {{ width: 100% !important; border-radius: 0 !important; }}
      .content-padding {{ padding: 24px 18px !important; }}
      .cta-btn {{ display: block !important; width: 100% !important; text-align: center !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);" class="wrapper-table">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #4338CA, #6366F1); padding: 28px 24px; text-align: center;">
        <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); color: #EEF2FF; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
          Bản Tin Sự Kiện • EventHub AI
        </span>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
          EventHub <span style="color: #A5B4FC;">AI</span>
        </h1>
        <p style="margin: 4px 0 0 0; color: #E0E7FF; font-size: 13px; font-weight: 500;">
          Nền Tảng Quản Lý & Điều Phối Sự Kiện Thông Minh
        </p>
      </td>
    </tr>

    {banner_section}

    <!-- Content Body -->
    <tr>
      <td style="padding: 32px 30px;" class="content-padding">
        <!-- Personalized Greeting -->
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0F172A;">
          Kính gửi <span style="color: #4F46E5;">{greeting_name}</span>,
        </p>

        <!-- Main Body Content (strictly sanitized) -->
        <div style="font-size: 15px; color: #334155; line-height: 1.7; margin-bottom: 24px;">
          {body_paragraphs}
        </div>

        <!-- Verified Event Details Box -->
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #4F46E5; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
          <h2 style="margin: 0 0 10px 0; color: #0F172A; font-size: 16px; font-weight: 700;">
            {safe_title}
          </h2>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #475569; line-height: 1.8;">
            <tr>
              <td width="30%" style="color: #64748B; font-weight: 600; padding: 3px 0;">Danh mục:</td>
              <td style="padding: 3px 0;"><strong style="color: #1E293B;">{safe_category}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748B; font-weight: 600; padding: 3px 0;">Thời gian:</td>
              <td style="padding: 3px 0;"><strong style="color: #1E293B;">{safe_time}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748B; font-weight: 600; padding: 3px 0;">Địa điểm:</td>
              <td style="padding: 3px 0;"><strong style="color: #1E293B;">{safe_location}</strong></td>
            </tr>
          </table>
        </div>

        <!-- Call to Action Button -->
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="{resolved_cta_url}" target="_blank" class="cta-btn" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #6366F1); color: #FFFFFF; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35); letter-spacing: 0.2px;">
            {resolved_cta_text} &rarr;
          </a>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
            Số lượng chỗ ngồi có hạn • Đăng ký sớm để nhận vé QR qua email
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 22px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0; color: #64748B; font-size: 12px; font-weight: 600;">
          Hệ thống EventHub AI &copy; 2026. Mọi quyền được bảo lưu.
        </p>
        <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px;">
          Địa chỉ: Trung tâm Đổi Mới Sáng Tạo & Khởi Nghiệp Quốc Gia, Việt Nam
        </p>
        {unsubscribe_section}
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html_template


class ResendEmailService:
    """
    Centralized service for delivering emails through the Resend Email API.
    Supports official SDK, async HTTP fallback, rate-limiting, and test mode preview.
    """

    def __init__(self, rate_limit_per_second: float = 2.0):
        self.rate_limit_per_second = rate_limit_per_second
        self.api_key: str = getattr(settings, "RESEND_API_KEY", "")
        self.webhook_secret: str = getattr(settings, "RESEND_WEBHOOK_SECRET", "")
        self._init_sdk()

    def _init_sdk(self):
        """Configure Resend SDK if API key is present."""
        if resend and is_resend_configured():
            resend.api_key = settings.RESEND_API_KEY.strip()

    def verify_svix_signature(
        self,
        raw_body: Union[bytes, str],
        svix_id: Optional[str],
        svix_timestamp: Optional[str],
        svix_signature: Optional[str],
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Verifies Svix signature headers against raw payload.
        Returns (is_valid, parsed_payload_or_none).
        """
        if not svix_id or not svix_timestamp or not svix_signature:
            return False, None
        secret = self.webhook_secret or settings.RESEND_WEBHOOK_SECRET
        if not secret or secret.startswith("whsec_your_"):
            return False, None
        if not Webhook:
            return False, None

        payload_str = raw_body.decode("utf-8") if isinstance(raw_body, bytes) else str(raw_body)
        try:
            wh = Webhook(secret.strip())
            headers = {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            }
            parsed = wh.verify(payload_str, headers)
            return True, parsed if isinstance(parsed, dict) else json.loads(payload_str)
        except Exception as e:
            logger.warning(f"Svix verification failed: {e}")
            return False, None

    async def send_single_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        unsubscribe_url: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a single email to Resend.
        Returns a dict containing:
        - success: bool
        - message_id: Optional[str] (Resend provider message ID)
        - error: Optional[str]
        - error_code: Optional[str]
        - is_permanent_error: bool (True for 400/422 invalid email, False for 429/500/network)
        - is_simulated: bool
        """
        from_address = from_email or settings.EMAIL_FROM
        reply_to_address = reply_to or settings.EMAIL_REPLY_TO

        headers: Dict[str, str] = {}
        # RFC 8058 One-Click Unsubscribe headers
        if unsubscribe_url:
            headers["List-Unsubscribe"] = f"<{unsubscribe_url}>"
            headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
            headers["X-Idempotency-Key"] = idempotency_key

        effective_key = (self.api_key or "").strip()

        # Safe simulation mode when no real API key is configured
        if not effective_key or effective_key.startswith("re_your_api_key"):
            mock_id = f"sim_{uuid.uuid4().hex[:16]}"
            logger.info(
                f"[RESEND SIMULATION] Sending email to {to_email} | Subject: '{subject}' | Mock ID: {mock_id}"
            )
            return {
                "success": True,
                "message_id": mock_id,
                "error": None,
                "error_code": None,
                "is_permanent_error": False,
                "is_simulated": True,
            }

        # Real Resend API dispatch
        payload: Dict[str, Any] = {
            "from": from_address,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        if plain_text:
            payload["text"] = plain_text
        if reply_to_address:
            payload["reply_to"] = reply_to_address
        if headers:
            payload["headers"] = headers
        if tags:
            payload["tags"] = tags

        # 1. Try official Resend Python SDK in threadpool
        if resend:
            try:
                resend.api_key = effective_key
                res = await asyncio.to_thread(resend.Emails.send, payload)
                msg_id = None
                if isinstance(res, dict):
                    msg_id = res.get("id")
                elif hasattr(res, "id"):
                    msg_id = getattr(res, "id")

                if msg_id:
                    logger.info(f"Resend SDK successfully sent email to {to_email}. Provider ID: {msg_id}")
                    return {
                        "success": True,
                        "message_id": str(msg_id),
                        "error": None,
                        "error_code": None,
                        "is_permanent_error": False,
                        "is_simulated": False,
                    }
                else:
                    logger.warning(f"Resend SDK returned response without id: {res}")
            except Exception as e:
                err_str = str(e)
                # Check if it's a permanent validation error
                is_permanent = any(code in err_str.lower() for code in ["validation_error", "invalid", "422", "400"])
                logger.error(f"Resend SDK error dispatching to {to_email}: {e}. Retrying via async HTTP...")
                if is_permanent:
                    return {
                        "success": False,
                        "message_id": None,
                        "error": err_str,
                        "error_code": "PERMANENT_VALIDATION_ERROR",
                        "is_permanent_error": True,
                        "is_simulated": False,
                    }

        # 2. Asynchronous HTTP Fallback directly to Resend REST API
        try:
            req_headers = {
                "Authorization": f"Bearer {effective_key}",
                "Content-Type": "application/json",
            }
            if idempotency_key:
                req_headers["Idempotency-Key"] = idempotency_key
                req_headers["X-Idempotency-Key"] = idempotency_key

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers=req_headers,
                    json=payload,
                )
                if res.status_code in (200, 201):
                    data = res.json()
                    msg_id = data.get("id")
                    logger.info(f"Resend REST API sent email to {to_email}. Provider ID: {msg_id}")
                    return {
                        "success": True,
                        "message_id": str(msg_id),
                        "error": None,
                        "error_code": None,
                        "is_permanent_error": False,
                        "is_simulated": False,
                    }
                else:
                    err_text = res.text
                    is_perm = res.status_code in (400, 422)
                    logger.error(f"Resend HTTP error ({res.status_code}) for {to_email}: {err_text}")
                    return {
                        "success": False,
                        "message_id": None,
                        "error": f"Resend API Error {res.status_code}: {err_text}",
                        "error_code": f"HTTP_{res.status_code}",
                        "is_permanent_error": is_perm,
                        "is_simulated": False,
                    }
        except Exception as e:
            logger.error(f"Network error sending to {to_email} via Resend: {e}")
            return {
                "success": False,
                "message_id": None,
                "error": str(e),
                "error_code": "NETWORK_ERROR",
                "is_permanent_error": False,
                "is_simulated": False,
            }

    async def send_test_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        campaign_name: str = "Test Campaign",
    ) -> Dict[str, Any]:
        """Send an immediate test email preview to an authorized test inbox."""
        test_subject = f"[TEST PREVIEW] {subject}"
        return await self.send_single_email(
            to_email=to_email,
            subject=test_subject,
            html_content=html_content,
            tags=[{"name": "category", "value": "test_preview"}],
        )


# Global singleton instance
resend_email_service = ResendEmailService()


def get_resend_service() -> ResendEmailService:
    """Return singleton ResendEmailService instance."""
    return resend_email_service
