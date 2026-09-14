import logging
import zoneinfo
from datetime import datetime, timezone, timedelta
from typing import List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, status
# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.event import Event, EventSchedule
from app.models.knowledge import KnowledgeBase
from app.models.inquiry import EventInquiry, InquiryReply, InquiryStatusEnum
from app.models.user import User
from app.models.role import Role
from app.models.ai_log import AILog
from app.services.gemini_service import gemini_service, GeminiGenerationResult
from app.services.pii_masker import pii_masker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Attendee AI Chatbot"])


# ── Request / Response Schemas ──────────────────────────────────────────────

class AttendeeChatRequest(BaseModel):
    event_id: int = Field(default=1, description="ID của sự kiện đang diễn ra")
    question: str = Field(..., min_length=2, description="Câu hỏi ngôn ngữ tự nhiên từ khách tham dự")
    session_id: Optional[str] = Field(None, description="ID phiên chat của khách")


class AttendeeChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    is_fallback: bool = False
    ai_category: str = "GENERAL"


# ── Knowledge Base Seeding ──────────────────────────────────────────────────

DEFAULT_KNOWLEDGE_SEEDS = [
    {
        "title": "Lịch trình & Thời gian Sự kiện EventHub AI Summit 2026",
        "content": (
            "Hội thảo quốc tế EventHub AI Summit 2026 diễn ra trong 2 ngày: "
            "Ngày 1 (15/10/2026) với chủ đề Keynote & Core AI, bắt đầu từ 08:00 AM đến 17:30 PM. "
            "Ngày 2 (16/10/2026) với chủ đề Advanced Applications & Gala Networking, từ 08:30 AM đến 17:00 PM. "
            "Phiên khai mạc chính thức diễn ra lúc 08:30 AM tại Hội trường Grand Ballroom A."
        ),
    },
    {
        "title": "Địa điểm, Sơ đồ Hội trường & Bãi đỗ xe",
        "content": (
            "Sự kiện được tổ chức tại Trung tâm Hội nghị GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh. "
            "Bãi đỗ xe ô tô đặt tại tầng hầm B2 và B3, miễn phí gửi xe cho khách có thẻ VIP và Speaker. "
            "Khách đi xe máy gửi tại sảnh sau. "
            "Hội trường chính Grand Ballroom A tại tầng 3, Grand Ballroom B tại tầng 4, "
            "phòng Workshop B1 tại tầng 2, và sảnh Gala Networking tại tầng 5."
        ),
    },
    {
        "title": "Quy trình Soát vé & Hướng dẫn Check-in QR",
        "content": (
            "Khách tham dự chỉ cần mở mã vé điện tử QR Code trên điện thoại và quét tại Cổng A (Sảnh chính) "
            "hoặc Cổng B. Hệ thống camera scanner tự động nhận diện và hoàn tất check-in trong 3 giây. "
            "Sau khi soát vé thành công, khách nhận thẻ đeo All-Access Pass và quà tặng lưu niệm tại quầy Welcome Desk."
        ),
    },
    {
        "title": "Dịch vụ Ăn uống, Teabreak & Kết nối WiFi",
        "content": (
            "Ban tổ chức phục vụ 2 đợt tiệc Teabreak bánh ngọt và cà phê: buổi sáng lúc 10:00 AM "
            "và buổi chiều lúc 03:00 PM tại sảnh sảnh tầng 3. "
            "Khách sở hữu vé VIP và Diễn giả được phục vụ tiệc trưa Buffet tại nhà hàng tầng 5. "
            "WiFi sự kiện miễn phí tốc độ cao tên: EventHub_VIP_Guest, mật khẩu: EventHub2026!."
        ),
    },
    {
        "title": "Diễn giả Nổi bật & Phiên Diễn thuyết",
        "content": (
            "Diễn giả chính phiên Keynote là TS. Nguyễn Văn Hùng (AI Research Lead @ EventHub AI) "
            "với chủ đề Kỷ Nguyên AI trong Quản Trị Sự Kiện 2026. "
            "ThS. Trần Thị Minh (Senior Cloud Architect @ TechCorp) chủ trì workshop RAG pgvector lúc 10:00 AM. "
            "Tọa đàm Tự động hóa Check-in QR do chuyên gia Lê Hoàng Nam điều phối lúc 01:30 PM."
        ),
    },
    {
        "title": "Hướng dẫn sử dụng tính năng Soát vé QR & Điểm danh",
        "content": (
            "Để soát vé khách tham dự bằng QR Code: 1. Truy cập vào menu 'Quản lý Đăng ký' (Registrations). "
            "2. Bấm vào nút 'Quét mã QR' hoặc sử dụng ô tìm kiếm để nhập mã vé. "
            "3. Hệ thống sẽ hiển thị thông tin vé, bấm 'Check-in' để xác nhận khách đã đến. "
            "Truy cập nhanh: [Quản lý Đăng ký](/registrations)"
        ),
    },
    {
        "title": "Hướng dẫn sử dụng AI PR Studio (Tạo Content & Email AI)",
        "content": (
            "EventHub tích hợp AI PR Studio giúp bạn tự động viết bài PR, Email Marketing và bài đăng mạng xã hội. "
            "1. Truy cập 'AI PR Studio' từ thanh menu bên trái. 2. Chọn loại nội dung cần tạo (VD: Email mời, Bài đăng Facebook). "
            "3. Nhập từ khóa hoặc bối cảnh và bấm 'Tạo nội dung'. AI sẽ tự động sinh văn bản chuyên nghiệp. "
            "Truy cập nhanh: [AI PR Studio](/pr-studio)"
        ),
    },
    {
        "title": "Hướng dẫn Đổi ngôn ngữ (Tiếng Việt / Tiếng Anh)",
        "content": (
            "Để thay đổi ngôn ngữ trên hệ thống EventHub: "
            "Nhìn lên thanh Header góc trên cùng bên phải, bấm vào biểu tượng cờ hoặc nút chọn ngôn ngữ (VI/EN) "
            "để chuyển đổi giữa Tiếng Việt và Tiếng Anh. Lựa chọn của bạn sẽ được lưu lại. "
            "Truy cập nhanh: Giao diện Header"
        ),
    },
    {
        "title": "Hướng dẫn Quản trị Tài khoản & Phân quyền",
        "content": (
            "Để quản lý người dùng và phân quyền: 1. Truy cập menu 'Người Dùng' (User Management). "
            "2. Tại đây bạn có thể thêm tài khoản mới, phân quyền Admin, Manager hoặc Staff. "
            "3. Bấm vào icon sửa để cập nhật thông tin hoặc đổi mật khẩu cho User. "
            "Truy cập nhanh: [Quản lý Người Dùng](/users)"
        ),
    },
    {
        "title": "Hướng dẫn Thêm / Sửa / Xóa Sự kiện và Ca diễn thuyết",
        "content": (
            "Quản lý sự kiện: 1. Truy cập 'Danh sách Sự kiện' hoặc trang chi tiết sự kiện. "
            "2. Bấm nút [+ Thêm Phiên Mới] để tạo ca diễn thuyết. 3. Để sửa hoặc xóa, bấm vào icon dấu 3 chấm (⋮) "
            "trên thẻ sự kiện/phiên và chọn 'Chỉnh sửa' hoặc 'Xóa'. "
            "Truy cập nhanh: [Bảng Điều Khiển Sự Kiện](/dashboard)"
        ),
    }
]


