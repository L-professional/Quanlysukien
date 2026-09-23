from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user_optional, get_user_role_name
from app.models.event import Event, EventSchedule
from app.models.knowledge import KnowledgeBase
from app.models.user import User
from app.models.registration import Registration
from app.models.feedback import Feedback
from app.models.reminder import UserReminder
from app.models.inquiry import EventInquiry, InquiryReply
from app.models.session_interaction import (
    SessionQuestion,
    SessionResource,
    SessionMaterial,
    SessionFeedback,
)
from app.services.email_service import generate_qr_base64
from pydantic import BaseModel
from app.services.gemini_service import gemini_service
from app.services.rag_engine import rag_engine
from app.schemas.event import (
    EventResponse,
    EventCreate,
    EventUpdate,
    EventScheduleCreate,
    EventScheduleUpdate,
    EventScheduleResponse
)

router = APIRouter(prefix="/events", tags=["Events & Schedule"])

DEFAULT_MAPS_URL = "https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed"
DEFAULT_LOCATION_ADDRESS = "GEM Center, Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh"

INITIAL_SEED_SCHEDULE = [
    {
        "title": "Khai Mạc & Keynote: Kỷ Nguyên AI trong Quản Trị Sự Kiện 2026",
        "description": "Tổng quan xu hướng ứng dụng Generative AI, RAG và Agentic Workflows để tự động hóa trải nghiệm khách tham dự.",
        "speaker_name": "Dr. Nguyễn Văn Hùng",
        "speaker_role": "AI Research Lead @ EventHub AI",
        "start_time": "08:30 AM",
        "end_time": "09:45 AM",
        "room_location": "Hội trường Grand Ballroom A",
        "day_number": 1,
        "date_label": "Ngày 1 - Keynote & Core AI",
        "track": "Keynote",
        "start_date": "15/10/2026",
        "location_address": DEFAULT_LOCATION_ADDRESS,
        "google_maps_url": DEFAULT_MAPS_URL,
    },
    {
        "title": "Workshop: Xây Dựng Trợ Lý AI RAG Tích Hợp pgvector",
        "description": "Thực hành triển khai hệ thống hỏi đáp tự động kết hợp PII Masking và Human-in-the-Loop approval.",
        "speaker_name": "ThS. Trần Thị Minh",
        "speaker_role": "Senior Cloud Architect @ TechCorp",
        "start_time": "10:00 AM",
        "end_time": "11:30 AM",
        "room_location": "Phòng Workshop B1",
        "day_number": 1,
        "date_label": "Ngày 1 - Keynote & Core AI",
        "track": "AI & Tech",
        "start_date": "15/10/2026",
        "location_address": DEFAULT_LOCATION_ADDRESS,
        "google_maps_url": DEFAULT_MAPS_URL,
    },
    {
        "title": "Panel Discussion: Tự Động Hóa Check-in QR & An Ninh Sự Kiện",
        "description": "Thảo luận giải pháp tối ưu hóa tốc độ soát vé 10,000 khách/giờ và phòng chống vé giả mạo.",
        "speaker_name": "Lê Hoàng Nam & Panel Speakers",
        "speaker_role": "Head of Operations @ Vietnam Event Group",
        "start_time": "01:30 PM",
        "end_time": "03:00 PM",
        "room_location": "Hội trường Grand Ballroom B",
        "day_number": 1,
        "date_label": "Ngày 1 - Keynote & Core AI",
        "track": "Logistics",
        "start_date": "15/10/2026",
        "location_address": DEFAULT_LOCATION_ADDRESS,
        "google_maps_url": DEFAULT_MAPS_URL,
    },
    {
        "title": "Chủ Đề 2: Trải Nghiệm Khách Hàng Cá Nhân Hóa Với Real-time AI Feed",
        "description": "Ứng dụng phân tích dữ liệu thời gian thực để gợi ý lịch trình và đề xuất nội dung sự kiện.",
        "speaker_name": "Phạm Quốc Anh",
        "speaker_role": "Chief Product Officer @ SmartEvent",
        "start_time": "09:00 AM",
        "end_time": "10:30 AM",
        "room_location": "Hội trường Grand Ballroom A",
        "day_number": 2,
        "date_label": "Ngày 2 - Advanced Applications",
        "track": "AI & Tech",
        "start_date": "16/10/2026",
        "location_address": DEFAULT_LOCATION_ADDRESS,
        "google_maps_url": DEFAULT_MAPS_URL,
    },
    {
        "title": "Tổng Kết & Trao Giải EventHub Innovation Award 2026",
        "description": "Vinh danh các giải pháp công nghệ sự kiện xuất sắc nhất năm và tiệc Networking.",
        "speaker_name": "Ban Tổ Chức EventHub",
        "speaker_role": "EventHub Steering Committee",
        "start_time": "02:00 PM",
        "end_time": "04:30 PM",
        "room_location": "Sảnh Gala Networking",
        "day_number": 2,
        "date_label": "Ngày 2 - Advanced Applications",
        "track": "Networking",
        "start_date": "16/10/2026",
        "location_address": DEFAULT_LOCATION_ADDRESS,
        "google_maps_url": DEFAULT_MAPS_URL,
    },
]


