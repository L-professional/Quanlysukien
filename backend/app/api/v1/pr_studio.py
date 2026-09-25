import json
import re
from typing import List, Optional, Union
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.gemini_service import gemini_service

router = APIRouter(tags=["AI PR Studio"])


class PRGenerateRequest(BaseModel):
    # Event attributes with aliases
    event_name: Optional[str] = Field(None, description="Tên sự kiện")
    title: Optional[str] = Field(None, description="Alias cho event_name")
    event_category: Optional[str] = Field(None, description="Danh mục sự kiện")
    category: Optional[str] = Field(None, description="Alias cho event_category")
    event_time: Optional[str] = Field(None, description="Thời gian diễn ra")
    datetime: Optional[str] = Field(None, description="Alias cho event_time")
    target_audience: Optional[str] = Field(None, description="Người dùng / Đối tượng mục tiêu")
    audience: Optional[str] = Field(None, description="Alias cho target_audience")
    event_location: Optional[str] = Field(None, description="Hội trường / Địa điểm")
    location: Optional[str] = Field(None, description="Alias cho event_location")
    main_topic: Optional[str] = Field(None, description="Chủ đề chính")
    topic: Optional[str] = Field(None, description="Alias cho main_topic")
    tone_of_voice: Optional[str] = Field("engaging", description="Tông giọng: professional | engaging | casual")
    tone: Optional[str] = Field(None, description="Alias cho tone_of_voice")
    keywords: Optional[Union[str, List[str]]] = Field(None, description="Từ khóa chính")
    content_type: Optional[str] = Field("all", description="Loại nội dung cần sinh: all | email | social | reminder")
    lifecycle: Optional[str] = Field("UPCOMING", description="Vòng đời sự kiện: UPCOMING (Mời đăng ký/Quảng bá) | CONCLUDED (Tổng kết/Tri ân) | ONGOING (Đang diễn ra)")


class PRGenerateResponse(BaseModel):
    email: str
    social: str
    reminder: str
    email_subject: Optional[str] = None
    email_cta: Optional[str] = None
    social_hook: Optional[str] = None
    social_hashtags: Optional[List[str]] = None
    sms_reminder: Optional[str] = None
    raw_response: Optional[str] = None


SYSTEM_PROMPT = """Bạn là Giám đốc Truyền thông & Chuyên gia AI Copywriting hàng đầu của EventHub AI.
Bạn sở hữu năng lực xử lý đa nhiệm, linh hoạt và không giới hạn (unrestricted):
- Vừa có thể lắng nghe, phản hồi tự nhiên, giải đáp các câu chào hỏi, thắc mắc tổng quát hoặc yêu cầu mở rộng về sự kiện.
- Vừa sáng tạo các ấn phẩm truyền thông PR & Marketing sự kiện xuất sắc, bám sát các tham số: Tên sự kiện, Thời gian, Địa điểm/Hội trường, Đối tượng mục tiêu, Chủ đề chính, Tông giọng và Từ khóa.

BỘ NỘI DUNG 3 KÊNH BẮT BUỘC:
1. BẢN TIN EMAIL (Email Newsletter):
   - Tiêu đề thư (Subject line): Thu hút, khơi gợi tò mò và tỷ lệ mở cao.
   - Thân bài (Body): Lời chào trân trọng, dẫn dắt giá trị khác biệt của sự kiện, thời gian, địa điểm, diễn giả/phiên nổi bật.
   - Kêu gọi hành động (Call To Action - CTA): Rõ ràng, dứt khoát (ví dụ: "👉 [Đăng Ký Tham Dự Ngay - Số Lượng Giới Hạn]").

2. BÀI ĐĂNG MẠNG XÃ HỘI (Social Media Post):
   - Câu giật tít mở đầu (Hook): Bắt trend, kích thích tương tác ngay từ dòng đầu tiên.
   - Nội dung chính (Body): Dễ đọc, chấm phá gạch đầu dòng trực quan, giàu năng lượng kèm emoji phù hợp.
   - Bộ Hashtags: 4-6 hashtag chuẩn, bắt đầu bằng dấu # (ví dụ: #EventHubAI #TechSummit2026 #AI).

3. TIN NHẮC SỰ KIỆN (Event Reminder):
   - Chuẩn định dạng SMS / Mobile Push Notification: Ngắn gọn, súc tích (dưới 180 ký tự hoặc 2-3 câu).
   - Nêu mốc thời gian, hội trường/phòng họp và nhắc người tham dự mở sẵn Mã vé QR trên ứng dụng để check-in tức thì.

ĐỊNH DẠNG TRẢ VỀ:
Hãy luôn xuất ra khối JSON hợp lệ theo cấu trúc sau (có thể bọc trong ```json ... ```):
{
  "email_subject": "Tiêu đề email",
  "email_body": "Thân bài email đầy đủ...",
  "email_cta": "Lời kêu gọi hành động CTA...",
  "social_hook": "Câu mở đầu giật tít...",
  "social_body": "Nội dung bài đăng mạng xã hội...",
  "social_hashtags": ["#Tag1", "#Tag2", "#Tag3"],
  "sms_reminder": "⏰ [NHẮC LỊCH SỰ KIỆN] ..."
}
"""