async def ensure_knowledge_base_seeded(db: AsyncSession, event_id: int):
    """Seed initial knowledge chunks with embeddings if none exist for this event."""
    stmt = select(KnowledgeBase).where(KnowledgeBase.event_id == event_id)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if not existing:
        for seed in DEFAULT_KNOWLEDGE_SEEDS:
            emb = await gemini_service.generate_embedding(seed["content"])
            item = KnowledgeBase(
                event_id=event_id,
                title=seed["title"],
                content=seed["content"],
                embedding=emb,
            )
            db.add(item)
        try:
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to commit knowledge seeds: {e}")
            await db.rollback()


async def get_or_create_guest_user(db: AsyncSession) -> User:
    """Ensure a guest participant exists in DB to associate with fallback inquiries."""
    stmt = select(User).where(User.email == "guest.attendee@eventhub.ai")
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if user:
        return user

    # Check any existing user
    stmt_any = select(User)
    res_any = await db.execute(stmt_any)
    any_user = res_any.scalars().first()
    if any_user:
        return any_user

    # Find role
    res_role = await db.execute(select(Role))
    role = res_role.scalars().first()
    role_id = role.id if role else 1

    guest = User(
        email="guest.attendee@eventhub.ai",
        full_name="Khách Tham Dự (AI Chatbot)",
        hashed_password="guest_unauthenticated",
        role_id=role_id,
    )
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    return guest


