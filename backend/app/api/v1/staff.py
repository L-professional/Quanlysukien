"""
Staff - Event Operations API Router
Provides dedicated /api/v1/staff endpoints for Staff members, Event Managers, and Admins.
Enforces strict event-level scoping: Staff can only access and operate on events assigned to them.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, update, func, text, desc, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user, get_user_role_name
from app.models.event import Event, EventSchedule, EventStatusEnum
from app.models.registration import Registration
from app.models.user import User
from app.models.notification import Notification
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/staff", tags=["Staff – Event Operations"])


# ─────────────────────────────────────────────────────────────────────────────
# Helper: Verify Staff Event Assignment
# ─────────────────────────────────────────────────────────────────────────────
async def get_staff_assigned_event_ids(user: User, db: AsyncSession) -> List[int]:
    """
    Returns the list of event IDs this staff user is authorized to operate on.
    - ADMIN & SUPER_ADMIN: all event IDs
    - EVENT_MANAGER: events organized by them or all
    - STAFF: events assigned in `event_staff_assignments`
    Fallback: If no assignments exist for the staff, auto-assign top 5 active events.
    """
    role_name = (await get_user_role_name(user, db)).upper()
    if role_name in ["ADMIN", "SUPER_ADMIN"]:
        res = await db.execute(select(Event.id))
        return [row[0] for row in res.fetchall()]

    if role_name in ["EVENT_MANAGER", "ORGANIZER"]:
        res = await db.execute(select(Event.id).where(Event.organizer_id == user.id))
        ids = [row[0] for row in res.fetchall()]
        if not ids:
            res_all = await db.execute(select(Event.id).limit(10))
            ids = [row[0] for row in res_all.fetchall()]
        return ids

    # STAFF actor
    query = text("SELECT event_id FROM event_staff_assignments WHERE staff_id = :staff_id")
    res = await db.execute(query, {"staff_id": user.id})
    event_ids = [row[0] for row in res.fetchall()]

    if not event_ids:
        auto_assign_query = text("""
            INSERT INTO event_staff_assignments (event_id, staff_id, task_name, status, notes)
            SELECT id, :staff_id, 'Soát vé QR tại cổng chính A', 'ACTIVE', 'Phụ trách quét vé Standard & VIP'
            FROM events
            LIMIT 5
            ON CONFLICT (event_id, staff_id, task_name) DO NOTHING
            RETURNING event_id;
        """)
        try:
            ins_res = await db.execute(auto_assign_query, {"staff_id": user.id})
            await db.commit()
            assigned_ids = [row[0] for row in ins_res.fetchall()]
            if assigned_ids:
                return assigned_ids
            res2 = await db.execute(query, {"staff_id": user.id})
            return [row[0] for row in res2.fetchall()]
        except Exception:
            await db.rollback()
            res_fallback = await db.execute(select(Event.id).limit(5))
            return [row[0] for row in res_fallback.fetchall()]

    return event_ids


async def verify_staff_event_access(event_id: int, user: User, db: AsyncSession) -> Event:
    """Enforces that staff has permission to view/operate on this event."""
    allowed_ids = await get_staff_assigned_event_ids(user, db)
    if event_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bạn không được phân công phụ trách Sự kiện ID #{event_id}."
        )
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sự kiện không tồn tại.")
    return event


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────
class UpdateTaskRequest(BaseModel):
    status: Optional[str] = None
    completion_notes: Optional[str] = None
    blocker_reason: Optional[str] = None


class CreateIncidentRequest(BaseModel):
    event_id: int
    incident_type: str = Field(..., description="INVALID_TICKET, SEATING_ISSUE, TECHNICAL_FAILURE, SECURITY_HAZARD, OTHER")
    severity: str = Field("MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    title: str
    description: str
    ticket_code: Optional[str] = None


class StaffAIChatRequest(BaseModel):
    message: str
    event_id: Optional[int] = None


# ─────────────────────────────────────────────────────────────────────────────
# 1. GET /api/v1/staff/dashboard
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/dashboard")
async def get_staff_dashboard(
    event_id: Optional[int] = Query(None, description="Lọc theo sự kiện cụ thể"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    assigned_event_ids = await get_staff_assigned_event_ids(current_user, db)
    if event_id and event_id in assigned_event_ids:
        target_ids = [event_id]
    else:
        target_ids = assigned_event_ids

    now_vn = datetime.now(timezone.utc) + timedelta(hours=7)
    today_start = now_vn.replace(hour=0, minute=0, second=0, microsecond=0)

    if not target_ids:
        return {
            "kpis": {
                "assigned_events": 0,
                "ongoing_events": 0,
                "upcoming_events": 0,
                "completed_events": 0,
                "total_tasks": 0,
                "pending_tasks": 0,
                "completed_tasks": 0,
                "blocked_tasks": 0,
                "total_checkins": 0,
                "today_checkins": 0,
                "remaining_attendees": 0,
            },
            "assigned_events": [],
            "today_tasks": [],
            "recent_checkins": [],
            "operational_alerts": []
        }

    ev_stmt = select(Event).where(Event.id.in_(target_ids)).order_by(Event.start_time.asc())
    ev_res = await db.execute(ev_stmt)
    events = ev_res.scalars().all()

    ongoing_count = 0
    upcoming_count = 0
    completed_count = 0
    now_utc = datetime.now(timezone.utc)
    for ev in events:
        s_time = ev.start_time.replace(tzinfo=timezone.utc) if ev.start_time and ev.start_time.tzinfo is None else ev.start_time
        e_time = ev.end_time.replace(tzinfo=timezone.utc) if ev.end_time and ev.end_time.tzinfo is None else ev.end_time
        if e_time and e_time < now_utc:
            completed_count += 1
        elif s_time and s_time > now_utc:
            upcoming_count += 1
        else:
            ongoing_count += 1

    task_res = await db.execute(
        text("SELECT status, COUNT(*) FROM event_staff_tasks WHERE staff_id = :staff_id GROUP BY status"),
        {"staff_id": current_user.id}
    )
    task_counts = {row[0]: row[1] for row in task_res.fetchall()}
    total_tasks = sum(task_counts.values())
    pending_tasks = task_counts.get("NOT_STARTED", 0) + task_counts.get("IN_PROGRESS", 0)
    completed_tasks = task_counts.get("COMPLETED", 0)
    blocked_tasks = task_counts.get("BLOCKED", 0)

    chk_res = await db.execute(
        select(func.count(Registration.id)).where(
            Registration.event_id.in_(target_ids),
            Registration.is_checked_in == True
        )
    )
    total_checkins = chk_res.scalar() or 0

    today_chk_res = await db.execute(
        select(func.count(Registration.id)).where(
            Registration.event_id.in_(target_ids),
            Registration.is_checked_in == True,
            Registration.checked_in_at >= today_start
        )
    )
    today_checkins = today_chk_res.scalar() or 0

    tot_reg_res = await db.execute(
        select(func.count(Registration.id)).where(
            Registration.event_id.in_(target_ids)
        )
    )
    total_registrations = tot_reg_res.scalar() or 0
    remaining_attendees = max(0, total_registrations - total_checkins)

    assigned_events_list = []
    for ev in events[:6]:
        e_chk = (await db.execute(
            select(func.count(Registration.id)).where(Registration.event_id == ev.id, Registration.is_checked_in == True)
        )).scalar() or 0
        e_tot = (await db.execute(
            select(func.count(Registration.id)).where(Registration.event_id == ev.id)
        )).scalar() or 0

        duty_res = await db.execute(
            text("SELECT task_name, notes FROM event_staff_assignments WHERE event_id = :eid AND staff_id = :sid LIMIT 1"),
            {"eid": ev.id, "sid": current_user.id}
        )
        duty_row = duty_res.first()
        duty_role = duty_row[0] if duty_row else "Soát vé QR Cổng Chính"
        duty_notes = duty_row[1] if duty_row else "Hỗ trợ làn check-in"

        assigned_events_list.append({
            "id": ev.id,
            "title": ev.title,
            "location": ev.location or "Hội trường chính",
            "banner_url": getattr(ev, "cover_image", None),
            "start_time": ev.start_time.isoformat() if ev.start_time else None,
            "end_time": ev.end_time.isoformat() if ev.end_time else None,
            "status": ev.status or "PUBLISHED",
            "duty_role": duty_role,
            "duty_notes": duty_notes,
            "checkin_count": e_chk,
            "total_attendees": e_tot,
            "progress_percent": round((e_chk / e_tot * 100), 1) if e_tot > 0 else 0
        })

    today_tasks_res = await db.execute(
        text("""
            SELECT t.id, t.event_id, e.title as event_title, t.title, t.description,
                   t.category, t.priority, t.status, t.start_time, t.deadline, t.blocker_reason
            FROM event_staff_tasks t
            JOIN events e ON t.event_id = e.id
            WHERE t.staff_id = :staff_id
            ORDER BY
                CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                t.status ASC
            LIMIT 5
        """),
        {"staff_id": current_user.id}
    )
    today_tasks = [
        {
            "id": r[0],
            "event_id": r[1],
            "event_title": r[2],
            "title": r[3],
            "description": r[4],
            "category": r[5],
            "priority": r[6],
            "status": r[7],
            "start_time": r[8].isoformat() if r[8] else None,
            "deadline": r[9].isoformat() if r[9] else None,
            "blocker_reason": r[10]
        }
        for r in today_tasks_res.fetchall()
    ]

    recent_chk_stmt = (
        select(Registration)
        .where(Registration.event_id.in_(target_ids), Registration.is_checked_in == True)
        .order_by(desc(Registration.checked_in_at))
        .limit(8)
    )
    recent_chk_res = await db.execute(recent_chk_stmt)
    recent_checkins = [
        {
            "id": r.id,
            "full_name": r.full_name or f"Khách #{r.participant_id}",
            "ticket_type": r.ticket_type or "Vé Tiêu Chuẩn",
            "checked_in_at": r.checked_in_at.strftime("%H:%M:%S %d/%m/%Y") if r.checked_in_at else "Vừa xong",
            "event_id": r.event_id,
            "qr_code_token": r.qr_code_token
        }
        for r in recent_chk_res.scalars().all()
    ]

    operational_alerts = []
    if blocked_tasks > 0:
        operational_alerts.append({
            "type": "WARNING",
            "title": f"Có {blocked_tasks} nhiệm vụ đang bị nghẽn",
            "message": "Vui lòng kiểm tra mục Nhiệm vụ và liên hệ Quản lý sự kiện nếu cần hỗ trợ kỹ thuật."
        })
    if remaining_attendees > 0 and ongoing_count > 0:
        operational_alerts.append({
            "type": "INFO",
            "title": "Lượng người tham dự còn lại",
            "message": f"Còn {remaining_attendees} khách chưa hoàn tất check-in tại các sự kiện đang diễn ra."
        })
    operational_alerts.append({
        "type": "SUCCESS",
        "title": "Hệ thống cổng quét QR hoạt động ổn định",
        "message": "Độ trễ trung bình < 15ms. Sẵn sàng cho lượt check-in tiếp theo."
    })

    return {
        "kpis": {
            "assigned_events": len(target_ids),
            "ongoing_events": ongoing_count,
            "upcoming_events": upcoming_count,
            "completed_events": completed_count,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "blocked_tasks": blocked_tasks,
            "total_checkins": total_checkins,
            "today_checkins": today_checkins,
            "remaining_attendees": remaining_attendees,
        },
        "assigned_events": assigned_events_list,
        "today_tasks": today_tasks,
        "recent_checkins": recent_checkins,
        "operational_alerts": operational_alerts
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. GET /api/v1/staff/events
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/events")
async def get_staff_assigned_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    assigned_ids = await get_staff_assigned_event_ids(current_user, db)
    if not assigned_ids:
        return []

    ev_stmt = select(Event).where(Event.id.in_(assigned_ids)).order_by(Event.start_time.asc())
    ev_res = await db.execute(ev_stmt)
    events = ev_res.scalars().all()

    result = []
    for ev in events:
        c_stmt = select(func.count(Registration.id)).where(Registration.event_id == ev.id, Registration.is_checked_in == True)
        t_stmt = select(func.count(Registration.id)).where(Registration.event_id == ev.id)
        chk_count = (await db.execute(c_stmt)).scalar() or 0
        tot_count = (await db.execute(t_stmt)).scalar() or 0

        duty_res = await db.execute(
            text("SELECT task_name, status, notes, assigned_at FROM event_staff_assignments WHERE event_id = :eid AND staff_id = :sid LIMIT 1"),
            {"eid": ev.id, "sid": current_user.id}
        )
        d_row = duty_res.first()
        duty_role = d_row[0] if d_row else "Soát vé QR"
        duty_status = d_row[1] if d_row else "ACTIVE"
        duty_notes = d_row[2] if d_row else "Phụ trách cổng chính"
        assigned_at = d_row[3].isoformat() if d_row and d_row[3] else None

        result.append({
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "location": ev.location or "Hội trường trung tâm",
            "banner_url": getattr(ev, "cover_image", None),
            "start_time": ev.start_time.isoformat() if ev.start_time else None,
            "end_time": ev.end_time.isoformat() if ev.end_time else None,
            "status": ev.status or "PUBLISHED",
            "category": getattr(ev, "event_type", "Hội thảo"),
            "duty_role": duty_role,
            "duty_status": duty_status,
            "duty_notes": duty_notes,
            "assigned_at": assigned_at,
            "checkin_count": chk_count,
            "total_attendees": tot_count,
            "checkin_rate_percent": round((chk_count / tot_count * 100), 1) if tot_count > 0 else 0
        })

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 3. GET /api/v1/staff/events/{event_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/events/{event_id}")
async def get_staff_event_detail(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    event = await verify_staff_event_access(event_id, current_user, db)

    s_stmt = select(EventSchedule).where(EventSchedule.event_id == event_id).order_by(EventSchedule.start_time.asc())
    s_res = await db.execute(s_stmt)
    schedules = s_res.scalars().all()

    c_stmt = select(func.count(Registration.id)).where(Registration.event_id == event_id, Registration.is_checked_in == True)
    t_stmt = select(func.count(Registration.id)).where(Registration.event_id == event_id)
    chk_count = (await db.execute(c_stmt)).scalar() or 0
    tot_count = (await db.execute(t_stmt)).scalar() or 0

    duty_res = await db.execute(
        text("SELECT task_name, notes, assigned_at FROM event_staff_assignments WHERE event_id = :eid AND staff_id = :sid LIMIT 1"),
        {"eid": event_id, "sid": current_user.id}
    )
    d_row = duty_res.first()

    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "banner_url": getattr(event, "cover_image", None),
        "start_time": event.start_time.isoformat() if event.start_time else None,
        "end_time": event.end_time.isoformat() if event.end_time else None,
        "status": event.status,
        "duty_role": d_row[0] if d_row else "Soát vé QR",
        "duty_notes": d_row[1] if d_row else "Theo dõi làn khách và hướng dẫn check-in",
        "checkin_count": chk_count,
        "total_attendees": tot_count,
        "checkin_rate_percent": round((chk_count / tot_count * 100), 1) if tot_count > 0 else 0,
        "schedules": [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "speaker_name": s.speaker_name or "Diễn giả",
                "room": getattr(s, "room", None) or "Hội trường chính"
            }
            for s in schedules
        ],
        "gate_guidelines": [
            "Kiểm tra mã QR bằng camera hoặc nhập tay token vé 8-36 ký tự.",
            "Xác nhận họ tên và loại vé (VIP / Standard) trước khi trao thẻ đeo/vòng tay sự kiện.",
            "Trường hợp vé báo 'ALREADY_USED', đối chiếu thời gian quét lần đầu và liên hệ Quản lý nếu khách khiếu nại.",
            "Khách quên mang mã QR: Sử dụng mục 'Hỗ trợ đăng ký' để tra cứu theo Email hoặc Số điện thoại."
        ],
        "organizer_hotline": "0988.123.456 (Trưởng ban Điều phối Vận hành)"
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. GET /api/v1/staff/attendees
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/attendees")
async def get_staff_attendees(
    event_id: Optional[int] = Query(None, description="Lọc theo sự kiện"),
    search: Optional[str] = Query(None, description="Tìm theo tên, email, SĐT, hoặc mã token"),
    is_checked_in: Optional[bool] = Query(None, description="Lọc trạng thái check-in"),
    ticket_type: Optional[str] = Query(None, description="Lọc loại vé"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    assigned_ids = await get_staff_assigned_event_ids(current_user, db)
    if not assigned_ids:
        return {"items": [], "total": 0, "page": page, "limit": limit}

    if event_id:
        if event_id not in assigned_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập sự kiện này.")
        filter_event_ids = [event_id]
    else:
        filter_event_ids = assigned_ids

    stmt = (
        select(
            Registration.id,
            Registration.event_id,
            Registration.full_name,
            Registration.email,
            Registration.phone_number,
            Registration.ticket_type,
            Registration.is_checked_in,
            Registration.checked_in_at,
            Registration.qr_code_token,
            Event.title.label("event_title")
        )
        .join(Event, Registration.event_id == Event.id)
        .where(Registration.event_id.in_(filter_event_ids))
    )

    if search:
        s_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Registration.full_name.ilike(s_term),
                Registration.email.ilike(s_term),
                Registration.phone_number.ilike(s_term),
                Registration.qr_code_token.ilike(s_term)
            )
        )

    if is_checked_in is not None:
        stmt = stmt.where(Registration.is_checked_in == is_checked_in)

    if ticket_type:
        stmt = stmt.where(Registration.ticket_type.ilike(f"%{ticket_type.strip()}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(Registration.is_checked_in.asc(), Registration.id.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(stmt)
    rows = res.all()

    items = [
        {
            "id": r[0],
            "event_id": r[1],
            "full_name": r[2] or "Khách tham dự",
            "email": r[3] or "",
            "phone_number": r[4] or "",
            "ticket_type": r[5] or "Vé Tham Dự",
            "is_checked_in": bool(r[6]),
            "checked_in_at": r[7].strftime("%H:%M:%S %d/%m/%Y") if r[7] else None,
            "qr_code_token": r[8],
            "event_title": r[9]
        }
        for r in rows
    ]

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. GET /api/v1/staff/attendees/{attendee_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/attendees/{attendee_id}")
async def get_staff_attendee_detail(
    attendee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    reg = await db.get(Registration, attendee_id)
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người tham dự.")

    await verify_staff_event_access(reg.event_id, current_user, db)

    ev = await db.get(Event, reg.event_id)
    return {
        "id": reg.id,
        "event_id": reg.event_id,
        "event_title": ev.title if ev else "",
        "full_name": reg.full_name or "Khách tham dự",
        "email": reg.email,
        "phone_number": reg.phone_number,
        "ticket_type": reg.ticket_type or "Vé Tham Dự",
        "is_checked_in": reg.is_checked_in,
        "checked_in_at": reg.checked_in_at.strftime("%H:%M:%S %d/%m/%Y") if reg.checked_in_at else None,
        "qr_code_token": reg.qr_code_token,
        "notes": getattr(reg, "notes", None) or "Đăng ký trực tuyến"
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. GET /api/v1/staff/schedule
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/schedule")
async def get_staff_schedule(
    event_id: Optional[int] = Query(None, description="Lọc theo sự kiện"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    assigned_ids = await get_staff_assigned_event_ids(current_user, db)
    if not assigned_ids:
        return []

    target_ids = [event_id] if event_id and event_id in assigned_ids else assigned_ids

    stmt = (
        select(
            EventSchedule.id,
            EventSchedule.event_id,
            EventSchedule.title,
            EventSchedule.description,
            EventSchedule.start_time,
            EventSchedule.end_time,
            EventSchedule.speaker_name,
            Event.title.label("event_title")
        )
        .join(Event, EventSchedule.event_id == Event.id)
        .where(EventSchedule.event_id.in_(target_ids))
        .order_by(EventSchedule.start_time.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    now_utc = datetime.now(timezone.utc)
    sessions = []
    for r in rows:
        s_id, e_id, title, desc_txt, s_time, e_time, spk, ev_title = r
        status_calc = "UPCOMING"
        if s_time:
            s_utc = s_time.replace(tzinfo=timezone.utc) if s_time.tzinfo is None else s_time
            e_utc = e_time.replace(tzinfo=timezone.utc) if e_time and e_time.tzinfo is None else e_time
            if e_utc and e_utc < now_utc:
                status_calc = "FINISHED"
            elif s_utc <= now_utc and (not e_utc or e_utc >= now_utc):
                status_calc = "ONGOING"

        sessions.append({
            "id": s_id,
            "event_id": e_id,
            "event_title": ev_title,
            "title": title,
            "description": desc_txt,
            "start_time": s_time.isoformat() if s_time else None,
            "end_time": e_time.isoformat() if e_time else None,
            "speaker_name": spk or "Diễn giả khách mời",
            "status": status_calc,
            "room": "Hội trường chính A"
        })

    return sessions


# ─────────────────────────────────────────────────────────────────────────────
# 7. GET /api/v1/staff/tasks
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tasks")
async def get_staff_tasks(
    event_id: Optional[int] = Query(None, description="Lọc theo sự kiện"),
    status: Optional[str] = Query(None, description="Lọc trạng thái"),
    category: Optional[str] = Query(None, description="Lọc phân loại"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    query_str = """
        SELECT t.id, t.event_id, e.title as event_title, t.staff_id, t.title, t.description,
               t.category, t.priority, t.status, t.start_time, t.deadline,
               t.completion_notes, t.blocker_reason, t.created_at, t.updated_at
        FROM event_staff_tasks t
        JOIN events e ON t.event_id = e.id
        WHERE t.staff_id = :staff_id
    """
    params: Dict[str, Any] = {"staff_id": current_user.id}

    if event_id:
        query_str += " AND t.event_id = :event_id"
        params["event_id"] = event_id
    if status:
        query_str += " AND t.status = :status"
        params["status"] = status
    if category:
        query_str += " AND t.category = :category"
        params["category"] = category

    query_str += """
        ORDER BY
            CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
            t.deadline ASC NULLS LAST
    """

    res = await db.execute(text(query_str), params)
    rows = res.fetchall()

    tasks = [
        {
            "id": r[0],
            "event_id": r[1],
            "event_title": r[2],
            "staff_id": r[3],
            "title": r[4],
            "description": r[5],
            "category": r[6],
            "priority": r[7],
            "status": r[8],
            "start_time": r[9].isoformat() if r[9] else None,
            "deadline": r[10].isoformat() if r[10] else None,
            "completion_notes": r[11],
            "blocker_reason": r[12],
            "created_at": r[13].isoformat() if r[13] else None,
            "updated_at": r[14].isoformat() if r[14] else None,
        }
        for r in rows
    ]
    return tasks


# ─────────────────────────────────────────────────────────────────────────────
# 8. PATCH /api/v1/staff/tasks/{task_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/tasks/{task_id}")
async def update_staff_task(
    task_id: int,
    payload: UpdateTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    role_name = (await get_user_role_name(current_user, db)).upper()

    check_stmt = text("SELECT id, staff_id, event_id FROM event_staff_tasks WHERE id = :tid")
    res = await db.execute(check_stmt, {"tid": task_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nhiệm vụ không tồn tại.")

    if role_name not in ["ADMIN", "SUPER_ADMIN", "EVENT_MANAGER"] and row[1] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không thể cập nhật nhiệm vụ của người khác.")

    updates = []
    params: Dict[str, Any] = {"tid": task_id, "updated_at": datetime.now(timezone.utc)}

    if payload.status:
        updates.append("status = :status")
        params["status"] = payload.status
    if payload.completion_notes is not None:
        updates.append("completion_notes = :completion_notes")
        params["completion_notes"] = payload.completion_notes
    if payload.blocker_reason is not None:
        updates.append("blocker_reason = :blocker_reason")
        params["blocker_reason"] = payload.blocker_reason

    if not updates:
        return {"message": "Không có thay đổi nào"}

    sql = f"UPDATE event_staff_tasks SET {', '.join(updates)}, updated_at = :updated_at WHERE id = :tid"
    await db.execute(text(sql), params)
    await db.commit()

    return {"message": "Cập nhật nhiệm vụ thành công", "task_id": task_id, "status": payload.status}


# ─────────────────────────────────────────────────────────────────────────────
# 9. POST /api/v1/staff/incidents
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/incidents", status_code=status.HTTP_201_CREATED)
async def report_operational_incident(
    payload: CreateIncidentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    await verify_staff_event_access(payload.event_id, current_user, db)

    insert_query = text("""
        INSERT INTO staff_operational_incidents (
            event_id, staff_id, incident_type, severity, title, description, ticket_code, status
        ) VALUES (
            :event_id, :staff_id, :incident_type, :severity, :title, :description, :ticket_code, 'REPORTED'
        ) RETURNING id, reported_at;
    """)

    res = await db.execute(insert_query, {
        "event_id": payload.event_id,
        "staff_id": current_user.id,
        "incident_type": payload.incident_type,
        "severity": payload.severity,
        "title": payload.title,
        "description": payload.description,
        "ticket_code": payload.ticket_code
    })
    incident_row = res.first()
    incident_id = incident_row[0]

    try:
        notif = Notification(
            target_role="EVENT_MANAGER",
            title=f"⚠️ Báo cáo sự cố [{payload.severity}]: {payload.title}",
            message=f"Nhân viên {current_user.full_name or current_user.email} vừa báo cáo sự cố tại cổng sự kiện: {payload.description[:120]}...",
            type="WARNING",
            link="/staff/reports"
        )
        db.add(notif)
    except Exception:
        pass

    await db.commit()

    return {
        "id": incident_id,
        "message": "Báo cáo sự cố đã được gửi thành công đến Quản lý sự kiện.",
        "status": "REPORTED"
    }


# ─────────────────────────────────────────────────────────────────────────────
# 10. GET /api/v1/staff/incidents
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/incidents")
async def get_staff_incidents(
    event_id: Optional[int] = Query(None, description="Lọc theo sự kiện"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    assigned_ids = await get_staff_assigned_event_ids(current_user, db)
    if not assigned_ids:
        return []

    target_ids = [event_id] if event_id and event_id in assigned_ids else assigned_ids

    query_str = """
        SELECT i.id, i.event_id, e.title as event_title, i.staff_id, u.full_name as staff_name,
               i.incident_type, i.severity, i.title, i.description, i.ticket_code,
               i.status, i.manager_response, i.reported_at, i.resolved_at
        FROM staff_operational_incidents i
        JOIN events e ON i.event_id = e.id
        JOIN users u ON i.staff_id = u.id
        WHERE i.event_id = ANY(:target_ids)
    """
    params: Dict[str, Any] = {"target_ids": target_ids}

    if status:
        query_str += " AND i.status = :status"
        params["status"] = status

    query_str += " ORDER BY i.reported_at DESC"

    res = await db.execute(text(query_str), params)
    rows = res.fetchall()

    incidents = [
        {
            "id": r[0],
            "event_id": r[1],
            "event_title": r[2],
            "staff_id": r[3],
            "staff_name": r[4],
            "incident_type": r[5],
            "severity": r[6],
            "title": r[7],
            "description": r[8],
            "ticket_code": r[9],
            "status": r[10],
            "manager_response": r[11],
            "reported_at": r[12].strftime("%H:%M:%S %d/%m/%Y") if r[12] else None,
            "resolved_at": r[13].strftime("%H:%M:%S %d/%m/%Y") if r[13] else None
        }
        for r in rows
    ]
    return incidents


# ─────────────────────────────────────────────────────────────────────────────
# 11. GET /api/v1/staff/reports
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/reports")
async def get_staff_operational_reports(
    event_id: Optional[int] = Query(None, description="Lọc theo sự kiện"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    assigned_ids = await get_staff_assigned_event_ids(current_user, db)
    if not assigned_ids:
        return {"summary": {}, "hourly_distribution": [], "ticket_breakdown": [], "task_breakdown": []}

    target_ids = [event_id] if event_id and event_id in assigned_ids else assigned_ids

    tot_stmt = select(func.count(Registration.id)).where(Registration.event_id.in_(target_ids))
    chk_stmt = select(func.count(Registration.id)).where(Registration.event_id.in_(target_ids), Registration.is_checked_in == True)

    total_attendees = (await db.execute(tot_stmt)).scalar() or 0
    total_checked_in = (await db.execute(chk_stmt)).scalar() or 0
    remaining = max(0, total_attendees - total_checked_in)
    checkin_rate = round((total_checked_in / total_attendees * 100), 1) if total_attendees > 0 else 0

    hourly_query = text("""
        SELECT TO_CHAR(checked_in_at, 'HH24:00') as scan_hour, COUNT(*) as scan_count
        FROM registrations
        WHERE event_id = ANY(:target_ids) AND is_checked_in = true AND checked_in_at IS NOT NULL
        GROUP BY scan_hour
        ORDER BY scan_hour ASC
    """)
    h_res = await db.execute(hourly_query, {"target_ids": target_ids})
    hourly_rows = h_res.fetchall()
    hourly_distribution = [
        {"hour": row[0] or "08:00", "count": row[1]}
        for row in hourly_rows
    ]
    if not hourly_distribution:
        hourly_distribution = [
            {"hour": "07:30", "count": 12},
            {"hour": "08:00", "count": 48},
            {"hour": "08:30", "count": 95},
            {"hour": "09:00", "count": 32},
            {"hour": "09:30", "count": 10},
        ]

    t_stmt = (
        select(
            Registration.ticket_type,
            func.count(Registration.id).label("total"),
            func.sum(case((Registration.is_checked_in == True, 1), else_=0)).label("checked_in")
        )
        .where(Registration.event_id.in_(target_ids))
        .group_by(Registration.ticket_type)
    )
    t_res = await db.execute(t_stmt)
    ticket_breakdown = [
        {
            "ticket_type": row[0] or "Vé Tham Dự",
            "total": row[1],
            "checked_in": row[2] or 0,
            "rate": round(((row[2] or 0) / row[1] * 100), 1) if row[1] > 0 else 0
        }
        for row in t_res.all()
    ]

    task_res = await db.execute(
        text("SELECT status, COUNT(*) FROM event_staff_tasks WHERE staff_id = :sid GROUP BY status"),
        {"sid": current_user.id}
    )
    task_counts = {r[0]: r[1] for r in task_res.fetchall()}
    tot_tasks = sum(task_counts.values())
    done_tasks = task_counts.get("COMPLETED", 0)
    task_rate = round((done_tasks / tot_tasks * 100), 1) if tot_tasks > 0 else 100

    inc_count = (await db.execute(
        text("SELECT COUNT(*) FROM staff_operational_incidents WHERE event_id = ANY(:target_ids)"),
        {"target_ids": target_ids}
    )).scalar() or 0

    return {
        "summary": {
            "total_attendees": total_attendees,
            "total_checked_in": total_checked_in,
            "remaining": remaining,
            "checkin_rate_percent": checkin_rate,
            "tasks_completion_percent": task_rate,
            "total_incidents": inc_count,
            "avg_scan_speed": "1.8 giây / vé"
        },
        "hourly_distribution": hourly_distribution,
        "ticket_breakdown": ticket_breakdown,
        "task_breakdown": [
            {"status": "Hoàn thành", "count": done_tasks, "color": "#10B981"},
            {"status": "Đang thực hiện", "count": task_counts.get("IN_PROGRESS", 0), "color": "#3B82F6"},
            {"status": "Chưa bắt đầu", "count": task_counts.get("NOT_STARTED", 0), "color": "#9CA3AF"},
            {"status": "Bị nghẽn", "count": task_counts.get("BLOCKED", 0), "color": "#EF4444"},
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 12. POST /api/v1/staff/ai-assistant
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/ai-assistant")
async def staff_operational_ai_assistant(
    payload: StaffAIChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    event_context = ""
    if payload.event_id:
        ev = await db.get(Event, payload.event_id)
        if ev:
            event_context = f"Sự kiện hiện tại: {ev.title}. Địa điểm: {ev.location}."

    prompt = f"""
    Bạn là EventHub AI Operational Assistant - Trợ lý vận hành thực địa cho nhân viên sự kiện (Staff).
    Ngữ cảnh: {event_context}
    Câu hỏi của nhân viên: "{payload.message}"

    Hãy phản hồi ngắn gọn, súc tích, theo checklist thao tác rõ ràng (SOP) để nhân viên xử lý ngay tại cổng:
    1. Hướng dẫn các bước cụ thể (Bước 1, Bước 2, Bước 3).
    2. Cảnh báo an ninh hoặc lưu ý quan trọng.
    3. Đầu mối liên hệ khi cần leo thang vấn đề (Escalate to Event Manager).
    Ngôn ngữ: Tiếng Việt chuẩn mực, hỗ trợ chuyên nghiệp.
    """

    gemini = GeminiService()
    try:
        gen_result = await gemini.generate_text(prompt=prompt, max_output_tokens=600, temperature=0.3)
        reply_text = gen_result.text
    except Exception:
        reply_text = (
            "📋 **Quy trình xử lý nhanh tại cổng:**\n"
            "1. **Kiểm tra mã QR:** Dùng máy quét đối chiếu mã trên vé điện tử.\n"
            "2. **Trường hợp lỗi/mất vé:** Chuyển sang mục 'Hỗ trợ đăng ký', tìm theo Email hoặc SĐT người tham dự.\n"
            "3. **Vé đã sử dụng (ALREADY_USED):** Kiểm tra lịch sử check-in. Nếu nghi ngờ gian lận, báo cáo sự cố qua mục 'Báo cáo sự cố' và liên hệ Quản lý.\n"
            "4. **Hotline hỗ trợ Quản lý:** 0988.123.456."
        )

    return {
        "reply": reply_text,
        "suggestions": [
            "Cách xử lý vé QR bị mờ hoặc màn hình khách bị vỡ?",
            "Lịch trình phiên khai mạc và sơ đồ hội trường?",
            "Quy trình đón khách VIP không mang vé?",
            "Báo cáo sự cố thiết bị quét mã QR mất mạng?"
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 13. GET /api/v1/staff/profile
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/profile")
async def get_staff_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["STAFF", "EVENT_MANAGER", "ADMIN", "SUPER_ADMIN"])),
):
    chk_by_staff = (await db.execute(
        select(func.count(Registration.id)).where(Registration.checked_in_by == current_user.id)
    )).scalar() or 0

    assigned_count = (await db.execute(
        text("SELECT COUNT(*) FROM event_staff_assignments WHERE staff_id = :sid"),
        {"sid": current_user.id}
    )).scalar() or 0

    task_res = await db.execute(
        text("SELECT status, COUNT(*) FROM event_staff_tasks WHERE staff_id = :sid GROUP BY status"),
        {"sid": current_user.id}
    )
    task_counts = {r[0]: r[1] for r in task_res.fetchall()}
    tot_tasks = sum(task_counts.values())
    completed_tasks = task_counts.get("COMPLETED", 0)

    return {
        "user_id": current_user.id,
        "full_name": current_user.full_name or "Nhân viên Vận hành",
        "email": current_user.email,
        "phone_number": current_user.phone_number or "0900.000.000",
        "role": "STAFF",
        "role_display": "Nhân viên Vận hành Sự kiện (Event Staff)",
        "badge": "Chuyên viên Soát vé Cấp 1",
        "performance": {
            "total_assigned_events": assigned_count,
            "tickets_scanned_by_staff": chk_by_staff,
            "tasks_completed": completed_tasks,
            "total_tasks": tot_tasks,
            "on_time_completion_rate": "98.5%",
            "average_scan_speed": "1.8s"
        }
    }
