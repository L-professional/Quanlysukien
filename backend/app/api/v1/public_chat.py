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
from app.core.security import get_current_user_optional, get_user_role_name
from app.services.gemini_service import gemini_service, GeminiGenerationResult
from app.services.pii_masker import pii_masker
from app.services.ai_copilot_service import ai_copilot_service, normalize_copilot_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Attendee AI Chatbot"])


# ── Request / Response Schemas ──────────────────────────────────────────────

class AttendeeChatRequest(BaseModel):
    event_id: Optional[int] = Field(default=None, description="ID của sự kiện cụ thể nếu đang ở trang chi tiết sự kiện")
    question: Optional[str] = Field(default=None, description="Câu hỏi ngôn ngữ tự nhiên từ người dùng")
    message: Optional[str] = Field(default=None, description="Alias cho question để tương thích đa giao thức")
    session_id: Optional[str] = Field(None, description="ID phiên chat của khách")
    user_id: Optional[int] = Field(None, description="ID người dùng gửi câu hỏi")
    role: Optional[str] = Field(None, description="Vai trò của người dùng: ADMIN, MANAGER, SPEAKER, STAFF, ATTENDEE")
    history: Optional[List[dict]] = Field(default=[], description="Lịch sử hội thoại đa lượt")
    current_system_time: Optional[str] = Field(None, description="Mốc thời gian hệ thống được tiêm động (Asia/Ho_Chi_Minh)")


class AttendeeChatResponse(BaseModel):
    answer: str
    suggested_questions: List[str] = Field(default_factory=list, description="3 câu hỏi gợi ý thông minh chuẩn Gemini-style")
    sources: List[str] = []
    is_fallback: bool = False
    ai_category: str = "GENERAL"
    action_links: Optional[List[dict]] = None
    is_escalated_to_staff: Optional[bool] = False



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
@router.post("", response_model=AttendeeChatResponse)
@router.post("/public", response_model=AttendeeChatResponse)
async def chat_with_attendee_bot(
    payload: AttendeeChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Autonomous AI Copilot Endpoint (Task 91 & Task 101):
    - Hybrid Agent: PostgreSQL Real-Time Database Tools + pgvector RAG
    - Redis Semantic Cache for sub-5ms responses on repeated/semantic queries
    - Strict AI-Level RBAC Guardrails (Admin, Manager, Speaker, Staff, Attendee)
    - Multi-turn conversation memory support
    - Gemini-style Suggestion Chips (suggested_questions)
    - Smart Action Widgets for internal links and maps
    """
    raw_question = (payload.question or payload.message or "").strip()
    if len(raw_question) < 2:
        return AttendeeChatResponse(
            answer="Xin chào bạn! Tôi là Trợ Lý AI Toàn Năng EventHub. Bạn cần hỗ trợ thông tin gì về sự kiện hôm nay?",
            suggested_questions=[
                "🔴 Sự kiện nào đang diễn ra hôm nay?",
                "📅 Xem danh mục sự kiện sắp diễn ra?",
                "🎟️ Các phân hạng vé hiện có trong hệ thống?"
            ],
            sources=["EventHub AI Assistant"],
            is_fallback=False,
            ai_category="GENERAL",
            action_links=[
                {"label": "🔗 Danh mục sự kiện", "url": "/events"},
                {"label": "🎟️ Vé của tôi", "url": "/registrations"},
            ]
        )

    event_id = payload.event_id

    # 1. PII Masking
    pii_res = pii_masker.mask_all(raw_question)
    masked_q = pii_res.masked_text
    category = classify_inquiry_category(raw_question)

    # 2. Determine User & Role Context
    user_id = payload.user_id
    role_name = payload.role or "ATTENDEE"

    if current_user:
        user_id = current_user.id
        role_name = await get_user_role_name(current_user, db)

    role_name = normalize_copilot_role(role_name)

    # Ensure knowledge base seeded for RAG if specific event provided
    if event_id is not None:
        try:
            await ensure_knowledge_base_seeded(db, event_id)
        except Exception as e:
            logger.warning(f"Knowledge seed check failed: {e}")

    # 3. Execute Autonomous Copilot
    copilot_result = await ai_copilot_service.execute_copilot(
        db=db,
        question=masked_q,
        event_id=event_id,
        user_id=user_id,
        user_role=role_name,
        history=payload.history,
        current_system_time=payload.current_system_time
    )

    answer = copilot_result["answer"]
    suggested_questions = copilot_result.get("suggested_questions", [])
    sources = copilot_result.get("sources", [])
    is_fallback = copilot_result.get("is_fallback", False)
    ai_category = copilot_result.get("ai_category", category)
    action_links = copilot_result.get("action_links", [])
    is_escalated_to_staff = copilot_result.get("is_escalated_to_staff", False)

    # 4. Audit Log
    try:
        ai_log = AILog(
            task_type="AI_COPILOT_CHAT",
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
        suggested_questions=suggested_questions,
        sources=sources,
        is_fallback=is_fallback,
        ai_category=ai_category,
        action_links=action_links,
        is_escalated_to_staff=is_escalated_to_staff
    )


# ── AI Route Alias Router (Task 101) ─────────────────────────────────────────

ai_chat_router = APIRouter(prefix="/ai", tags=["AI Copilot Chat"])


@ai_chat_router.post("/chat", response_model=AttendeeChatResponse)
async def ai_chat_post_endpoint(
    payload: AttendeeChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Alias for /app/api/ai/chat and /api/ai/chat endpoint."""
    return await chat_with_attendee_bot(payload=payload, db=db, current_user=current_user)


@ai_chat_router.get("/chat")
async def ai_chat_get_endpoint():
    """Health & Capability Discovery for AI Chat Endpoint."""
    return {
        "status": "online",
        "service": "EventHub AI Copilot & Hybrid RAG Engine",
        "version": "2.0.0",
        "features": [
            "Dense+Sparse pgvector Hybrid Search",
            "Redis Semantic Cache (<5ms)",
            "Gemini-style Suggestion Chips",
            "Anti-Hallucination Guardrails"
        ]
    }