def classify_inquiry_category(question: str) -> str:
    q_lower = question.lower()
    if any(w in q_lower for w in ["vé", "ticket", "qr", "check-in", "quét mã", "soát vé"]):
        return "TICKETING"
    elif any(w in q_lower for w in ["đỗ xe", "bãi xe", "gửi xe", "vị trí", "địa điểm", "ở đâu", "đường đi", "cổng", "sơ đồ", "bản đồ", "maps"]):
        return "LOGISTICS"
    elif any(w in q_lower for w in ["thời gian", "lịch trình", "mấy giờ", "khi nào", "bắt đầu", "kết thúc", "agenda", "hôm nay", "ngày mấy", "chiều nay", "sáng nay"]):
        return "SCHEDULE"
    elif any(w in q_lower for w in ["diễn giả", "speaker", "khách mời", "chủ trì", "mc", "tiến sĩ", "chuyên gia"]):
        return "SPEAKERS"
    elif any(w in q_lower for w in ["ăn", "uống", "tiệc", "teabreak", "lunch", "wifi", "mật khẩu", "ssid"]):
        return "SERVICES"
    elif any(w in q_lower for w in ["hướng dẫn", "cách", "làm sao", "làm thế nào", "tính năng", "soát vé", "pr studio", "ngôn ngữ", "tài khoản", "thêm sự kiện", "xóa sự kiện", "chỉnh sửa"]):
        return "SYSTEM_FEATURE"
    return "GENERAL"


# ── Chatbot Endpoint ────────────────────────────────────────────────────────