def _parse_gemini_output(
    text: str,
    event_name: str,
    event_time: str,
    event_location: str,
    main_topic: str,
    keywords_str: str,
    tone: str,
    lifecycle: str = "UPCOMING",
) -> PRGenerateResponse:
    """Safely extract structured JSON or format fallback response."""
    email = ""
    social = ""
    reminder = ""
    email_subject = None
    email_cta = None
    social_hook = None
    social_hashtags: List[str] = []
    sms_reminder = None

    # Try extracting JSON object
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate_json = json_match.group(1) if json_match else None
    if not candidate_json:
        stripped = text.strip()
        if stripped.startswith("{") and stripped.endswith("}"):
            candidate_json = stripped

    parsed = None
    if candidate_json:
        try:
            parsed = json.loads(candidate_json)
        except Exception:
            pass

    is_concluded = lifecycle.upper() == "CONCLUDED"

    if isinstance(parsed, dict):
        if is_concluded:
            default_subj = f"🙏 Lời tri ân & Tổng kết sự kiện: {event_name}"
            default_cta = "👉 [Xem Khoảnh Khắc Đẹp & Tải Slide Diễn Giả]"
            default_hook = f"🎉 {event_name} đã khép lại thành công rực rỡ! Cảm ơn Quý khách & Diễn giả!"
            default_sms = (
                f"🙏 Ban tổ chức {event_name} xin chân thành cảm ơn Quý khách & Diễn giả! "
                f"Mời Quý khách xem lại hình ảnh và đánh giá sự kiện tại ứng dụng EventHub AI."
            )
        else:
            default_subj = f"Thư mời tham dự {event_name}: {main_topic}"
            default_cta = "👉 [Đăng Ký Tham Dự Ngay]"
            default_hook = f"🚀 {event_name} chính thức khởi động: {main_topic}!"
            default_sms = (
                f"⏰ [NHẮC LỊCH] {event_name} diễn ra lúc {event_time} tại {event_location}. "
                f"Mở sẵn Mã vé QR trên EventHub AI để check-in tức thì!"
            )

        email_subject = parsed.get("email_subject") or default_subj
        email_body = parsed.get("email_body") or ""
        email_cta = parsed.get("email_cta") or default_cta
        email = f"Subject: {email_subject}\n\n{email_body}\n\nCTA: {email_cta}"

        social_hook = parsed.get("social_hook") or default_hook
        social_body = parsed.get("social_body") or ""
        raw_tags = parsed.get("social_hashtags") or []
        if isinstance(raw_tags, list):
            social_hashtags = [t if t.startswith("#") else f"#{t}" for t in raw_tags]
        elif isinstance(raw_tags, str):
            social_hashtags = [t.strip() for t in raw_tags.split() if t.strip()]

        tags_line = " ".join(social_hashtags) if social_hashtags else ("#EventHubAI #Recap #Gratitude" if is_concluded else "#EventHubAI #PRStudio")
        social = f"{social_hook}\n\n{social_body}\n\n📅 {event_time} | 📍 {event_location}\n\n{tags_line}"

        sms_reminder = parsed.get("sms_reminder") or default_sms
        reminder = sms_reminder
    else:
        clean_text = re.sub(r"```(?:json)?|```", "", text).strip()
        if is_concluded:
            email_subject = f"🙏 Tri ân & Tổng kết sự kiện: {event_name}"
            email_cta = "👉 [Xem Ảnh Kỷ Niệm & Gửi Khảo Sát Đóng Góp Ý Kiến]"
            email = (
                f"Subject: {email_subject}\n\n"
                f"Kính gửi Quý khách & Quý Diễn Giả,\n\n"
                f"{clean_text[:500]}...\n\n"
                f"📅 Sự kiện diễn ra: {event_time}\n"
                f"📍 Địa điểm: {event_location}\n\n"
                f"CTA: {email_cta}\n\n"
                f"Trân trọng cảm ơn,\nBan Tổ Chức {event_name}"
            )
            social_hook = f"✨ Tổng kết đáng nhớ {event_name} — Tri ân Quý khách & Diễn giả!"
            tags = [
                f"#{w.replace(' ', '')}"
                for w in (keywords_str.split(",") if keywords_str else ["EventHubAI", "Recap", "Gratitude"])
                if w.strip()
            ]
            social_hashtags = tags[:6]
            social = f"{social_hook}\n\n{clean_text}\n\n📅 {event_time} | 📍 {event_location}\n{' '.join(social_hashtags)}"
            sms_reminder = (
                f"🙏 BTC {event_name} xin gửi lời cảm ơn chân thành đến Quý khách đã tham dự. "
                f"Tài liệu và hình ảnh kỷ niệm đã sẵn sàng trên ứng dụng EventHub AI!"
            )
            reminder = sms_reminder
        else:
            email_subject = f"Thư mời tham dự: {event_name} — {main_topic or 'Đột phá Công Nghệ'}"
            email_cta = "👉 [Xác Nhận Tham Dự & Nhận Mã Vé QR]"
            email = (
                f"Subject: {email_subject}\n\n"
                f"Kính gửi Quý khách,\n\n"
                f"{clean_text[:500]}...\n\n"
                f"📅 Thời gian: {event_time}\n"
                f"📍 Địa điểm: {event_location}\n\n"
                f"CTA: {email_cta}\n\n"
                f"Trân trọng,\nBan Tổ Chức {event_name}"
            )

            social_hook = f"🌟 {event_name} — {main_topic or 'Sự kiện không thể bỏ lỡ'}!"
            tags = [
                f"#{w.replace(' ', '')}"
                for w in (keywords_str.split(",") if keywords_str else ["EventHubAI", "AI", "Technology"])
                if w.strip()
            ]
            social_hashtags = tags[:6]
            tags_line = " ".join(social_hashtags)
            social = (
                f"{social_hook}\n\n"
                f"{clean_text}\n\n"
                f"📅 {event_time} | 📍 {event_location}\n"
                f"{tags_line}"
            )

            sms_reminder = (
                f"⏰ [NHẮC LỊCH] {event_name} sẽ bắt đầu vào {event_time} tại {event_location}. "
                f"Vui lòng chuẩn bị sẵn Mã vé QR trên ứng dụng EventHub AI để vào cổng nhanh chóng!"
            )
            reminder = sms_reminder

    return PRGenerateResponse(
        email=email,
        social=social,
        reminder=reminder,
        email_subject=email_subject,
        email_cta=email_cta,
        social_hook=social_hook,
        social_hashtags=social_hashtags,
        sms_reminder=sms_reminder,
        raw_response=text,
    )