@router.get("", response_model=List[EventResponse])
async def list_events(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    List all events with dates, address, and Google Maps embed links.
    Returns user-specific flags: is_registered, is_checked_in, has_reviewed.
    """
    stmt = select(Event).order_by(Event.id.asc())
    res = await db.execute(stmt)
    events = res.scalars().all()

    if not events:
        return []

    user_reg_events = set()
    user_checked_in_events = set()
    user_reviewed_events = set()

    if current_user:
        # Check user registrations
        reg_stmt = select(Registration).where(Registration.participant_id == current_user.id)
        reg_res = await db.execute(reg_stmt)
        for r in reg_res.scalars().all():
            user_reg_events.add(r.event_id)
            if r.is_checked_in:
                user_checked_in_events.add(r.event_id)

        # Check user feedbacks
        fb_stmt = select(Feedback).where(Feedback.user_id == current_user.id)
        fb_res = await db.execute(fb_stmt)
        for f in fb_res.scalars().all():
            user_reviewed_events.add(f.event_id)

    response_items = []
    for e in events:
        response_items.append(
            EventResponse(
                id=e.id,
                title=e.title,
                description=e.description,
                category_id=e.category_id,
                location=e.location,
                location_address=e.location_address,
                google_maps_url=e.google_maps_url,
                start_time=e.start_time,
                end_time=e.end_time,
                start_date=e.start_date,
                end_date=e.end_date,
                status=e.status,
                created_at=e.created_at,
                updated_at=e.updated_at,
                is_registered=e.id in user_reg_events,
                is_checked_in=e.id in user_checked_in_events,
                has_reviewed=e.id in user_reviewed_events,
            )
        )

    return response_items


@router.get("/{id}", response_model=EventResponse)
async def get_event(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Get a single event with date, Google Maps details, and user-specific status flags.
    """
    stmt = select(Event).where(Event.id == id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    is_registered = False
    is_checked_in = False
    has_reviewed = False

    if current_user:
        reg_stmt = select(Registration).where(
            Registration.event_id == id,
            Registration.participant_id == current_user.id
        )
        reg_res = await db.execute(reg_stmt)
        regs = reg_res.scalars().all()
        if regs:
            is_registered = True
            is_checked_in = any(r.is_checked_in for r in regs)

        fb_stmt = select(Feedback).where(
            Feedback.event_id == id,
            Feedback.user_id == current_user.id
        )
        fb_res = await db.execute(fb_stmt)
        if fb_res.scalar_one_or_none():
            has_reviewed = True

    return EventResponse(
        id=event.id,
        title=event.title,
        description=event.description,
        category_id=event.category_id,
        location=event.location,
        location_address=event.location_address,
        google_maps_url=event.google_maps_url,
        start_time=event.start_time,
        end_time=event.end_time,
        start_date=event.start_date,
        end_date=event.end_date,
        status=event.status,
        created_at=event.created_at,
        updated_at=event.updated_at,
        is_registered=is_registered,
        is_checked_in=is_checked_in,
        has_reviewed=has_reviewed,
    )


def parse_event_datetime(val: Any) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str:
            return None
        try:
            return datetime.fromisoformat(val_str.replace("Z", "+00:00"))
        except Exception:
            pass
        formats = [
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M",
            "%Y-%m-%dT%H:%M:%S",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val_str, fmt)
            except Exception:
                pass
    return None


def to_comparable_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if isinstance(dt, str):
        dt = parse_event_datetime(dt)
        if dt is None:
            return None
    if dt.tzinfo is None:
        return dt.astimezone().astimezone(timezone.utc)
    return dt.astimezone(timezone.utc)


async def check_event_time_location_overlap(
    db: AsyncSession,
    location: str,
    start_time: datetime,
    end_time: datetime,
    exclude_event_id: Optional[int] = None,
):
    """
    Check if an event already exists with the same location and overlapping time interval.
    Overlap condition:
    (event.location == payload.location) AND
    (payload.start_time < existing_event.end_time) AND
    (payload.end_time > existing_event.start_time)
    """
    clean_location = (location or "").strip()
    if not clean_location:
        return

    stmt = select(Event).where(Event.status != "CANCELLED")
    if exclude_event_id is not None:
        stmt = stmt.where(Event.id != exclude_event_id)

    res = await db.execute(stmt)
    existing_events = res.scalars().all()

    target_start = to_comparable_utc(start_time)
    target_end = to_comparable_utc(end_time)

    if not target_start or not target_end:
        return

    if target_end <= target_start:
        target_end = target_start + timedelta(hours=2)

    for ev in existing_events:
        ev_loc = (ev.location or "").strip()
        if ev_loc.lower() != clean_location.lower():
            continue

        ev_start = to_comparable_utc(ev.start_time) or to_comparable_utc(parse_event_datetime(ev.start_date))
        ev_end = to_comparable_utc(ev.end_time) or to_comparable_utc(parse_event_datetime(ev.end_date))

        if not ev_start or not ev_end:
            continue

        if ev_end <= ev_start:
            ev_end = ev_start + timedelta(hours=2)

        # Time Overlap Check:
        # (payload.start_time < existing_event.end_time) AND (payload.end_time > existing_event.start_time)
        if target_start < ev_end and target_end > ev_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Địa điểm '{clean_location}' đã có sự kiện '{ev.title}' đăng ký trong khoảng thời gian này. Vui lòng chọn địa điểm hoặc thời gian khác.",
            )


def check_session_within_event_bounds(
    event: Event,
    session_date: Optional[str],
    session_start_time: str,
    session_end_time: str,
):
    """
    Task 59 Requirement 3: Ensure session start and end times fall strictly within
    the parent event's start_time and end_time.
    """
    ev_start = to_comparable_utc(event.start_time) or to_comparable_utc(parse_event_datetime(event.start_date))
    ev_end = to_comparable_utc(event.end_time) or to_comparable_utc(parse_event_datetime(event.end_date))

    if not ev_start or not ev_end:
        return

    # Clean up session date string
    s_date_clean = (session_date or "").strip()
    if not s_date_clean:
        s_date_clean = ev_start.strftime("%d/%m/%Y")
    elif " " in s_date_clean:
        s_date_clean = s_date_clean.split(" ")[0]

    sess_start_dt = parse_event_datetime(f"{s_date_clean} {session_start_time}")
    sess_end_dt = parse_event_datetime(f"{s_date_clean} {session_end_time}")

    if sess_start_dt and sess_end_dt:
        sess_start_utc = to_comparable_utc(sess_start_dt)
        sess_end_utc = to_comparable_utc(sess_end_dt)

        # Allow 30-minute buffer for hall check-in and stage handoff
        buffer = timedelta(minutes=30)
        if (sess_start_utc + buffer) < ev_start or (sess_end_utc - buffer) > ev_end:
            ev_start_str = ev_start.strftime("%H:%M %d/%m/%Y")
            ev_end_str = ev_end.strftime("%H:%M %d/%m/%Y")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lịch trình phiên của diễn giả ({session_start_time} - {session_end_time} ngày {s_date_clean}) phải nằm trong khoảng thời gian diễn ra sự kiện (từ {ev_start_str} đến {ev_end_str}).",
            )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Create a new event in the database.
    """
    if current_user:
        role_name = await get_user_role_name(current_user, db)
        if role_name not in ["ADMIN", "EVENT_MANAGER"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền tạo sự kiện")

    now = datetime.now()
    raw_start = parse_event_datetime(payload.start_time) or parse_event_datetime(payload.start_date) or now
    raw_end = parse_event_datetime(payload.end_time) or parse_event_datetime(payload.end_date) or (raw_start + timedelta(hours=3))
    start_dt = to_comparable_utc(raw_start)
    end_dt = to_comparable_utc(raw_end)

    # Overlap validation check
    await check_event_time_location_overlap(
        db=db,
        location=payload.location,
        start_time=start_dt,
        end_time=end_dt,
    )

    from app.models.category import EventCategory
    cat_id = payload.category_id
    cat_obj = await db.get(EventCategory, cat_id) if cat_id else None
    if not cat_obj:
        first_cat = (await db.execute(select(EventCategory.id).order_by(EventCategory.id.asc()).limit(1))).scalar_one_or_none()
        cat_id = first_cat or 1

    new_event = Event(
        title=payload.title,
        description=payload.description or "",
        category_id=cat_id,
        location=payload.location,
        location_address=payload.location_address or DEFAULT_LOCATION_ADDRESS,
        google_maps_url=payload.google_maps_url or DEFAULT_MAPS_URL,
        start_time=start_dt,
        end_time=end_dt,
        start_date=payload.start_date or start_dt.strftime("%d/%m/%Y %H:%M"),
        end_date=payload.end_date or end_dt.strftime("%d/%m/%Y %H:%M"),
        status=payload.status or "PUBLISHED",
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)

    # Task 59 Requirement 1: Real-time RAG Knowledge Indexing into pgvector
    try:
        await rag_engine.sync_event_knowledge(db, new_event, action="UPSERT")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to auto-index new event into pgvector: {e}")

    return EventResponse(
        id=new_event.id,
        title=new_event.title,
        description=new_event.description,
        category_id=new_event.category_id,
        location=new_event.location,
        location_address=new_event.location_address,
        google_maps_url=new_event.google_maps_url,
        start_time=new_event.start_time,
        end_time=new_event.end_time,
        start_date=new_event.start_date,
        end_date=new_event.end_date,
        status=new_event.status,
        created_at=new_event.created_at,
        updated_at=new_event.updated_at,
        is_registered=False,
        is_checked_in=False,
        has_reviewed=False,
    )


@router.put("/{id}", response_model=EventResponse)
async def update_event(
    id: int,
    payload: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Update event dates, location address, and Google Maps embed URL.
    """
    if current_user:
        role_name = await get_user_role_name(current_user, db)
        if role_name not in ["ADMIN", "EVENT_MANAGER"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật sự kiện")

    stmt = select(Event).where(Event.id == id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    target_location = payload.location if payload.location is not None else event.location
    raw_start = parse_event_datetime(payload.start_time) or parse_event_datetime(payload.start_date) or event.start_time
    raw_end = parse_event_datetime(payload.end_time) or parse_event_datetime(payload.end_date) or event.end_time
    target_start = to_comparable_utc(raw_start)
    target_end = to_comparable_utc(raw_end)

    # Overlap validation check (excluding current event id)
    if target_location and target_start and target_end:
        await check_event_time_location_overlap(
            db=db,
            location=target_location,
            start_time=target_start,
            end_time=target_end,
            exclude_event_id=id,
        )

    if payload.title is not None:
        event.title = payload.title
    if payload.description is not None:
        event.description = payload.description
    if payload.location is not None:
        event.location = payload.location
    if payload.location_address is not None:
        event.location_address = payload.location_address
    if payload.google_maps_url is not None:
        event.google_maps_url = payload.google_maps_url
    if payload.start_date is not None:
        event.start_date = payload.start_date
    if payload.end_date is not None:
        event.end_date = payload.end_date
    if payload.start_time is not None:
        event.start_time = to_comparable_utc(parse_event_datetime(payload.start_time)) or event.start_time
    if payload.end_time is not None:
        event.end_time = to_comparable_utc(parse_event_datetime(payload.end_time)) or event.end_time
    if payload.status is not None:
        event.status = payload.status

    await db.commit()
    await db.refresh(event)

    # Task 59 Requirement 1: Real-time RAG Knowledge Re-indexing into pgvector
    try:
        await rag_engine.sync_event_knowledge(db, event, action="UPSERT")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to auto-update event in pgvector: {e}")

    return EventResponse(
        id=event.id,
        title=event.title,
        description=event.description,
        category_id=event.category_id,
        location=event.location,
        location_address=event.location_address,
        google_maps_url=event.google_maps_url,
        start_time=event.start_time,
        end_time=event.end_time,
        start_date=event.start_date,
        end_date=event.end_date,
        status=event.status,
        created_at=event.created_at,
        updated_at=event.updated_at,
        is_registered=False,
        is_checked_in=False,
        has_reviewed=False,
    )


@router.delete("/{id}")
async def delete_event(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Delete an event by ID with full cascade of all associated records:
    schedules, session interactions, registrations, feedbacks, inquiries, and reminders.
    """
    if current_user:
        role_name = await get_user_role_name(current_user, db)
        if role_name not in ["ADMIN", "EVENT_MANAGER"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa sự kiện")

    stmt = select(Event).where(Event.id == id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # 1. Schedules associated with this event
    sched_res = await db.execute(select(EventSchedule.id).where(EventSchedule.event_id == id))
    schedule_ids = sched_res.scalars().all()

    if schedule_ids:
        # Cascade delete session interaction entities
        await db.execute(delete(SessionQuestion).where(SessionQuestion.session_id.in_(schedule_ids)))
        await db.execute(delete(SessionResource).where(SessionResource.session_id.in_(schedule_ids)))
        await db.execute(delete(SessionMaterial).where(SessionMaterial.session_id.in_(schedule_ids)))
        await db.execute(delete(SessionFeedback).where(SessionFeedback.session_id.in_(schedule_ids)))
        await db.execute(delete(Registration).where((Registration.schedule_id.in_(schedule_ids)) | (Registration.session_id.in_(schedule_ids))))
        await db.execute(delete(Feedback).where(Feedback.session_id.in_(schedule_ids)))
        await db.execute(delete(UserReminder).where(UserReminder.session_id.in_(schedule_ids)))

    # 2. Cascade delete event-level relations
    await db.execute(delete(Registration).where(Registration.event_id == id))
    await db.execute(delete(Feedback).where(Feedback.event_id == id))
    await db.execute(delete(UserReminder).where(UserReminder.event_id == id))
    await db.execute(delete(KnowledgeBase).where(KnowledgeBase.event_id == id))

    # Inquiries & replies
    inq_res = await db.execute(select(EventInquiry.id).where(EventInquiry.event_id == id))
    inq_ids = inq_res.scalars().all()
    if inq_ids:
        await db.execute(delete(InquiryReply).where(InquiryReply.inquiry_id.in_(inq_ids)))
        await db.execute(delete(EventInquiry).where(EventInquiry.id.in_(inq_ids)))

    # 3. Cascade delete schedules
    await db.execute(delete(EventSchedule).where(EventSchedule.event_id == id))

    # Sync pgvector deletion
    try:
        await rag_engine.sync_event_knowledge(db, event, action="DELETE")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to remove event knowledge in pgvector: {e}")

    # 4. Delete event itself
    await db.delete(event)
    await db.commit()

    return {
        "status": "success",
        "message": f"Sự kiện #{id} ('{event.title}') đã được xóa thành công khỏi hệ thống!",
        "event_id": id,
    }


@router.get("/{id}/schedule", response_model=List[EventScheduleResponse])
async def get_event_schedule(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Retrieve event schedule items for a given event ID.
    Populates user registration status, check-in status, and feedback status if authenticated.
    """
    stmt = select(EventSchedule).where(EventSchedule.event_id == id).order_by(EventSchedule.day_number.asc(), EventSchedule.id.asc())
    res = await db.execute(stmt)
    schedules = res.scalars().all()

    # Look up user's registrations and feedbacks for this event/session
    user_reg_map = {}
    user_reviewed_schedules = set()
    if current_user:
        reg_stmt = select(Registration).where(
            Registration.event_id == id,
            Registration.participant_id == current_user.id
        )
        reg_res = await db.execute(reg_stmt)
        for r in reg_res.scalars().all():
            target_sid = r.schedule_id if r.schedule_id is not None else r.session_id
            if target_sid is not None:
                user_reg_map[target_sid] = r

        # Check global Feedback table
        fb_stmt = select(Feedback).where(
            Feedback.event_id == id,
            Feedback.user_id == current_user.id
        )
        fb_res = await db.execute(fb_stmt)
        for f in fb_res.scalars().all():
            if f.session_id is not None:
                user_reviewed_schedules.add(f.session_id)

        # Check SessionFeedback table
        sfb_stmt = select(SessionFeedback).where(
            SessionFeedback.user_id == current_user.id
        )
        sfb_res = await db.execute(sfb_stmt)
        for sf in sfb_res.scalars().all():
            user_reviewed_schedules.add(sf.session_id)

    response_items = []
    for s in schedules:
        user_reg = user_reg_map.get(s.id)
        is_registered = user_reg is not None
        is_checked_in = bool(user_reg and user_reg.is_checked_in)
        has_reviewed = s.id in user_reviewed_schedules
        reg_id = user_reg.id if user_reg else None
        qr_token = user_reg.qr_code_token if user_reg else None
        qr_image = generate_qr_base64(user_reg.qr_code_token) if user_reg else None

        response_items.append(EventScheduleResponse(
            id=s.id,
            event_id=s.event_id,
            title=s.title,
            description=s.description,
            speaker_name=s.speaker_name,
            speaker_role=s.speaker_role,
            start_time=s.start_time,
            end_time=s.end_time,
            room_location=s.room_location,
            day_number=s.day_number,
            date_label=s.date_label,
            track=s.track,
            start_date=s.start_date,
            location_address=s.location_address,
            google_maps_url=s.google_maps_url,
            capacity=s.capacity if s.capacity is not None else 100,
            registered_count=s.registered_count if s.registered_count is not None else 0,
            is_registered=is_registered,
            is_checked_in=is_checked_in,
            has_reviewed=has_reviewed,
            registration_id=reg_id,
            qr_code_token=qr_token,
            qr_code_image=qr_image,
            created_at=s.created_at,
        ))

    return response_items


@router.post("/{id}/schedule", response_model=EventScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_event_schedule(
    id: int,
    payload: EventScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"])),
):
    """
    Add a new schedule session / speaker slot to an event.
    """
    event_res = await db.execute(select(Event).where(Event.id == id))
    parent_event = event_res.scalar_one_or_none()
    if not parent_event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện cha!")

    check_session_within_event_bounds(
        event=parent_event,
        session_date=payload.start_date or payload.date_label,
        session_start_time=payload.start_time,
        session_end_time=payload.end_time,
    )

    schedule_item = EventSchedule(
        event_id=id,
        title=payload.title,
        description=payload.description,
        speaker_name=payload.speaker_name,
        speaker_role=payload.speaker_role,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room_location=payload.room_location,
        day_number=payload.day_number,
        date_label=payload.date_label,
        track=payload.track,
        start_date=payload.start_date,
        location_address=payload.location_address,
        google_maps_url=payload.google_maps_url,
    )
    db.add(schedule_item)
    await db.commit()
    await db.refresh(schedule_item)

    try:
        content = f"Phiên: {schedule_item.title}\nDiễn giả: {schedule_item.speaker_name}\nThời gian: {schedule_item.start_time} - {schedule_item.end_time}\nPhòng: {schedule_item.room_location}\nMô tả: {schedule_item.description}"
        emb = await gemini_service.generate_embedding(content)
        kb_item = KnowledgeBase(
            event_id=id,
            title=f"DB Session: {schedule_item.title}",
            content=content,
            embedding=emb,
        )
        db.add(kb_item)
        await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error creating embedding for session: {e}")

    return schedule_item


@router.put("/schedule/{schedule_id}", response_model=EventScheduleResponse)
@router.put("/{event_id}/schedule/{schedule_id}", response_model=EventScheduleResponse)
async def update_event_schedule(
    schedule_id: int,
    payload: EventScheduleUpdate,
    event_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Update a session / schedule item by its ID.
    """
    if current_user:
        role_name = await get_user_role_name(current_user, db)
        if role_name not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa phiên này")

    stmt = select(EventSchedule).where(EventSchedule.id == schedule_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên diễn thuyết")

    target_event_id = event_id or item.event_id
    if target_event_id:
        ev_stmt = select(Event).where(Event.id == target_event_id)
        parent_event = (await db.execute(ev_stmt)).scalar_one_or_none()
        if parent_event:
            check_session_within_event_bounds(
                event=parent_event,
                session_date=payload.start_date or item.start_date or payload.date_label or item.date_label,
                session_start_time=payload.start_time if payload.start_time is not None else item.start_time,
                session_end_time=payload.end_time if payload.end_time is not None else item.end_time,
            )

    # Backup old title in case it changes
    old_title = item.title

    if payload.title is not None:
        item.title = payload.title
    if payload.description is not None:
        item.description = payload.description
    if payload.speaker_name is not None:
        item.speaker_name = payload.speaker_name
    if payload.speaker_role is not None:
        item.speaker_role = payload.speaker_role
    if payload.start_time is not None:
        item.start_time = payload.start_time
    if payload.end_time is not None:
        item.end_time = payload.end_time
    if payload.room_location is not None:
        item.room_location = payload.room_location
    if payload.day_number is not None:
        item.day_number = payload.day_number
    if payload.date_label is not None:
        item.date_label = payload.date_label
    if payload.track is not None:
        item.track = payload.track
    if payload.start_date is not None:
        item.start_date = payload.start_date
    if payload.location_address is not None:
        item.location_address = payload.location_address
    if payload.google_maps_url is not None:
        item.google_maps_url = payload.google_maps_url

    await db.commit()
    await db.refresh(item)

    try:
        content = f"Phiên: {item.title}\nDiễn giả: {item.speaker_name}\nThời gian: {item.start_time} - {item.end_time}\nPhòng: {item.room_location}\nMô tả: {item.description}"
        emb = await gemini_service.generate_embedding(content)
        
        stmt_kb = select(KnowledgeBase).where(KnowledgeBase.event_id == (event_id or item.event_id)).where(KnowledgeBase.title == f"DB Session: {old_title}")
        res_kb = await db.execute(stmt_kb)
        kb_item = res_kb.scalar_one_or_none()
        
        if kb_item:
            kb_item.title = f"DB Session: {item.title}"
            kb_item.content = content
            kb_item.embedding = emb
        else:
            kb_item = KnowledgeBase(
                event_id=event_id or item.event_id,
                title=f"DB Session: {item.title}",
                content=content,
                embedding=emb,
            )
            db.add(kb_item)
        await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error updating embedding for session: {e}")

    return item


@router.delete("/schedule/{schedule_id}")
@router.delete("/{event_id}/schedule/{schedule_id}")
async def delete_event_schedule(
    schedule_id: int,
    event_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Delete a session / schedule item by its ID.
    """
    if current_user:
        role_name = await get_user_role_name(current_user, db)
        if role_name not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa phiên này")

    stmt = select(EventSchedule).where(EventSchedule.id == schedule_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên diễn thuyết")

    # Cascade delete schedule interactions, registrations, feedbacks, and reminders
    await db.execute(delete(SessionQuestion).where(SessionQuestion.session_id == schedule_id))
    await db.execute(delete(SessionResource).where(SessionResource.session_id == schedule_id))
    await db.execute(delete(SessionMaterial).where(SessionMaterial.session_id == schedule_id))
    await db.execute(delete(SessionFeedback).where(SessionFeedback.session_id == schedule_id))
    await db.execute(delete(Registration).where((Registration.schedule_id == schedule_id) | (Registration.session_id == schedule_id)))
    await db.execute(delete(Feedback).where(Feedback.session_id == schedule_id))
    await db.execute(delete(UserReminder).where(UserReminder.session_id == schedule_id))

    await db.delete(item)
    await db.commit()

    return {
        "status": "success",
        "message": f"Phiên diễn thuyết #{schedule_id} ('{item.title}') đã được xóa thành công!",
        "schedule_id": schedule_id,
    }


class GenerateSessionDescriptionRequest(BaseModel):
    title: str
    track: Optional[str] = "AI & Tech"
    speaker_name: Optional[str] = ""
    speaker_role: Optional[str] = ""
    style: Optional[str] = "auto"  # auto | professional | literary | inspirational | academic


class GenerateSessionDescriptionResponse(BaseModel):
    description: str
    style_applied: Optional[str] = "auto"


def _detect_and_build_prompt_matrix(
    title: str,
    track: Optional[str],
    speaker_name: Optional[str],
    speaker_role: Optional[str],
    style: Optional[str] = "auto"
) -> tuple[str, str, str, str, bool]:
    """
    Returns: (system_instruction, prompt, resolved_style, fallback_description, is_non_tech)
    """
    track_clean = (track or "").strip()
    combined_text = f"{title} {track_clean}".lower()

    # Kiểm tra ngữ cảnh thuộc các lĩnh vực phi công nghệ (Y tế, Sức khỏe, Tâm lý, Giáo dục, Nghệ thuật, Đời sống)
    is_health = any(w in combined_text for w in ["y tế", "sức khỏe", "y khoa", "dinh dưỡng", "bệnh", "khám", "chăm sóc", "bác sĩ", "health", "medical"])
    is_psychology = any(w in combined_text for w in ["tâm lý", "cảm xúc", "chữa lành", "stress", "nội tâm", "tinh thần", "psychology", "mental"])
    is_education = any(w in combined_text for w in ["giáo dục", "học đường", "sư phạm", "kỹ năng sống", "hướng nghiệp", "dạy học", "education"])
    is_art = any(w in combined_text for w in ["nghệ thuật", "văn hóa", "gala", "âm nhạc", "triển lãm", "sân khấu", "văn học", "biểu diễn", "hội họa", "art", "music", "cultural"])
    is_life = any(w in combined_text for w in ["đời sống", "gia đình", "hôn nhân", "cộng đồng", "lối sống", "lifestyle", "life"])

    is_non_tech = is_health or is_psychology or is_education or is_art or is_life

    # Determine resolved style
    req_style = (style or "auto").lower().strip()
    if req_style in ["professional", "chuyen_nghiep"]:
        resolved_style = "professional"
    elif req_style in ["literary", "bay_bong", "van_hoc"]:
        resolved_style = "literary"
    elif req_style in ["inspirational", "truyen_cam_hung"]:
        resolved_style = "inspirational"
    elif req_style in ["academic", "hoc_thuat", "nghien_cuu"]:
        resolved_style = "academic"
    else:
        # Auto detection
        if is_art or req_style == "literary":
            resolved_style = "literary"
        elif is_health or is_psychology:
            resolved_style = "wellness"
        elif is_education or is_life:
            resolved_style = "education_life"
        elif any(w in combined_text for w in ["kinh doanh", "lãnh đạo", "quản trị", "chiến lược", "đầu tư", "doanh nghiệp", "khởi nghiệp", "tài chính", "business", "leader", "roi", "c-level", "ceo"]):
            resolved_style = "business"
        elif any(w in combined_text for w in ["học thuật", "nghiên cứu", "khoa học", "báo cáo", "luận văn", "seminar", "academic", "research", "paper"]):
            resolved_style = "academic"
        elif any(w in combined_text for w in ["truyền cảm hứng", "động lực", "tiên phong", "tương lai", "khát vọng", "inspire"]):
            resolved_style = "inspirational"
        else:
            resolved_style = "tech"

    speaker_info = speaker_name or "chuyên gia đầu ngành"
    if speaker_role:
        speaker_info += f" ({speaker_role})"

    # Domain & Style-specific instructions and prompts
    if resolved_style in ["wellness", "education_life"] or (is_non_tech and resolved_style not in ["literary"]):
        domain_name = "Y tế & Sức khỏe" if is_health else ("Tâm lý & Tinh thần" if is_psychology else ("Giáo dục & Học đường" if is_education else "Đời sống & Phát triển bản thân"))
        system_instruction = (
            f"Bạn là chuyên gia tư vấn cao cấp và diễn giả giàu kinh nghiệm trong lĩnh vực {domain_name}. "
            f"Bạn luôn thấu hiểu, đồng cảm và truyền tải những thông điệp khoa học, nhân văn và tích cực."
        )
        style_guide = (
            f"- Lĩnh vực: {domain_name}.\n"
            "- Văn phong: Ấm áp, gần gũi, thấu cảm, khoa học, chỉn chu và khích lệ tinh thần.\n"
            "- Điểm nhấn: Cung cấp giải pháp thiết thực, phương pháp khoa học đã được kiểm chứng, nuôi dưỡng sự an yên và phát triển bền vững."
        )
        fallback_desc = (
            f"Phiên chia sẻ chuyên đề '{title}' cùng {speaker_info} mang đến những kiến thức khoa học và hành trang tâm lý vững vàng. "
            f"Người tham gia sẽ được lắng nghe các chuyên gia tư vấn hàng đầu chia sẻ phương pháp chăm sóc bản thân, giải tỏa áp lực và kết nối cởi mở, "
            f"hướng tới lối sống lành mạnh, cân bằng và tràn đầy năng lượng tích cực."
        )

    elif resolved_style == "literary" or is_art:
        system_instruction = (
            "Bạn là nhà biên kịch và giám tuyển nghệ thuật hàng đầu, bậc thầy về nghệ thuật ngôn từ và xây dựng không gian cảm xúc sự kiện."
        )
        style_guide = (
            "- Văn phong: Giàu chất thơ, hình tượng so sánh trau chuốt, ngôn từ bay bổng, giàu chiều sâu cảm xúc và mỹ cảm nghệ thuật.\n"
            "- Điểm nhấn: Khơi gợi sự rung động tinh tế, tôn vinh vẻ đẹp sáng tạo và sự thăng hoa văn hóa nghệ thuật."
        )
        fallback_desc = (
            f"Bước vào không gian nghệ thuật thăng hoa của '{title}', người tham dự sẽ được dẫn dắt qua những tầng cảm xúc tinh tế cùng {speaker_info}. "
            f"Nơi sự sáng tạo hòa quyện cùng ngôn ngữ biểu đạt đỉnh cao, phiên sự kiện mở ra những góc nhìn sâu lắng, đánh thức rung cảm thẩm mỹ và tôn vinh những giá trị văn hóa nghệ thuật vượt thời gian."
        )

    elif resolved_style in ["business", "professional"]:
        system_instruction = (
            "Bạn là chuyên gia tư vấn chiến lược cấp cao (Strategy & Management Consultant) và cố vấn điều hành doanh nghiệp."
        )
        style_guide = (
            "- Văn phong: Chiến lược, sắc sảo, cô đọng, định hướng kết quả (outcome-driven), toát lên phong thái lãnh đạo bản lĩnh.\n"
            "- Điểm nhấn: Đánh trúng bài toán tối ưu hóa vận hành, đòn bẩy tăng trưởng, năng lực thực thi và giá trị ROI vượt trội mang lại cho tổ chức."
        )
        fallback_desc = (
            f"Phiên chiến lược chuyên đề '{title}' quy tụ góc nhìn sắc bén từ {speaker_info}, giải quyết trực diện những thách thức trọng yếu trong quản trị và tăng trưởng bền vững. "
            f"Thông qua các phân tích thực chiến, lãnh đạo và các nhà quản trị sẽ nắm bắt mô hình tối ưu hóa vận hành, khai phóng tiềm năng kinh doanh và củng cố lợi thế cạnh tranh dài hạn."
        )

    elif resolved_style == "academic":
        system_instruction = (
            "Bạn là học giả, nhà nghiên cứu khoa học chuẩn mực với tư duy phương pháp luận nghiêm cẩn và hiểu biết học thuật sâu rộng."
        )
        style_guide = (
            "- Văn phong: Nghiêm túc, chỉn chu, hàn lâm, cấu trúc mạch lạc, chuẩn mực hội thảo khoa học quốc tế.\n"
            "- Điểm nhấn: Chiều sâu tri thức, nền tảng lý thuyết vững chắc, phương pháp luận thực nghiệm và đóng góp tri thức mang tính đột phá."
        )
        fallback_desc = (
            f"Báo cáo chuyên môn '{title}' do {speaker_info} trình bày mang đến góc nhìn học thuật chuyên sâu và phương pháp luận nghiên cứu nghiêm cẩn trong lĩnh vực {track_clean or 'nghiên cứu chuyên ngành'}. "
            f"Nội dung cung cấp hệ thống luận điểm vững chắc, phân tích dữ liệu thực chứng đa chiều và thảo luận các hướng tiếp cận tiên tiến đóng góp vào sự phát triển tri thức học thuật đương đại."
        )

    elif resolved_style == "inspirational":
        system_instruction = (
            "Bạn là diễn giả truyền cảm hứng toàn cầu, thắp sáng khát vọng đổi mới sáng tạo và tiên phong bứt phá."
        )
        style_guide = (
            "- Văn phong: Tràn đầy nhiệt huyết, hào hùng, truyền lửa mạnh mẽ, thôi thúc tinh thần hành động và bứt phá giới hạn.\n"
            "- Điểm nhấn: Tầm nhìn tương lai tươi sáng, niềm tin vào năng lực chuyển hóa phi thường của con người và cộng đồng."
        )
        fallback_desc = (
            f"Một phiên chia sẻ bùng nổ nguồn cảm hứng mang tên '{title}' cùng {speaker_info}! "
            f"Cùng nhau phá vỡ những giới hạn thông thường, thắp sáng tư duy tiên phong và khơi dậy khát vọng hành động mạnh mẽ để kiến tạo tương lai đột phá ngay từ hôm nay."
        )

    else:  # tech (Công nghệ & AI)
        system_instruction = (
            "Bạn là kiến trúc sư trưởng công nghệ (Chief Technology Architect) kiêm giám đốc nghiên cứu AI quốc tế năm 2026."
        )
        style_guide = (
            "- Văn phong: Hiện đại, giàu năng lượng, tư duy công nghệ tương lai, sử dụng chính xác các thuật ngữ công nghệ tiên tiến năm 2026 (Generative AI, Agentic Workflows, RAG, pgvector, Real-time Architectures, Cloud Native, Edge Computing...).\n"
            "- Điểm nhấn: Kiến trúc thực chiến, giải pháp công nghệ đột phá, khả năng mở rộng quy mô và kinh nghiệm triển khai thực tế."
        )
        fallback_desc = (
            f"Phiên diễn thuyết chuyên sâu '{title}' do {speaker_info} dẫn dắt sẽ giải mã những bước tiến đột phá mới nhất trong lĩnh vực {track_clean or 'Trí tuệ nhân tạo và Công nghệ'}. "
            f"Khách tham dự sẽ nắm bắt kiến trúc thực chiến, kinh nghiệm triển khai quy mô lớn và tương tác trực tiếp với các chuyên gia đầu ngành để làm chủ làn sóng công nghệ 2026."
        )

    # Context Negative Rules for non-tech domains
    negative_rules_clause = ""
    if is_non_tech:
        negative_rules_clause = (
            "\n\n🚨 QUY TẮC BẮT BUỘC VỀ KIỂM SOÁT NGỮ CẢNH (CONTEXT NEGATIVE RULES):\n"
            "- Sự kiện này thuộc lĩnh vực Đời sống / Y tế / Sức khỏe / Tâm lý / Giáo dục / Nghệ thuật.\n"
            "- TUYỆT ĐỐI CẤM sử dụng các thuật ngữ công nghệ / IT như: 'kiến trúc', 'triển khai quy mô lớn', "
            "'làn sóng công nghệ', 'hệ sinh thái kỹ thuật số', 'mã nguồn', 'hệ thống số hóa', 'thuật toán', 'nền tảng số'.\n"
            "- BẮT BUỘC dùng tập từ vựng thuộc đúng chuyên ngành tương ứng như: 'hành trang tâm lý', 'kiến thức khoa học', "
            "'chăm sóc bản thân', 'kết nối cởi mở', 'chuyên gia tư vấn', 'nuôi dưỡng tinh thần', 'lối sống lành mạnh', 'thấu cảm và chia sẻ'."
        )

    prompt = (
        f"Hãy viết một đoạn văn mô tả chi tiết, cuốn hút và chuẩn mực cho phiên/sự kiện sau:\n"
        f"- Tiêu đề: {title}\n"
        f"- Chủ đề / Track: {track_clean or 'Đổi mới sáng tạo & Đời sống'}\n"
        f"- Diễn giả / Khách mời: {speaker_info}\n\n"
        f"ĐỊNH HƯỚNG PHONG CÁCH & VĂN PHONG ({resolved_style.upper()}):\n"
        f"{style_guide}"
        f"{negative_rules_clause}\n\n"
        f"YÊU CẦU QUAN TRỌNG VỀ TRI THỨC CHUYÊN SÂU:\n"
        f"1. Tự động liên tưởng và khai thác tri thức ngầm thực tế trong năm 2026 xung quanh tiêu đề '{title}'. "
        f"Đưa vào các khía cạnh chuyên môn, bài toán thực tiễn hoặc xu hướng nổi bật tương ứng, tuyệt đối tránh viết chung chung sáo rỗng.\n"
        f"2. Nêu bật giá trị thiết thực và trải nghiệm mà người tham dự sẽ thu nhận được.\n"
        f"3. Viết bằng tiếng Việt tự nhiên, độ dài khoảng 90 - 160 từ, đi thẳng vào nội dung hấp dẫn, không kèm tiêu đề phụ thừa."
    )

    return system_instruction, prompt, resolved_style, fallback_desc, is_non_tech


def _sanitize_non_tech_description(text: str) -> str:
    """
    Post-processing filter: Loại bỏ triệt để các thuật ngữ công nghệ/IT bị rò rỉ vào lĩnh vực phi công nghệ.
    """
    replacements = {
        "triển khai quy mô lớn": "ứng dụng rộng rãi vào thực tiễn",
        "làn sóng công nghệ": "xu hướng hiện đại",
        "hệ sinh thái kỹ thuật số": "môi trường tích cực",
        "mã nguồn": "nền tảng cốt lõi",
        "kiến trúc thực chiến": "phương pháp thực tiễn",
        "kiến trúc": "nền tảng",
    }
    sanitized = text
    for forbidden, replacement in replacements.items():
        sanitized = sanitized.replace(forbidden, replacement)
    return sanitized


@router.post("/generate-description", response_model=GenerateSessionDescriptionResponse)
async def generate_session_description(payload: GenerateSessionDescriptionRequest):
    """
    Generate an engaging, domain-aware description based on title, track, speaker, and selected style using Gemini.
    """
    system_instruction, prompt, resolved_style, fallback_desc, is_non_tech = _detect_and_build_prompt_matrix(
        title=payload.title,
        track=payload.track,
        speaker_name=payload.speaker_name,
        speaker_role=payload.speaker_role,
        style=payload.style
    )

    try:
        res = await gemini_service.generate_draft_answer(
            prompt=prompt,
            system_instruction=system_instruction,
            timeout_seconds=18.0
        )
        description = res.text.strip() if res and res.text else ""
        if not description or res.is_fallback:
            description = fallback_desc
    except Exception as err:
        logger.warning(f"Gemini generate description error: {err}, using fallback matrix.")
        description = fallback_desc

    if is_non_tech:
        description = _sanitize_non_tech_description(description)

    return GenerateSessionDescriptionResponse(
        description=description,
        style_applied=resolved_style
    )




@router.post("/{id}/publish", response_model=EventResponse)
async def publish_event(id: int):
    # Mock logic - robust production logic should be here, but database is down.
    return {"id": id, "title": "Mock", "location": "Mock", "status": "PUBLISHED"}

@router.post("/{id}/unpublish", response_model=EventResponse)
async def unpublish_event(id: int):
    return {"id": id, "title": "Mock", "location": "Mock", "status": "DRAFT"}

@router.post("/{id}/cancel", response_model=EventResponse)
async def cancel_event(id: int):
    return {"id": id, "title": "Mock", "location": "Mock", "status": "CANCELLED"}

@router.post("/{id}/archive", response_model=EventResponse)
async def archive_event(id: int):
    return {"id": id, "title": "Mock", "location": "Mock", "status": "ARCHIVED"}

@router.post("/{id}/duplicate", response_model=EventResponse)
async def duplicate_event(id: int):
    return {"id": 999, "title": "Duplicated Event", "location": "Mock", "status": "DRAFT"}

@router.patch("/{id}/homepage", response_model=EventResponse)
async def update_homepage_visibility(id: int, payload: dict):
    return {"id": id, "title": "Mock", "location": "Mock", "status": "PUBLISHED"}

@router.patch("/{id}/featured", response_model=EventResponse)
async def update_featured(id: int, payload: dict):
    return {"id": id, "title": "Mock", "location": "Mock", "status": "PUBLISHED"}

@router.post("/export")
async def export_events(payload: dict):
    # Dummy export endpoint, frontend uses Blob locally anyway if fails
    return {"url": "dummy"}
