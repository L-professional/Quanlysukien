from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user_optional
from app.models.event import Event, EventSchedule
from app.models.knowledge import KnowledgeBase
from app.models.user import User
from app.models.registration import Registration
from app.services.email_service import generate_qr_base64
from pydantic import BaseModel
from app.services.gemini_service import gemini_service
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
async def list_events(db: AsyncSession = Depends(get_db)):
    """
    List all events with dates, address, and Google Maps embed links.
    """
    stmt = select(Event).order_by(Event.id.asc())
    res = await db.execute(stmt)
    events = res.scalars().all()

    if not events:
        # Seed default event
        now = datetime.now()
        default_event = Event(
            id=1,
            title="EventHub AI Summit 2026",
            description="Hội thảo quốc tế hàng đầu về Generative AI, RAG Vector Search và Tự Động Hóa Quản Trị Sự Kiện.",
            category_id=1,
            location="GEM Center, TP. Hồ Chí Minh",
            location_address=DEFAULT_LOCATION_ADDRESS,
            google_maps_url=DEFAULT_MAPS_URL,
            start_time=now,
            end_time=now,
            start_date="15/10/2026 08:30",
            end_date="16/10/2026 17:30",
            status="PUBLISHED",
        )
        db.add(default_event)
        try:
            await db.commit()
            await db.refresh(default_event)
            return [default_event]
        except Exception:
            await db.rollback()
            return [
                EventResponse(
                    id=1,
                    title="EventHub AI Summit 2026",
                    description="Hội thảo quốc tế hàng đầu về Generative AI, RAG Vector Search và Tự Động Hóa Quản Trị Sự Kiện.",
                    category_id=1,
                    location="GEM Center, TP. Hồ Chí Minh",
                    location_address=DEFAULT_LOCATION_ADDRESS,
                    google_maps_url=DEFAULT_MAPS_URL,
                    start_date="15/10/2026 08:30",
                    end_date="16/10/2026 17:30",
                    status="PUBLISHED",
                )
            ]

    return events


@router.get("/{id}", response_model=EventResponse)
async def get_event(id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a single event with date and Google Maps details.
    """
    stmt = select(Event).where(Event.id == id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        if id == 1:
            return EventResponse(
                id=1,
                title="EventHub AI Summit 2026",
                description="Hội thảo quốc tế hàng đầu về Generative AI, RAG Vector Search và Tự Động Hóa Quản Trị Sự Kiện.",
                category_id=1,
                location="GEM Center, TP. Hồ Chí Minh",
                location_address=DEFAULT_LOCATION_ADDRESS,
                google_maps_url=DEFAULT_MAPS_URL,
                start_date="15/10/2026 08:30",
                end_date="16/10/2026 17:30",
                status="PUBLISHED",
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    return event


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Create a new event in the database.
    """
    if current_user and current_user.role and current_user.role.name not in ["ADMIN", "EVENT_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền tạo sự kiện")

    now = datetime.now()
    new_event = Event(
        title=payload.title,
        description=payload.description or "",
        category_id=payload.category_id or 1,
        location=payload.location,
        location_address=payload.location_address or DEFAULT_LOCATION_ADDRESS,
        google_maps_url=payload.google_maps_url or DEFAULT_MAPS_URL,
        start_time=payload.start_time or now,
        end_time=payload.end_time or now,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status or "PUBLISHED",
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    return new_event


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
    if current_user and current_user.role and current_user.role.name not in ["ADMIN", "EVENT_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật sự kiện")

    stmt = select(Event).where(Event.id == id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

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
    if payload.status is not None:
        event.status = payload.status

    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{id}")
async def delete_event(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Delete an event by ID (also deletes all its associated session schedules).
    """
    if current_user and current_user.role and current_user.role.name not in ["ADMIN", "EVENT_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa sự kiện")

    stmt = select(Event).where(Event.id == id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Cascade delete all associated schedules for this event
    await db.execute(delete(EventSchedule).where(EventSchedule.event_id == id))

    # Delete event
    await db.delete(event)
    await db.commit()

    return {
        "status": "success",
        "message": f"Sự kiện #{id} ('{event.title}') đã được xóa thành công!",
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
    Populates user registration status and QR ticket info if authenticated.
    If no schedule items exist in DB, seeds initial demo schedules.
    """
    stmt = select(EventSchedule).where(EventSchedule.event_id == id).order_by(EventSchedule.day_number.asc(), EventSchedule.id.asc())
    res = await db.execute(stmt)
    schedules = res.scalars().all()

    if not schedules:
        # Seed initial schedule if empty
        new_items = []
        for item in INITIAL_SEED_SCHEDULE:
            schedule_item = EventSchedule(
                event_id=id,
                **item
            )
            db.add(schedule_item)
            new_items.append(schedule_item)
        try:
            await db.commit()
            for item in new_items:
                await db.refresh(item)
            schedules = new_items
        except Exception:
            await db.rollback()
            # Return initial seed list mapped into dummy format
            return [
                EventScheduleResponse(
                    id=idx + 1,
                    event_id=id,
                    **item
                )
                for idx, item in enumerate(INITIAL_SEED_SCHEDULE)
            ]

    # Look up user's registrations for this event/session
    user_reg_map = {}
    if current_user:
        reg_stmt = select(Registration).where(
            Registration.event_id == id,
            Registration.participant_id == current_user.id
        )
        reg_res = await db.execute(reg_stmt)
        for r in reg_res.scalars().all():
            if r.schedule_id is not None:
                user_reg_map[r.schedule_id] = r

    response_items = []
    for s in schedules:
        user_reg = user_reg_map.get(s.id)
        is_registered = user_reg is not None
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
    if current_user and current_user.role and current_user.role.name not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa phiên này")

    stmt = select(EventSchedule).where(EventSchedule.id == schedule_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên diễn thuyết")

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
    if current_user and current_user.role and current_user.role.name not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa phiên này")

    stmt = select(EventSchedule).where(EventSchedule.id == schedule_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên diễn thuyết")

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


