from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.inquiry import EventInquiry, InquiryReply, InquiryStatusEnum
from app.models.event import Event
from app.models.user import User
from app.models.ai_log import AILog
from app.schemas.inquiry import (
    InquiryCreate,
    InquiryResponse,
    InquiryReplyResponse,
    InquiryReviewRequest,
    InquiryReviewResponse,
    ReviewActionEnum,
    QuickPromptRequest,
    QuickPromptResponse,
    BatchReviewRequest,
    BatchReviewResponse,
)
from app.services.rag_engine import rag_engine
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/inquiries", tags=["Inquiries (HITL)"])


@router.post("", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
async def create_inquiry(
    payload: InquiryCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Participant submits a new inquiry.
    The system executes the RAG pipeline (PII Masking -> pgvector search -> Gemini draft),
    creates an inquiry record with status AI_SUGGESTED, and attaches an AI draft reply.
    """
    # 1. Validate event existence
    event = await db.get(Event, payload.event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sự kiện có ID {payload.event_id} không tồn tại."
        )

    # 2. Validate participant existence
    participant = await db.get(User, payload.participant_id)
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Người tham dự có ID {payload.participant_id} không tồn tại."
        )

    # 3. Execute RAG Pipeline with Gemini + pgvector
    rag_result = await rag_engine.generate_rag_response(
        db=db,
        event_id=payload.event_id,
        raw_question=payload.question
    )

    # 4. Save Inquiry
    inquiry = EventInquiry(
        event_id=payload.event_id,
        participant_id=payload.participant_id,
        question=payload.question,
        ai_category=rag_result.ai_category,
        status=InquiryStatusEnum.AI_SUGGESTED.value
    )
    db.add(inquiry)
    await db.flush()

    # 5. Save AI Draft Reply
    draft_reply = InquiryReply(
        inquiry_id=inquiry.id,
        sender_id=payload.participant_id,
        content=rag_result.draft_reply,
        is_ai_generated=True,
        edited_by_staff=False
    )
    db.add(draft_reply)

    # 6. Audit Log for AI Generation
    ai_log = AILog(
        task_type="RAG_QUERY",
        prompt_tokens=rag_result.prompt_tokens,
        completion_tokens=rag_result.completion_tokens,
        latency_ms=rag_result.latency_ms,
        staff_action="PENDING"
    )
    db.add(ai_log)

    await db.commit()

    # Reload with replies relation
    stmt = (
        select(EventInquiry)
        .where(EventInquiry.id == inquiry.id)
        .options(selectinload(EventInquiry.replies))
    )
    res = await db.execute(stmt)
    saved_inquiry = res.scalar_one()
    return saved_inquiry


@router.get("", response_model=List[InquiryResponse])
async def list_inquiries(
    event_id: Optional[int] = Query(None, description="Lọc theo ID sự kiện"),
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve inquiries with optional filtering by event_id and status.
    Useful for Staff dashboards to fetch questions needing review (status=AI_SUGGESTED or PENDING).
    """
    stmt = select(EventInquiry).options(selectinload(EventInquiry.replies)).order_by(EventInquiry.id.desc())

    if event_id is not None:
        stmt = stmt.where(EventInquiry.event_id == event_id)
    if status_filter is not None:
        stmt = stmt.where(EventInquiry.status == status_filter)

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{inquiry_id}", response_model=InquiryResponse)
async def get_inquiry_detail(
    inquiry_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information of a specific inquiry along with its replies."""
    stmt = (
        select(EventInquiry)
        .where(EventInquiry.id == inquiry_id)
        .options(selectinload(EventInquiry.replies))
    )
    result = await db.execute(stmt)
    inquiry = result.scalar_one_or_none()

    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thắc mắc có ID {inquiry_id}."
        )

    return inquiry


@router.post("/{inquiry_id}/review", response_model=InquiryReviewResponse)
async def review_inquiry(
    inquiry_id: int,
    payload: InquiryReviewRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(["ADMIN", "STAFF"])),
):
    """
    Human-in-the-Loop (HITL) Staff Review Endpoint:
    - ACCEPT: Approve AI suggestion without changes.
    - EDIT: Modify AI suggestion with custom staff content.
    - REJECT: Discard AI suggestion.
    Automatically creates audit log in ai_logs.
    """
    # 1. Fetch Staff User
    staff = await db.get(User, payload.staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nhân viên có ID {payload.staff_id} không tồn tại."
        )

    # 2. Fetch Inquiry
    stmt = (
        select(EventInquiry)
        .where(EventInquiry.id == inquiry_id)
        .options(selectinload(EventInquiry.replies))
    )
    result = await db.execute(stmt)
    inquiry = result.scalar_one_or_none()

    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thắc mắc có ID {inquiry_id}."
        )

    # Find existing draft reply
    target_reply: Optional[InquiryReply] = inquiry.replies[0] if inquiry.replies else None

    final_reply_response = None

    # 3. Process Review Action
    if payload.action == ReviewActionEnum.ACCEPT:
        inquiry.status = InquiryStatusEnum.APPROVED.value
        inquiry.assigned_staff_id = payload.staff_id
        if target_reply:
            target_reply.sender_id = payload.staff_id
            final_reply_response = InquiryReplyResponse.model_validate(target_reply)
        message = "Câu trả lời AI đã được duyệt và chấp thuận."

    elif payload.action == ReviewActionEnum.EDIT:
        if not payload.edited_content or not payload.edited_content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bắt buộc phải nhập nội dung câu trả lời (edited_content) khi chọn hành động EDIT."
            )
        inquiry.status = InquiryStatusEnum.APPROVED.value
        inquiry.assigned_staff_id = payload.staff_id

        if target_reply:
            target_reply.content = payload.edited_content.strip()
            target_reply.edited_by_staff = True
            target_reply.sender_id = payload.staff_id
            final_reply_response = InquiryReplyResponse.model_validate(target_reply)
        else:
            new_reply = InquiryReply(
                inquiry_id=inquiry.id,
                sender_id=payload.staff_id,
                content=payload.edited_content.strip(),
                is_ai_generated=False,
                edited_by_staff=True
            )
            db.add(new_reply)
            await db.flush()
            final_reply_response = InquiryReplyResponse.model_validate(new_reply)

        message = "Câu trả lời đã được Staff chỉnh sửa và phê duyệt."

    elif payload.action == ReviewActionEnum.REJECT:
        inquiry.status = InquiryStatusEnum.REJECTED.value
        inquiry.assigned_staff_id = payload.staff_id
        message = "Câu trả lời AI đã bị từ chối."

    # 4. Mandatory Audit Log Entry
    ai_audit_log = AILog(
        task_type="HITL_REVIEW",
        prompt_tokens=0,
        completion_tokens=len(payload.edited_content.split()) if payload.edited_content else 0,
        latency_ms=0.0,
        staff_action=payload.action.value
    )
    db.add(ai_audit_log)

    await db.commit()

    return InquiryReviewResponse(
        message=message,
        inquiry_id=inquiry.id,
        status=inquiry.status,
        staff_action=payload.action.value,
        dispatch_channel=payload.channel or "EMAIL",
        final_reply=final_reply_response
    )


@router.post("/quick-prompt", response_model=QuickPromptResponse)
async def quick_prompt_assistant(
    payload: QuickPromptRequest,
    _: User = Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"])),
):
    """
    AI Prompt Assistant for Concierge replies:
    - TRANSLATE: Translate between Vietnamese and English
    - REWRITE_ENGAGING: Rewrite with polite, structured, visually appealing style
    - INSERT_INFO: Append WiFi and venue location information
    """
    prompt_type = payload.prompt_type.upper()
    text = payload.text.strip()

    if prompt_type == "INSERT_INFO":
        info_block = (
            "\n\n---\n"
            "📍 Vị trí: Tầng 1 (Hội trường Chính) & Tầng 2 (VIP Lounge, Khu Teabreak).\n"
            "📶 WiFi Sự Kiện: EventHub_VIP_Guest | Mật khẩu: summit2026!\n"
            "⏰ Thời gian hoạt động: 08:00 - 17:30 hàng ngày."
        )
        return QuickPromptResponse(
            result=f"{text}{info_block}",
            prompt_type=prompt_type,
        )

    elif prompt_type == "TRANSLATE":
        sys_instruct = (
            "You are an expert bilingual event translator. "
            "If the input text is primarily Vietnamese, translate it accurately into clear, professional, warm English. "
            "If the input text is English, translate it into polite Vietnamese (Kính gửi quý khách / Xin chào...). "
            "Return ONLY the translated text without introductory remarks."
        )
        try:
            res = await gemini_service.generate_draft_answer(
                prompt=f"Translate this event concierge message:\n\n{text}",
                system_instruction=sys_instruct
            )
            translated = res.text.strip() if res and res.text else ""
            if not translated or res.is_fallback:
                translated = (
                    f"{text}\n\n[EN Translation]:\n"
                    f"Thank you for contacting EventHub AI support. Please let us know if you need any further assistance!"
                )
            return QuickPromptResponse(result=translated, prompt_type=prompt_type)
        except Exception:
            return QuickPromptResponse(
                result=f"{text}\n\n[EN Translation]: Thank you for contacting EventHub AI support.",
                prompt_type=prompt_type,
            )

    elif prompt_type == "REWRITE_ENGAGING":
        sys_instruct = (
            "Bạn là chuyên viên chăm sóc khách hàng cao cấp tại hội nghị công nghệ EventHub AI. "
            "Hãy viết lại câu trả lời sau đây sao cho: "
            "1. Lịch sự, thân thiện, tràn đầy năng lượng tích cực. "
            "2. Trực quan với gạch đầu dòng rõ ràng hoặc emoji phù hợp. "
            "3. Ngắn gọn, súc tích, giữ nguyên các mốc thời gian, địa điểm, số liệu quan trọng. "
            "Trả về CHỈ nội dung văn bản hoàn chỉnh."
        )
        try:
            res = await gemini_service.generate_draft_answer(
                prompt=f"Viết lại câu trả lời này trực quan và hấp dẫn hơn:\n\n{text}",
                system_instruction=sys_instruct
            )
            rewritten = res.text.strip() if res and res.text else ""
            if not rewritten or res.is_fallback:
                rewritten = (
                    f"✨ Xin chào Quý khách!\n\n"
                    f"{text}\n\n"
                    f"👉 Nếu Quý khách cần hỗ trợ thêm thông tin gì khác, đừng ngần ngại nhắn lại cho Ban Tổ Chức nhé! Chúc Quý khách có một ngày trải nghiệm tuyệt vời tại sự kiện! 🎉"
                )
            return QuickPromptResponse(result=rewritten, prompt_type=prompt_type)
        except Exception:
            return QuickPromptResponse(
                result=f"✨ Xin chào Quý khách!\n\n{text}\n\nChúc Quý khách có trải nghiệm tuyệt vời tại sự kiện! 🎉",
                prompt_type=prompt_type,
            )

    return QuickPromptResponse(result=text, prompt_type=prompt_type)


@router.post("/batch-review", response_model=BatchReviewResponse)
async def batch_review_inquiries(
    payload: BatchReviewRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(["ADMIN", "STAFF"])),
):
    """
    Batch review and approve/reject multiple inquiries at once (e.g. RAG similarity > 90% or selected).
    """
    if not payload.inquiry_ids:
        return BatchReviewResponse(approved_count=0, rejected_count=0, message="Không có yêu cầu nào được chọn.")

    stmt = (
        select(EventInquiry)
        .where(EventInquiry.id.in_(payload.inquiry_ids))
        .options(selectinload(EventInquiry.replies))
    )
    result = await db.execute(stmt)
    inquiries = result.scalars().all()

    approved_count = 0
    rejected_count = 0

    for inquiry in inquiries:
        inquiry.assigned_staff_id = payload.staff_id
        if payload.action == ReviewActionEnum.ACCEPT:
            inquiry.status = InquiryStatusEnum.APPROVED.value
            if inquiry.replies:
                inquiry.replies[0].sender_id = payload.staff_id
            approved_count += 1
        elif payload.action == ReviewActionEnum.REJECT:
            inquiry.status = InquiryStatusEnum.REJECTED.value
            rejected_count += 1

    ai_audit_log = AILog(
        task_type="BATCH_HITL_REVIEW",
        prompt_tokens=0,
        completion_tokens=0,
        latency_ms=0.0,
        staff_action=f"BATCH_{payload.action.value}_{len(payload.inquiry_ids)}"
    )
    db.add(ai_audit_log)
    await db.commit()

    return BatchReviewResponse(
        approved_count=approved_count,
        rejected_count=rejected_count,
        message=f"Đã duyệt thành công {approved_count} yêu cầu qua kênh {payload.channel or 'EMAIL'}."
    )

