"""
Check-in API Router (Task 29)
Provides dedicated /checkin endpoints for Staff, Event Managers, and Admins.
Endpoints:
  - POST /api/v1/checkin         : Verify QR token and check-in
  - GET  /api/v1/checkin/history : Fetch recent check-in history
  - POST /api/v1/checkin/manual  : Manual check-in by token or walk-in registration
"""
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.registration import Registration
from app.models.user import User
from app.models.event import EventSchedule, Event
from app.api.v1.registrations import (
    CheckInRequest,
    CheckInResponse,
    verify_check_in,
)

router = APIRouter(prefix="/checkin", tags=["QR Check-in & Scanner"])


class ManualCheckInRequest(BaseModel):
    token: Optional[str] = None
    registration_id: Optional[int] = None
    note: Optional[str] = None


class CheckInHistoryItem(BaseModel):
    id: int
    qr_code_token: str
    participant_name: Optional[str] = None
    participant_email: Optional[str] = None
    ticket_type: Optional[str] = None
    event_title: Optional[str] = None
    is_checked_in: bool
    checked_in_at: Optional[str] = None
    status: str = "SUCCESS"


@router.post("", response_model=CheckInResponse,
             dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def perform_checkin(
    payload: CheckInRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Perform QR code check-in.
    Alias for /api/v1/registrations/check-in.
    """
    return await verify_check_in(payload=payload, db=db)


@router.get("/history", response_model=List[CheckInHistoryItem],
            dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def get_checkin_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Get recently checked-in attendee history.
    """
    stmt = (
        select(
            Registration.id,
            Registration.qr_code_token,
            Registration.full_name,
            Registration.email,
            Registration.ticket_type,
            Registration.schedule_id,
            Registration.session_id,
            Registration.event_id,
            Registration.is_checked_in,
            Registration.checked_in_at,
            Registration.participant_id
        )
        .where(Registration.is_checked_in == True)
        .order_by(Registration.checked_in_at.desc())
        .limit(min(max(1, limit), 100))
    )
    res = await db.execute(stmt)
    rows = res.all()

    items: List[CheckInHistoryItem] = []
    for row in rows:
        reg_id, token, full_name, email, ticket_type, schedule_id, session_id, event_id, is_checked_in, checked_in_at, participant_id = row

        # Resolve attendee name
        p_name = full_name
        if not p_name and participant_id:
            u_stmt = select(User.full_name, User.email).where(User.id == participant_id)
            u_res = await db.execute(u_stmt)
            u_row = u_res.first()
            if u_row:
                p_name = u_row[0] or u_row[1]
        if not p_name:
            p_name = f"Khách #{participant_id}"

        # Resolve session/event title
        ev_title = None
        target_s_id = schedule_id or session_id
        if target_s_id:
            s_stmt = select(EventSchedule.title).where(EventSchedule.id == target_s_id)
            s_res = await db.execute(s_stmt)
            s_row = s_res.first()
            if s_row:
                ev_title = s_row[0]
        if not ev_title and event_id:
            e_stmt = select(Event.title).where(Event.id == event_id)
            e_res = await db.execute(e_stmt)
            e_row = e_res.first()
            if e_row:
                ev_title = e_row[0]

        time_str = ""
        if checked_in_at:
            time_str = checked_in_at.strftime("%H:%M:%S %d/%m/%Y")

        items.append(
            CheckInHistoryItem(
                id=reg_id,
                qr_code_token=token,
                participant_name=p_name,
                participant_email=email,
                ticket_type=ticket_type or "Vé Tham Dự",
                event_title=ev_title,
                is_checked_in=bool(is_checked_in),
                checked_in_at=time_str,
                status="SUCCESS"
            )
        )

    return items


@router.post("/manual", response_model=CheckInResponse,
             dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def manual_checkin_ticket(
    payload: ManualCheckInRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Manual check-in by token or registration_id.
    """
    if payload.token:
        return await verify_check_in(payload=CheckInRequest(token=payload.token), db=db)
    elif payload.registration_id:
        now_vn = datetime.now(timezone.utc) + timedelta(hours=7)
        stmt = select(Registration).where(Registration.id == payload.registration_id)
        res = await db.execute(stmt)
        reg = res.scalar_one_or_none()
        if not reg:
            return CheckInResponse(
                status="INVALID",
                message=f"Không tìm thấy vé đăng ký ID #{payload.registration_id}!",
            )

        p_name = reg.full_name or f"Khách #{reg.participant_id}"
        if reg.is_checked_in:
            c_time = reg.checked_in_at.strftime("%H:%M:%S %d/%m/%Y") if reg.checked_in_at else "08:30:00"
            return CheckInResponse(
                status="ALREADY_USED",
                message=f"Vé này đã được check-in lúc {c_time} tại Cổng A!",
                participantName=p_name,
                ticketType=reg.ticket_type or "Vé Tham Dự",
                checkInTime=c_time,
                token=reg.qr_code_token,
            )

        reg.is_checked_in = True
        reg.checked_in_at = now_vn
        db.add(reg)
        await db.commit()

        c_time = now_vn.strftime("%H:%M:%S %d/%m/%Y")
        return CheckInResponse(
            status="SUCCESS",
            message="Check-in thủ công thành công!",
            participantName=p_name,
            ticketType=reg.ticket_type or "Vé Tham Dự",
            checkInTime=c_time,
            token=reg.qr_code_token,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp mã token vé hoặc ID đăng ký để check-in thủ công."
        )