@router.post("/attendee", response_model=AttendeeChatResponse)
async def chat_with_attendee_bot(
    payload: AttendeeChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Public Attendee AI Chatbot Endpoint (Task 14 + Task 15 Enhanced):
    - Đồng bộ Múi giờ Việt Nam (Asia/Ho_Chi_Minh - Real-time VN Time).
    - Văn phong tự nhiên, lịch thiệp, không rập khuôn hay lặp lại câu hỏi.
    - Đính kèm link Google Maps có thể click được khi hỏi về địa điểm/đường đi.
    - Tích hợp tri thức mở / tra cứu LLM để giải thích các khái niệm chủ đề trong phiên.
    - (Task 15) Session Direct-Match: Khi query khớp tên phiên trong DB, trả về đầy đủ ngay.
    """
    raw_question = payload.question.strip()
    event_id = payload.event_id

    # 1. PII Masking
    pii_res = pii_masker.mask_all(raw_question)
    masked_q = pii_res.masked_text
    category = classify_inquiry_category(raw_question)

    # 2. Đồng bộ Múi giờ thực tế Việt Nam (UTC+7)
    try:
        vn_tz = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")
        vn_now = datetime.now(vn_tz)
    except Exception:
        vn_now = datetime.now(timezone(timedelta(hours=7)))

    weekday_map = {
        0: "Thứ Hai", 1: "Thứ Ba", 2: "Thứ Tư", 3: "Thứ Năm",
        4: "Thứ Sáu", 5: "Thứ Bảy", 6: "Chủ Nhật"
    }
    current_weekday = weekday_map.get(vn_now.weekday(), "Hôm nay")
    current_vn_time_str = f"{current_weekday}, ngày {vn_now.strftime('%d/%m/%Y')} lúc {vn_now.strftime('%H:%M:%S')} (Giờ Việt Nam UTC+7)"

    # 3. Lấy thông tin Event & Schedules từ Database
    event_stmt = select(Event).where(Event.id == event_id)
    res_ev = await db.execute(event_stmt)
    active_event = res_ev.scalar_one_or_none()

    sched_stmt = (
        select(EventSchedule)
        .where(EventSchedule.event_id == event_id)
        .order_by(EventSchedule.day_number, EventSchedule.id)
    )
    res_sc = await db.execute(sched_stmt)
    event_schedules = res_sc.scalars().all()

    # Tạo link Google Maps
    maps_url = ""
    if active_event and active_event.google_maps_url:
        maps_url = active_event.google_maps_url
    else:
        loc_str = (active_event.location_address or active_event.location if active_event else "GEM Center TP Hồ Chí Minh")
        maps_url = f"https://maps.google.com/maps?q={loc_str.replace(' ', '+')}&t=&z=16&ie=UTF8&iwloc=&output=embed"

    # Định dạng thông tin sự kiện
    event_context_info = (
        f"- Tên sự kiện: {active_event.title if active_event else 'EventHub AI Summit 2026'}\n"
        f"- Địa điểm: {active_event.location if active_event else 'GEM Center, TP. Hồ Chí Minh'}\n"
        f"- Địa chỉ chi tiết: {active_event.location_address if active_event and active_event.location_address else 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh'}\n"
        f"- Đường dẫn Google Maps: {maps_url}\n"
        f"- Thời gian tổ chức: {active_event.start_date or active_event.start_time if active_event else '15-16/10/2026'}\n"
        f"- WiFi sự kiện: SSID '{getattr(active_event, 'wifi_name', None) or 'EventHub_VIP_Guest'}' (Mật khẩu: '{getattr(active_event, 'wifi_password', None) or 'EventHub2026!'}')"
    )

    # Định dạng lịch trình các phiên
    schedule_lines = []
    for s in event_schedules:
        schedule_lines.append(
            f"• [{s.start_date or s.date_label} | {s.start_time} - {s.end_time}]: '{s.title}' "
            f"tại {s.room_location}. Diễn giả: {s.speaker_name}{f' ({s.speaker_role})' if s.speaker_role else ''}. "
            f"Chủ đề/Track: {s.track}. Mô tả: {s.description or 'Phiên chia sẻ chuyên sâu.'}"
        )
    schedule_context_info = "\n".join(schedule_lines) if schedule_lines else "Lịch trình 2 ngày: 15/10/2026 (Keynote & Core AI) và 16/10/2026 (Advanced Applications)."

    # 3.5 Session Direct-Match: Ưu tiên khớp tên phiên TRỰC TIẾP trong DB trước RAG
    # Tránh hoàn toàn fallback chung chung khi dữ liệu phiên đã có trong CSDL
    q_lower = raw_question.lower()
    matched_sessions = []
    for s in event_schedules:
        s_title_lower = (s.title or "").lower()
        s_speaker_lower = (s.speaker_name or "").lower()
        # Khớp nếu ít nhất 3 ký tự liên tiếp của tên phiên có trong query, hoặc toàn bộ từ khóa quan trọng
        title_words = [w for w in s_title_lower.split() if len(w) >= 4]
        speaker_words = [w for w in s_speaker_lower.split() if len(w) >= 3]
        title_match = (s_title_lower and s_title_lower in q_lower) or (any(w in q_lower for w in title_words) if title_words else False)
        speaker_match = (s_speaker_lower and s_speaker_lower in q_lower) or (any(w in q_lower for w in speaker_words) if speaker_words else False)
        room_match = bool(s.room_location and s.room_location.lower() in q_lower)
        if title_match or speaker_match or room_match:
            matched_sessions.append(s)

    print(f"[DEBUG RAG] Câu hỏi: {raw_question}", flush=True)
    print(f"[DEBUG SQL MATCH]: {[s.title for s in matched_sessions]}", flush=True)

    if matched_sessions:
        # Có phiên khớp trực tiếp → Build structured answer, không cần RAG hay Gemini
        answer_parts = []
        for s in matched_sessions[:3]:  # Tối đa 3 phiên
            room_maps = f"https://maps.google.com/maps?q={(s.room_location or '').replace(' ', '+')}+{(active_event.location_address or 'GEM Center').replace(' ', '+')}&z=17" if s.room_location else maps_url
            part = (
                f"**{s.title}**\n"
                f"- 🕐 Thời gian: {s.start_time} – {s.end_time} ({s.start_date or s.date_label or ''})\n"
                f"- 📍 Phòng: {s.room_location or 'Xem lịch trình'}  "
                f"[📍 Xem chỉ đường Google Maps]({room_maps})\n"
                f"- 🎤 Diễn giả: {s.speaker_name or 'Đang cập nhật'}{f' — {s.speaker_role}' if s.speaker_role else ''}\n"
                f"- 📌 Chủ đề: {s.track or 'Tổng hợp'}\n"
                f"- 📝 Mô tả: {s.description or 'Phiên chia sẻ chuyên sâu từ diễn giả hàng đầu.'}"
            )
            answer_parts.append(part)

        answer = "\n\n".join(answer_parts)
        if len(matched_sessions) > 3:
            answer += f"\n\n*...và {len(matched_sessions) - 3} phiên khác. Xem đầy đủ lịch trình trên ứng dụng.*"

        # Log thành công
        try:
            from app.models.ai_log import AILog
            ai_log = AILog(
                task_type="ATTENDEE_CHAT_SESSION_DIRECT_MATCH",
                prompt_tokens=len(raw_question.split()),
                completion_tokens=len(answer.split()),
                latency_ms=0.0,
                staff_action="AUTOMATED"
            )
            db.add(ai_log)
            await db.commit()
        except Exception:
            await db.rollback()

        return AttendeeChatResponse(
            answer=answer,
            sources=[f"DB Session: {s.title}" for s in matched_sessions[:2]],
            is_fallback=False,
            ai_category="SCHEDULE"
        )

    # 4. RAG Vector Search từ KnowledgeBase
    await ensure_knowledge_base_seeded(db, event_id)
    q_embedding = await gemini_service.generate_embedding(masked_q)

    contexts = []
    try:
        stmt = (
            select(
                KnowledgeBase.id,
                KnowledgeBase.title,
                KnowledgeBase.content,
                KnowledgeBase.embedding.cosine_distance(q_embedding).label("distance")
            )
            .where(KnowledgeBase.event_id == event_id)
            .where(KnowledgeBase.embedding.is_not(None))
            .order_by("distance")
            .limit(4)
        )
        result = await db.execute(stmt)
        rows = result.all()
        for r in rows:
            dist = float(r[3]) if r[3] is not None else 1.0
            if dist < 0.85:
                contexts.append({
                    "title": r[1],
                    "content": r[2],
                    "distance": dist
                })
    except Exception as e:
        logger.error(f"Error querying pgvector in attendee chat: {e}")

    rag_knowledge_str = "\n\n".join([f"[{c['title']}]:\n{c['content']}" for c in contexts]) if contexts else ""

    # 5. Xây dựng System Instruction & Prompt cho Gemini
    system_instruction = (
        "Bạn là Lễ tân & Trợ lý Sự kiện Chuyên nghiệp (Event Concierge) tại EventHub AI.\n"
        "Nhiệm vụ của bạn là phục vụ và giải đáp mọi thắc mắc của khách tham dự một cách thông minh, lịch thiệp và hiệu quả nhất.\n\n"
        "QUY TẮC PHẢN HỒI BẮT BUỘC:\n"
        "1. VĂN PHONG CHUYÊN NGHIỆP & TRỰC DIỆN:\n"
        "   - ĐI THẲNG VÀO VẤN ĐỀ. KHÔNG dùng các câu rập khuôn, sáo rỗng như 'Dạ Anh/Chị thân mến, về thắc mắc...', 'Về câu hỏi của bạn...'.\n"
        "   - KHÔNG lặp lại nguyên văn câu hỏi của khách tham dự.\n"
        "   - KHÔNG dùng câu xin lỗi rập khuôn hay hẹn chờ đợi giải quyết.\n"
        "   - Hãy trả lời ngắn gọn, tự nhiên, thân thiện và cô đọng (khoảng 2-5 câu hoặc gạch đầu dòng rõ ràng).\n"
        "   - Cung cấp sẵn các lối tắt (Action Links) như Link Google Maps, Link tới trang chức năng tương ứng.\n\n"
        "2. ĐỒNG BỘ THỜI GIAN THỰC TẾ VIỆT NAM (UTC+7):\n"
        f"   - Mốc thời gian thực hiện tại tại Việt Nam là: {current_vn_time_str}.\n"
        "   - Khi khách hỏi 'Hôm nay ngày mấy?', 'Bây giờ là mấy giờ?', 'Chiều nay / Hôm nay có sự kiện gì?', "
        "hãy dựa vào mốc thời gian thực tế này để đối chiếu với lịch trình sự kiện và trả lời chính xác.\n\n"
        "3. ĐỊA ĐIỂM & ĐÍNH KÈM LINK GOOGLE MAPS KÍCH HOẠT ĐƯỢC:\n"
        "   - Khi khách hỏi về địa điểm, địa chỉ, phòng họp, cách đi lại hay tìm đường: Bạn cung cấp địa chỉ cụ thể và BẮT BUỘC chèn đường link Google Maps có thể click được theo đúng cú pháp markdown sau:\n"
        f"     [📍 Xem chỉ đường Google Maps]({maps_url})\n\n"
        "4. TÍCH HỢP TRI THỨC MỞ & GIẢI THÍCH CHUYÊN MÔN:\n"
        "   - Kết hợp thông tin sự kiện nội bộ (phòng, giờ, diễn giả, wifi) với tri thức sâu rộng của bạn (LLM) để giải thích ngắn gọn, dễ hiểu các khái niệm, chủ đề, công nghệ (VD: RAG, Agentic AI, Cloud Native, IoT...) được đề cập trong các phiên nếu khách hỏi sâu hơn.\n\n"
        "5. HƯỚNG DẪN TÍNH NĂNG HỆ THỐNG:\n"
        "   - Khi người dùng hỏi về cách sử dụng website (đổi ngôn ngữ, tạo sự kiện, soát vé, AI PR Studio...), hãy cung cấp các bước ngắn gọn và BẮT BUỘC chèn đường link chuyển hướng nhanh (Deep link) tới đúng trang chức năng đó dựa theo thông tin trong Cẩm nang.\n\n"
        "6. TRƯỜNG HỢP NGOÀI PHẠM VI:\n"
        "   - Nếu không có thông tin trong CSDL hoặc Cẩm nang, hãy trả lời trung thực và trực diện: 'Hiện chưa có thông tin về vấn đề này.' Không hứa hẹn chuyển thông tin hay dùng câu rập khuôn.\n\n"
        "CẤM TUYỆT ĐỐI:\n"
        "   - Không được lặp lại câu hỏi của khách. Trả lời trực tiếp, đủ thông tin."
    )

    extra_rag_text = f"DỮ LIỆU CẨM NANG BỔ SUNG:\n{rag_knowledge_str}\n\n" if rag_knowledge_str else ""
    prompt = (
        f"THỜI GIAN THỰC HIỆN TẠI (VIỆT NAM): {current_vn_time_str}\n\n"
        f"THÔNG TIN CHUNG SỰ KIỆN:\n{event_context_info}\n\n"
        f"DANH SÁCH CÁC PHIÊN DIỄN THUYẾT & LỊCH TRÌNH:\n{schedule_context_info}\n\n"
        f"{extra_rag_text}"
        f"CÂU HỎI CỦA KHÁCH THAM DỰ: {masked_q}\n\n"
        f"CÂU TRẢ LỜI CỦA BẠN (Tự nhiên, không rập khuôn, chèn link Google Maps nếu hỏi địa điểm):"
    )

    prompt_tokens = len(prompt.split())
    completion_tokens = 0
    latency_ms = 0.0
    answer = ""
    sources = [c["title"] for c in contexts[:2]] if contexts else ["Cơ sở dữ liệu Lịch trình Sự kiện EventHub 2026"]
    is_fallback = False

    try:
        gen_res: GeminiGenerationResult = await gemini_service.generate_draft_answer(
            prompt=prompt,
            system_instruction=system_instruction,
            timeout_seconds=18.0
        )
        answer = gen_res.text.strip() if gen_res and gen_res.text else ""
        prompt_tokens = gen_res.prompt_tokens
        completion_tokens = gen_res.completion_tokens
        latency_ms = gen_res.latency_ms

        if not answer or gen_res.is_fallback:
            is_fallback = True
    except Exception as err:
        logger.warning(f"Gemini chat error: {err}, activating intelligent fallback.")
        is_fallback = True

    # Fallback tự nhiên nếu model lỗi
    if is_fallback or not answer:
        q_low = raw_question.lower()
        if any(w in q_low for w in ["hôm nay", "ngày mấy", "mấy giờ", "bây giờ", "chiều nay", "sáng nay", "thời gian", "lịch"]):
            answer = (
                f"Hôm nay là **{current_vn_time_str}**.\n\n"
                f"Sự kiện **{active_event.title if active_event else 'EventHub AI Summit 2026'}** diễn ra từ {active_event.start_date or '15/10/2026'} đến {active_event.end_date or '16/10/2026'}. "
                f"Các phiên diễn thuyết chính thức bắt đầu từ 08:30 AM tại sảnh Grand Ballroom A. Bạn có thể xem lịch trình chi tiết trên bảng kế hoạch sự kiện!"
            )
            is_fallback = False
        elif any(w in q_low for w in ["địa điểm", "ở đâu", "địa chỉ", "đường đi", "bãi xe", "gửi xe", "sơ đồ", "maps"]):
            answer = (
                f"Sự kiện được tổ chức tại **{active_event.location if active_event else 'GEM Center'}** "
                f"(Địa chỉ: {active_event.location_address if active_event and active_event.location_address else 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh'}).\n\n"
                f"Quý khách có thể xem chỉ đường trực tiếp tại: [📍 Xem chỉ đường Google Maps]({maps_url}).\n"
                f"Bãi đỗ xe ô tô tại tầng hầm B2 và B3 (miễn phí cho vé VIP & Speaker), xe máy gửi tại sảnh sau."
            )
            is_fallback = False
        elif any(w in q_low for w in ["wifi", "mật khẩu", "pass", "ssid"]):
            wifi_name = active_event.wifiName if active_event else "EventHub_VIP_Guest"
            wifi_pass = active_event.wifiPassword if active_event else "EventHub2026!"
            answer = (
                f"Thông tin kết nối WiFi sự kiện:\n"
                f"- **Tên mạng (SSID):** `{wifi_name}`\n"
                f"- **Mật khẩu:** `{wifi_pass}`\n\n"
                f"Ngoài ra, các phòng hội trường chính (Grand Ballroom A, B, Workshop B1) đều có sóng WiFi riêng tốc độ cao."
            )
            is_fallback = False
        else:
            answer = "Hiện chưa có thông tin về vấn đề này."
            is_fallback = True

    # Nếu câu trả lời là fallback không biết -> ghi nhận HITL Inquiry
    if is_fallback or "chưa có thông tin chính thức" in answer.lower():
        try:
            guest_user = await get_or_create_guest_user(db)
            inquiry = EventInquiry(
                event_id=event_id,
                participant_id=guest_user.id,
                question=raw_question,
                ai_category=category,
                status=InquiryStatusEnum.AI_SUGGESTED.value
            )
            db.add(inquiry)
            await db.flush()

            draft_reply = InquiryReply(
                inquiry_id=inquiry.id,
                sender_id=guest_user.id,
                content="[Khách hỏi qua AI Concierge cần giải đáp]: " + raw_question,
                is_ai_generated=True,
                edited_by_staff=False
            )
            db.add(draft_reply)

            ai_log = AILog(
                task_type="ATTENDEE_CHAT_FALLBACK",
                prompt_tokens=prompt_tokens,
                completion_tokens=20,
                latency_ms=latency_ms,
                staff_action="PENDING"
            )
            db.add(ai_log)
            await db.commit()
            logger.info(f"Created HITL inquiry #{inquiry.id} from attendee chat fallback.")
        except Exception as e:
            logger.error(f"Failed to auto-create inquiry on fallback: {e}")
            await db.rollback()
    else:
        try:
            ai_log = AILog(
                task_type="ATTENDEE_CHAT_SUCCESS",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
                staff_action="AUTOMATED"
            )
            db.add(ai_log)
            await db.commit()
        except Exception:
            await db.rollback()

    return AttendeeChatResponse(
        answer=answer,
        sources=sources,
        is_fallback=is_fallback,
        ai_category=category
    )