async def execute_pr_generation(payload: PRGenerateRequest) -> PRGenerateResponse:
    event_name = payload.event_name or payload.title or "EventHub AI Summit 2026"
    event_category = payload.event_category or payload.category or "Công nghệ & Trí Tuệ Nhân Tạo"
    event_time = payload.event_time or payload.datetime or "15-16 Oct 2026, 08:30 AM"
    target_audience = payload.target_audience or payload.audience or "Lãnh đạo Doanh Nghiệp, Kỹ Sư & Cộng Đồng Công Nghệ"
    event_location = payload.event_location or payload.location or "GEM Center, TP. Hồ Chí Minh"
    main_topic = payload.main_topic or payload.topic or "Ứng dụng AI đa nhiệm & Tự động hóa sự kiện thông minh"
    tone = payload.tone_of_voice or payload.tone or "engaging"
    lifecycle = (payload.lifecycle or "UPCOMING").upper()

    keywords_val = payload.keywords
    if isinstance(keywords_val, list):
        keywords_str = ", ".join(keywords_val)
    elif isinstance(keywords_val, str):
        keywords_str = keywords_val.strip()
    else:
        keywords_str = "EventHub AI, RAG, QR Check-in, Công nghệ số"

    if lifecycle == "CONCLUDED":
        lifecycle_context = (
            "TRẠNG THÁI VÒNG ĐỜI: SỰ KIỆN ĐÃ DIỄN RA HOÀN TẤT (POST-EVENT / CONCLUDED).\n"
            "MỤC TIÊU NỘI DUNG: TỔNG KẾT, BÁO CÁO THÀNH CÔNG, CẢM ƠN KHÁCH THAM DỰ & TRI ÂN DIỄN GIẢ.\n"
            "- Bản tin Email: Thư cảm ơn trang trọng và chân thành gửi đến đại biểu, khách tham dự và diễn giả. "
            "Nhắc lại các khoảnh khắc ấn tượng, kết quả đạt được, lời tri ân sâu sắc tới diễn giả, "
            "kèm CTA hướng dẫn tải slide tài liệu thuyết trình, xem thư viện ảnh và điền phiếu khảo sát chất lượng.\n"
            "- Bài đăng mạng xã hội: Bài viết recap giàu cảm xúc và tự hào, cảm ơn sự đồng hành của khách mời và chuyên gia diễn giả, "
            "kêu gọi chia sẻ cảm nhận và hẹn gặp ở mùa sự kiện tiếp theo.\n"
            "- Tin nhắc / SMS: Lời cảm ơn ngắn gọn, chúc mừng thành công và link nhận chứng nhận tham gia / slide tài liệu."
        )
    else:
        lifecycle_context = (
            "TRẠNG THÁI VÒNG ĐỜI: SỰ KIỆN SẮP DIỄN RA (PRE-EVENT / UPCOMING).\n"
            "MỤC TIÊU NỘI DUNG: MỜI ĐĂNG KÝ, QUẢNG BÁ TRUYỀN THÔNG & NHẮC LỊCH SỰ KIỆN.\n"
            "- Bản tin Email: Thư mời tham dự hấp dẫn, làm nổi bật giá trị cốt lõi, danh sách diễn giả nổi bật và CTA đăng ký giữ chỗ / lấy vé QR.\n"
            "- Bài đăng mạng xã hội: Bài viết truyền thông cuốn hút, bắt trend, khơi gợi tò mò và thôi thúc tham gia.\n"
            "- Tin nhắc / SMS: Nhắc nhở mốc thời gian, hội trường và nhắc người tham dự mở sẵn mã vé QR để check-in tức thì."
        )

    prompt = (
        f"Hãy tạo bộ ấn phẩm truyền thông PR & Marketing cho sự kiện với các thông tin chi tiết sau:\n"
        f"- Tên sự kiện: {event_name}\n"
        f"- Danh mục sự kiện: {event_category}\n"
        f"- Thời gian tổ chức: {event_time}\n"
        f"- Địa điểm / Hội trường: {event_location}\n"
        f"- Đối tượng khách tham dự: {target_audience}\n"
        f"- Chủ đề chính cần truyền thông: {main_topic}\n"
        f"- Tông giọng (Tone of voice): {tone} (hãy thể hiện chuẩn xác phong cách này)\n"
        f"- Từ khóa chính: {keywords_str}\n\n"
        f"{lifecycle_context}\n\n"
        f"Yêu cầu định dạng JSON:\n"
        f"Xuất dữ liệu theo đúng cấu trúc JSON gồm: email_subject, email_body, email_cta, social_hook, social_body, social_hashtags, sms_reminder."
    )

    result = await gemini_service.generate_draft_answer(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
        temperature=0.4,
        max_output_tokens=2048,
    )

    return _parse_gemini_output(
        text=result.text.strip(),
        event_name=event_name,
        event_time=event_time,
        event_location=event_location,
        main_topic=main_topic,
        keywords_str=keywords_str,
        tone=tone,
        lifecycle=lifecycle,
    )


@router.post("/generate-pr", response_model=PRGenerateResponse)
async def generate_pr_endpoint(payload: PRGenerateRequest):
    return await execute_pr_generation(payload)


@router.post("/generate", response_model=PRGenerateResponse)
async def generate_legacy_endpoint(payload: PRGenerateRequest):
    return await execute_pr_generation(payload)


@router.post("/generate-description")
async def generate_ai_description_endpoint(payload: dict):
    from app.api.v1.events import (
        GenerateSessionDescriptionRequest,
        generate_session_description,
    )
    req = GenerateSessionDescriptionRequest(
        title=payload.get("title") or payload.get("event_name") or "",
        track=payload.get("track") or payload.get("category") or payload.get("event_type") or "AI & Tech",
        category=payload.get("category") or payload.get("event_type"),
        event_type=payload.get("event_type"),
        location=payload.get("location") or payload.get("event_location"),
        speaker_name=payload.get("speaker_name") or "",
        speaker_role=payload.get("speaker_role") or "",
        style=payload.get("style") or "auto",
    )
    return await generate_session_description(req)

