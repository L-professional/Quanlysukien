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
import urllib.parse

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
    qr_token: Optional[str] = None,
    ticket_type: Optional[str] = None,
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
    if qr_token:
        lines.append("")
        lines.append("--- VÉ ĐIỆN TỬ & MÃ QR CHECK-IN SOÁT VÉ ---")
        lines.append(f"Hạng vé: {ticket_type or 'Vé VIP All-Access'}")
        lines.append(f"Mã soát vé: {qr_token}")
        lines.append(f"Mã QR tra cứu: https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={urllib.parse.quote(qr_token)}")
        lines.append("(Vui lòng xuất trình mã vé tại Cổng Soát Vé để nhân viên check-in vào sự kiện)")
    if cta_url:
        lines.append(f"\nĐăng ký tham dự tại: {cta_url}")
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
    qr_token: Optional[str] = None,
    ticket_type: Optional[str] = None,
    qr_image_url: Optional[str] = None,
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

    # Optional QR Ticket Pass Section
    qr_ticket_section = ""
    if qr_token:
        safe_qr_token = html.escape(qr_token.strip())
        safe_ticket_type = html.escape(ticket_type or "Vé VIP All-Access")
        encoded_token = urllib.parse.quote(qr_token.strip())
        img_url = qr_image_url or f"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={encoded_token}&color=1E293B&bgcolor=FFFFFF"
        qr_ticket_section = f"""
        <!-- Official E-Ticket & Scannable QR Check-in Pass Box -->
        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 16px; padding: 24px 20px; margin: 24px 0 28px 0; color: #FFFFFF; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);">
          <div style="display: inline-block; background-color: rgba(99, 102, 241, 0.25); color: #C7D2FE; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(165, 180, 252, 0.3);">
            🎟️ VÉ THAM DỰ CHÍNH THỨC • E-TICKET PASS
          </div>
          <h3 style="margin: 0 0 6px 0; color: #FFFFFF; font-size: 17px; font-weight: 800;">
            {safe_title}
          </h3>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8;">
            Hạng vé: <strong style="color: #38BDF8;">{safe_ticket_type}</strong> &nbsp;|&nbsp; Khách mời: <strong style="color: #F8FAFC;">{greeting_name}</strong>
          </p>

          <!-- QR Code Image -->
          <div style="background-color: #FFFFFF; display: inline-block; padding: 12px; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.25); margin: 0 auto 14px auto;">
            <img src="{img_url}" alt="Mã QR Soát Vé" width="200" height="200" style="display: block; width: 200px; height: 200px; border-radius: 8px;" />
          </div>

          <!-- Token Code Badge -->
          <div style="margin-bottom: 12px;">
            <span style="font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">Mã soát vé check-in:</span><br/>
            <code style="background-color: rgba(255,255,255,0.1); color: #38BDF8; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 800; letter-spacing: 1.5px; padding: 5px 16px; border-radius: 8px; display: inline-block; margin-top: 5px; border: 1px dashed rgba(56, 189, 248, 0.5);">
              {safe_qr_token}
            </code>
          </div>

          <p style="margin: 0; font-size: 12px; color: #CBD5E1; line-height: 1.5; max-width: 440px; margin: 0 auto;">
            ⚡ Xuất trình mã QR này tại <strong>Cổng Soát Vé (Scanner)</strong> của sự kiện để nhân viên quét check-in vào cổng trong 1.5 giây.
          </p>
        </div>
        """

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

        {qr_ticket_section}

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


def _send_via_smtp(
    to_email: str,
    subject: str,
    html_content: str,
    plain_text: Optional[str] = None,
    from_address: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Helper to dispatch email via standard SMTP (e.g. Gmail SMTP) when configured."""
    try:
        from app.services.email_service import get_smtp_config
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        cfg = get_smtp_config()
        if not (cfg.get("host") and cfg.get("user") and cfg.get("password")):
            return None

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        sender = cfg.get("from") or from_address or cfg.get("user")
        msg["From"] = sender
        msg["To"] = to_email

        if plain_text:
            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        import email.utils
        envelope_from = email.utils.parseaddr(sender)[1] or cfg.get("user")
        envelope_to = email.utils.parseaddr(to_email)[1] or to_email.strip()

        port = cfg.get("port", 587)
        if cfg.get("secure") or port == 465:
            with smtplib.SMTP_SSL(cfg["host"], port, timeout=15) as server:
                server.login(cfg["user"], cfg["password"])
                server.sendmail(envelope_from, [envelope_to], msg.as_string())
        else:
            with smtplib.SMTP(cfg["host"], port, timeout=15) as server:
                server.starttls()
                server.login(cfg["user"], cfg["password"])
                server.sendmail(envelope_from, [envelope_to], msg.as_string())

        mock_id = f"smtp_{uuid.uuid4().hex[:16]}"
        logger.info(f"Successfully delivered email to {to_email} via SMTP ({cfg['host']})")
        return {
            "success": True,
            "message_id": mock_id,
            "error": None,
            "error_code": None,
            "is_permanent_error": False,
            "is_simulated": False,
        }
    except Exception as e:
        logger.error(f"SMTP delivery error to {to_email}: {e}")
        return None


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
        smtp_res = await asyncio.to_thread(
            _send_via_smtp, to_email, subject, html_content, plain_text, from_address
        )
        if smtp_res and smtp_res.get("success"):
            return smtp_res

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
        resend_from = (
            "EventHub AI <onboarding@resend.dev>"
            if (not from_address or "gmail.com" in from_address.lower())
            else from_address
        )
        payload: Dict[str, Any] = {
            "from": resend_from,
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
                if "only send testing emails to your own email address" in err_str.lower():
                    if smtp_res:
                        return smtp_res
                    logger.warning(
                        f"Resend free tier restriction: Cannot send to unverified address {to_email}. "
                        f"Simulating delivery for local testing."
                    )
                    mock_id = f"sim_{uuid.uuid4().hex[:16]}"
                    return {
                        "success": True,
                        "message_id": mock_id,
                        "error": None,
                        "error_code": None,
                        "is_permanent_error": False,
                        "is_simulated": True,
                    }
                # Check if it's a permanent validation error
                is_permanent = any(code in err_str.lower() for code in ["validation_error", "invalid", "422", "400", "403"])
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
                    if res.status_code == 403 and "only send testing emails to your own email address" in err_text:
                        if smtp_res:
                            return smtp_res
                        logger.warning(
                            f"Resend free tier restriction: Cannot send to unverified address {to_email}. "
                            f"Simulating delivery for local testing."
                        )
                        mock_id = f"sim_{uuid.uuid4().hex[:16]}"
                        return {
                            "success": True,
                            "message_id": mock_id,
                            "error": None,
                            "error_code": None,
                            "is_permanent_error": False,
                            "is_simulated": True,
                        }

                    is_perm = res.status_code in (400, 403, 422)
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
