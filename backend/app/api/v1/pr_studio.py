from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/pr-studio", tags=["AI PR Studio"])


class PRGenerateRequest(BaseModel):
    title: str = "EventHub AI Summit 2026"
    datetime: str = "15-16 Oct 2026"
    audience: str = "Tech Leaders & AI Enthusiasts"
    location: str = "GEM Center, Ho Chi Minh City"
    topic: str
    tone: Optional[str] = "engaging"


class PRGenerateResponse(BaseModel):
    email: str
    social: str
    reminder: str


@router.post("/generate", response_model=PRGenerateResponse)
async def generate_pr_content(payload: PRGenerateRequest):
    """
    Generate PR content (Email Invitation, PR & Social Posts, Reminder Notification) using Gemini.
    """
    prompt = (
        f"Bạn là chuyên gia PR & Copywriter cho sự kiện công nghệ '{payload.title}'.\n"
        f"Thời gian: {payload.datetime}\n"
        f"Địa điểm: {payload.location}\n"
        f"Đối tượng khách: {payload.audience}\n"
        f"Chủ đề cần quảng bá: {payload.topic}\n"
        f"Tone giọng: {payload.tone}\n\n"
        f"Yêu cầu tạo ra 3 phần nội dung riêng biệt:\n"
        f"1. Thư mời Email (Email Invitation)\n"
        f"2. Bài đăng Mạng xã hội / PR (Social & PR Post với Hashtags)\n"
        f"3. Thông báo Nhắc lịch (Reminder Notification)\n"
    )

    res = await gemini_service.generate_draft_answer(
        prompt=prompt,
        system_instruction="Bạn là trợ lý AI Copywriter chuyên nghiệp cho sự kiện công nghệ."
    )

    generated_text = res.text.strip()

    email_content = f"Subject: Thư mời tham dự: {payload.title} — {payload.topic}\n\nKính gửi Quý khách,\n\n{generated_text[:400]}...\n\nTrân trọng,\nBan Tổ Chức {payload.title}"
    social_content = f"🌟 {payload.title} — {payload.topic}\n\n{generated_text}\n\n📅 {payload.datetime} | 📍 {payload.location}\n#EventHubAISummit #AI #RAG #HITL"
    reminder_content = f"⏰ [NHẮC LỊCH] {payload.title} chỉ còn ít ngày nữa!\n\nĐịa điểm: {payload.location}\nThời gian: {payload.datetime}\n\nĐừng quên mở Mã vé QR trên ứng dụng EventHub AI để check-in nhanh tại Cổng A!"

    return PRGenerateResponse(
        email=email_content,
        social=social_content,
        reminder=reminder_content
    )
