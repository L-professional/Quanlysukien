import os
from typing import Optional
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.email_service import send_invitation_email

router = APIRouter(tags=["Invitations & Email"])


def is_email_service_configured() -> bool:
    """Check if SMTP or Resend credentials exist in settings or environment."""
    smtp_host = (settings.SMTP_HOST or os.getenv("SMTP_HOST") or os.getenv("SMTP_SERVER") or "").strip()
    smtp_user = (settings.SMTP_USER or os.getenv("SMTP_USER") or os.getenv("SMTP_USERNAME") or "").strip()
    smtp_pass = (settings.SMTP_PASS or os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "").strip()
    resend_key = (getattr(settings, "RESEND_API_KEY", "") or os.getenv("RESEND_API_KEY") or "").strip()

    has_smtp = bool(smtp_host and smtp_user and smtp_pass)
    has_resend = bool(resend_key)
    return has_smtp or has_resend


class SendInvitationRequest(BaseModel):
    to: str = Field(..., description="Email người nhận")
    recipient_name: Optional[str] = Field(None, description="Tên khách mời")
    event_title: Optional[str] = Field("EventHub AI Summit 2026", description="Tên sự kiện")
    event_date: Optional[str] = Field("15-16 Tháng 10, 2026 • 08:30 - 17:30", description="Thời gian sự kiện")
    event_location: Optional[str] = Field("Trung tâm Hội nghị GEM Center, TP. Hồ Chí Minh", description="Địa điểm sự kiện")
    ticket_type: Optional[str] = Field("Vé Mời Danh Dự (VIP Pass)", description="Hạng vé")
    qr_token: Optional[str] = Field(None, description="Mã QR token")
    qr_image: Optional[str] = Field(None, description="Ảnh QR base64 nếu có")
    event_url: Optional[str] = Field("http://localhost:3000/events", description="Đường dẫn xem vé")
    subject: Optional[str] = Field(None, description="Tiêu đề email")
    custom_message: Optional[str] = Field(None, description="Lời nhắn riêng từ BTC")
    role: Optional[str] = Field(None, description="Vai trò (ATTENDEE, SPEAKER, STAFF...)")


class SendInvitationResponse(BaseModel):
    success: bool
    messageId: str
    recipient: str
    sentAt: str
    message: str
    previewUrl: Optional[str] = None


@router.post("/send", response_model=SendInvitationResponse)
@router.post("/invitations/send", response_model=SendInvitationResponse)
@router.post("/email/send", response_model=SendInvitationResponse)
@router.post("/send-test", response_model=SendInvitationResponse)
@router.post("/invitations/send-test", response_model=SendInvitationResponse)
@router.post("/email/send-test", response_model=SendInvitationResponse)
async def send_invitation_endpoint(payload: SendInvitationRequest):
    try:
        result = await send_invitation_email(
            to_email=payload.to,
            recipient_name=payload.recipient_name or "Quý Khách",
            event_title=payload.event_title or "EventHub AI Summit 2026",
            event_date=payload.event_date or "15-16 Tháng 10, 2026 • 08:30 - 17:30",
            event_location=payload.event_location or "Trung tâm Hội nghị GEM Center, TP. Hồ Chí Minh",
            ticket_type=payload.ticket_type or "Vé Mời Danh Dự (VIP Pass)",
            qr_token=payload.qr_token,
            qr_image=payload.qr_image,
            event_url=payload.event_url or "http://localhost:3000/events",
            subject=payload.subject,
            custom_message=payload.custom_message,
            role=payload.role,
        )
        return SendInvitationResponse(
            success=True,
            messageId=result.get("messageId", ""),
            recipient=result.get("recipient", payload.to),
            sentAt=result.get("sentAt", ""),
            message=f"Đã gửi email thử nghiệm thành công tới {payload.to}!",
            previewUrl=result.get("previewUrl"),
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": f"Gửi email thất bại: {str(e)}",
                "detail": f"Gửi email thất bại: {str(e)}",
            },
        )


class SendConciergeResponseRequest(BaseModel):
    to: str = Field(..., description="Email người nhận")
    recipient_name: Optional[str] = Field("Quý Khách", description="Tên khách tham dự")
    question: str = Field(..., description="Câu hỏi của khách")
    response_content: str = Field(..., description="Nội dung phản hồi")
    event_title: Optional[str] = Field("EventHub AI Summit 2026", description="Tên sự kiện")
    channel: Optional[str] = Field("EMAIL", description="Kênh phản hồi")


@router.post("/email/send-response", response_model=SendInvitationResponse)
@router.post("/invitations/send-response", response_model=SendInvitationResponse)
async def send_concierge_response_endpoint(payload: SendConciergeResponseRequest):
    """
    Task 87: Dispatch AI Concierge response to participant email with rich styling.
    """
    try:
        custom_body = (
            f"<strong>Câu hỏi của Quý khách:</strong><br/>"
            f"<blockquote style='border-left: 4px solid #DC2626; padding-left: 12px; margin: 10px 0; color: #475569; font-style: italic;'>"
            f"{payload.question}"
            f"</blockquote><br/>"
            f"<strong>Phản hồi từ Ban Tổ Chức:</strong><br/>"
            f"<div style='background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-top: 8px; color: #1E293B; line-height: 1.6; white-space: pre-wrap;'>"
            f"{payload.response_content}"
            f"</div>"
        )
        result = await send_invitation_email(
            to_email=payload.to,
            recipient_name=payload.recipient_name or "Quý Khách",
            event_title=payload.event_title or "EventHub AI Summit 2026",
            subject=f"💬 [EventHub AI Concierge] Phản hồi thắc mắc: {payload.question[:60]}...",
            custom_message=custom_body,
        )
        return SendInvitationResponse(
            success=True,
            messageId=result.get("messageId", ""),
            recipient=result.get("recipient", payload.to),
            sentAt=result.get("sentAt", ""),
            message=f"Đã gửi phản hồi thành công tới email {payload.to}!",
            previewUrl=result.get("previewUrl"),
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": f"Gửi email phản hồi thất bại: {str(e)}",
                "detail": f"Gửi email phản hồi thất bại: {str(e)}",
            },
        )


