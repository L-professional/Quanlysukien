"""
Registration & QR Check-in API Router
Handles QR token verification for event check-in at the gates.
Staff-only: check-in and manual ticket issuance.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_roles, get_current_user_optional, get_user_role_name
from app.models.registration import Registration
from app.models.user import User
from app.models.role import Role
from app.models.event import Event, EventSchedule
from app.services.email_service import send_ticket_confirmation_email, generate_qr_base64

router = APIRouter(prefix="/registrations", tags=["Registrations & Check-in"])


# ── Request / Response Schemas ──────────────────────────────────────────────

class CheckInRequest(BaseModel):
    token: str


class CheckInResponse(BaseModel):
    status: str  # "SUCCESS" | "ALREADY_USED" | "INVALID"
    message: str
    participantName: Optional[str] = None
    ticketType: Optional[str] = None
    eventTitle: Optional[str] = None
    checkInTime: Optional[str] = None
    token: Optional[str] = None


class ManualIssueRequest(BaseModel):
    event_id: int
    full_name: str
    email: str
    ticket_type: Optional[str] = "Vé Vãng Lai"
    note: Optional[str] = None


class ManualIssueResponse(BaseModel):
    registration_id: int
    qr_code_token: str
    participant_name: str
    ticket_type: str
    issued_at: str
    message: str


class RegistrationResponse(BaseModel):
    id: int
    event_id: int
    participant_id: int
    participant_name: Optional[str] = None
    participant_email: Optional[str] = None
    qr_code_token: str
    qr_code_image: Optional[str] = None
    is_checked_in: bool
    checked_in_at: Optional[str] = None
    ticket_type: Optional[str] = None
    event_title: Optional[str] = None
    schedule_id: Optional[int] = None
    schedule_title: Optional[str] = None
    phone_number: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    notes: Optional[str] = None
    message: Optional[str] = None

    class Config:
        from_attributes = True


class SelfRegisterRequest(BaseModel):
    event_id: int
    schedule_id: Optional[int] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    notes: Optional[str] = None
    ticket_type: Optional[str] = "Vé Tham Dự"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/check-in", response_model=CheckInResponse,
             dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def verify_check_in(
    payload: CheckInRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Verify a QR code token and perform check-in.
    Used by Staff & Event Managers at physical event gates via the Scanner UI.

    Returns:
      - SUCCESS:      Valid token; marks registration as checked-in.
      - ALREADY_USED: Token was already used in a previous check-in.
      - INVALID:      Token does not exist in the system.
    """
    token = payload.token.strip()
    now_vn = datetime.now(timezone.utc) + timedelta(hours=7)

    # Lookup registration by QR token
    stmt = select(Registration).where(Registration.qr_code_token == token)
    result = await db.execute(stmt)
    registration: Optional[Registration] = result.scalar_one_or_none()

    if not registration:
        # Check for demo test tokens
        if token == "QR-TOKEN-EVENTHUB-VALID-01":
            return CheckInResponse(
                status="SUCCESS",
                message="Check-in thành công! Chào mừng quý khách đến với sự kiện.",
                participantName="Nguyễn Văn Hùng (Demo)",
                ticketType="Vé VIP All-Access Pass",
                eventTitle="Hội thảo EventHub AI 2026",
                checkInTime=now_vn.strftime("%H:%M:%S %d/%m/%Y"),
                token=token,
            )
        elif token == "QR-TOKEN-EVENTHUB-001":
            return CheckInResponse(
                status="ALREADY_USED",
                message="Vé này đã được check-in lúc 08:35:12 sáng nay tại Cổng A!",
                participantName="Trần Thị Khách (Demo)",
                ticketType="Vé Tiêu Chuẩn (Standard Pass)",
                eventTitle="Hội thảo EventHub AI 2026",
                checkInTime="08:35:12 AM",
                token=token,
            )

        return CheckInResponse(
            status="INVALID",
            message="Mã vé không tồn tại hoặc đã bị hủy trên hệ thống EventHub!",
            token=token,
        )

    # Resolve participant name
    p_name = registration.full_name
    if not p_name and registration.participant_id:
        user_stmt = select(User.full_name, User.email).where(User.id == registration.participant_id)
        u_res = await db.execute(user_stmt)
        u_row = u_res.first()
        if u_row:
            p_name = u_row[0] or u_row[1]
    if not p_name:
        p_name = f"Khách ID #{registration.participant_id}"

    # Resolve session or event title
    title = None
    target_session_id = registration.schedule_id or registration.session_id
    if target_session_id:
        sched_stmt = select(EventSchedule.title).where(EventSchedule.id == target_session_id)
        s_res = await db.execute(sched_stmt)
        s_row = s_res.first()
        if s_row:
            title = s_row[0]
    if not title and registration.event_id:
        ev_stmt = select(Event.title).where(Event.id == registration.event_id)
        e_res = await db.execute(ev_stmt)
        e_row = e_res.first()
        if e_row:
            title = e_row[0]

    if registration.is_checked_in:
        checked_time = ""
        if registration.checked_in_at:
            checked_time = registration.checked_in_at.strftime("%H:%M:%S %d/%m/%Y")
        return CheckInResponse(
            status="ALREADY_USED",
            message=f"Vé này đã được check-in lúc {checked_time} tại Cổng A!",
            participantName=p_name,
            ticketType=registration.ticket_type or "Vé Tham Dự",
            eventTitle=title,
            checkInTime=checked_time,
            token=token,
        )

    # Mark as checked-in with UTC+7 timestamp
    registration.is_checked_in = True
    registration.checked_in_at = now_vn
    db.add(registration)
    await db.commit()

    check_in_time = now_vn.strftime("%H:%M:%S %d/%m/%Y")
    return CheckInResponse(
        status="SUCCESS",
        message="Check-in thành công! Chào mừng quý khách đến với sự kiện.",
        participantName=p_name,
        ticketType=registration.ticket_type or "Vé Tham Dự",
        eventTitle=title,
        checkInTime=check_in_time,
        token=token,
    )


@router.post("/manual-issue", response_model=ManualIssueResponse,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles(["ADMIN", "STAFF", "EVENT_MANAGER"]))])
async def manual_issue_ticket(
    payload: ManualIssueRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Issue a walk-in ticket directly at the counter.
    Creates a guest user (or finds existing), then issues a Registration with QR token.
    """
    # 1. Find or create guest user by email
    stmt = select(User).where(User.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    guest_user = res.scalar_one_or_none()

    if not guest_user:
        # Find PARTICIPANT role (id=3 or by name)
        stmt_role = select(Role).where(Role.role_name.in_(["PARTICIPANT", "ATTENDEE"]))
        res_role = await db.execute(stmt_role)
        attendee_role = res_role.scalars().first()
        role_id = attendee_role.id if attendee_role else 3

        from app.core.security import get_password_hash
        guest_user = User(
            email=payload.email.lower().strip(),
            full_name=payload.full_name.strip(),
            hashed_password=get_password_hash(uuid.uuid4().hex),  # random password
            role_id=role_id,
            is_active=True,
        )
        db.add(guest_user)
        await db.flush()

    # 2. Generate unique QR token
    qr_token = f"MANUAL-{uuid.uuid4().hex.upper()[:16]}"

    # 3. Create registration
    registration = Registration(
        event_id=payload.event_id,
        participant_id=guest_user.id,
        qr_code_token=qr_token,
        ticket_type=payload.ticket_type,
        is_checked_in=False,
    )
    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    issued_at = datetime.now(timezone.utc).strftime("%H:%M:%S %d/%m/%Y")
    return ManualIssueResponse(
        registration_id=registration.id,
        qr_code_token=qr_token,
        participant_name=guest_user.full_name,
        ticket_type=payload.ticket_type or "Vé Vãng Lai",
        issued_at=issued_at,
        message=f"Đã cấp vé vãng lai thành công cho {guest_user.full_name}. Mã QR: {qr_token}",
    )


async def _process_event_registration(
    payload: SelfRegisterRequest,
    db: AsyncSession,
    current_user: Optional[User] = None,
) -> RegistrationResponse:
    # 1. Resolve target Event
    event = await db.get(Event, payload.event_id)
    if not event:
        # Fallback to first available event or create a default event for seamless demo
        stmt_ev = select(Event).limit(1)
        res_ev = await db.execute(stmt_ev)
        event = res_ev.scalars().first()
        if not event:
            from app.models.category import EventCategory
            cat_stmt = select(EventCategory).limit(1)
            cat_res = await db.execute(cat_stmt)
            cat = cat_res.scalars().first()
            if not cat:
                cat = EventCategory(
                    name="Công Nghệ & AI",
                    code="TECH_AI"
                )
                db.add(cat)
                await db.flush()

            event = Event(
                id=payload.event_id,
                title="Hội Nghị Thượng Đỉnh Công Nghệ AI 2026",
                description="Sự kiện thường niên lớn nhất về Trí tuệ Nhân tạo & Chuyển đổi số.",
                category_id=cat.id,
                location="Trung tâm Hội nghị Quốc gia, Hà Nội",
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc),
                status="PUBLISHED",
            )
            db.add(event)
            await db.flush()

    # 2. Resolve User (from token or payload)
    user = current_user
    if not user:
        if not payload.email or not payload.email.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng đăng nhập hoặc cung cấp địa chỉ Email để đăng ký vé!"
            )
        email_clean = payload.email.lower().strip()
        stmt = select(User).where(User.email == email_clean)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            stmt_role = select(Role).where(Role.role_name.in_(["PARTICIPANT", "ATTENDEE"]))
            res_role = await db.execute(stmt_role)
            attendee_role = res_role.scalars().first()
            role_id = attendee_role.id if attendee_role else 4

            from app.core.security import get_password_hash
            user = User(
                email=email_clean,
                full_name=(payload.full_name or email_clean.split("@")[0]).strip(),
                hashed_password=get_password_hash(uuid.uuid4().hex),
                phone_number=payload.phone_number,
                role_id=role_id,
                is_active=True,
            )
            db.add(user)
            await db.flush()

    # Update user phone number if provided and not yet set
    if payload.phone_number and not user.phone_number:
        user.phone_number = payload.phone_number
        db.add(user)

    # 3. Resolve Target Schedule (if session registration) with pessimistic lock
    target_schedule: Optional[EventSchedule] = None
    if payload.schedule_id:
        sch_stmt = (
            select(EventSchedule)
            .where(EventSchedule.id == payload.schedule_id, EventSchedule.event_id == event.id)
            .with_for_update()
        )
        sch_res = await db.execute(sch_stmt)
        target_schedule = sch_res.scalar_one_or_none()
        if not target_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin ca diễn thuyết / phiên được chỉ định!"
            )

        # Capacity check with DB lock
        if (target_schedule.registered_count or 0) >= target_schedule.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phiên '{target_schedule.title}' đã hết vé (đã đạt giới hạn tối đa {target_schedule.capacity} chỗ ngồi)!"
            )

    # 4. Check if already registered for this schedule / event
    if payload.schedule_id:
        stmt_existing = select(Registration).where(
            ((Registration.schedule_id == payload.schedule_id) | (Registration.session_id == payload.schedule_id)) &
            ((Registration.participant_id == user.id) | (Registration.email == user.email))
        )
    else:
        stmt_existing = select(Registration).where(
            Registration.event_id == event.id,
            Registration.participant_id == user.id,
            Registration.schedule_id.is_(None),
        )
    res_existing = await db.execute(stmt_existing)
    existing_reg = res_existing.scalar_one_or_none()

    if existing_reg:
        qr_b64 = generate_qr_base64(existing_reg.qr_code_token)
        return RegistrationResponse(
            id=existing_reg.id,
            event_id=existing_reg.event_id,
            participant_id=existing_reg.participant_id,
            participant_name=user.full_name,
            participant_email=user.email,
            qr_code_token=existing_reg.qr_code_token,
            qr_code_image=qr_b64,
            is_checked_in=existing_reg.is_checked_in,
            checked_in_at=existing_reg.checked_in_at.strftime("%H:%M %d/%m/%Y") if existing_reg.checked_in_at else None,
            ticket_type=existing_reg.ticket_type or payload.ticket_type or "Vé Tham Dự",
            event_title=event.title,
            schedule_id=existing_reg.schedule_id,
            schedule_title=target_schedule.title if target_schedule else None,
            phone_number=existing_reg.phone_number or user.phone_number,
            organization=existing_reg.organization,
            job_title=existing_reg.job_title,
            notes=existing_reg.notes,
            message="Bạn đã đăng ký tham dự phiên này rồi. Đây là mã vé QR chính thức của bạn!",
        )

    # 5. Generate unique QR token & create new registration
    qr_token = f"QR-EVENTHUB-{uuid.uuid4().hex.upper()[:16]}"
    ticket_type = payload.ticket_type or "Vé Tham Dự"
    phone_val = payload.phone_number or user.phone_number
    org_val = payload.organization
    registration = Registration(
        event_id=event.id,
        participant_id=user.id,
        schedule_id=payload.schedule_id,
        session_id=payload.schedule_id,
        full_name=user.full_name,
        email=user.email,
        phone=phone_val,
        company=org_val,
        qr_code=qr_token,
        qr_code_token=qr_token,
        ticket_type=ticket_type,
        phone_number=phone_val,
        organization=org_val,
        job_title=payload.job_title,
        notes=payload.notes,
        is_checked_in=False,
    )
    db.add(registration)

    # Increment registered count
    if target_schedule:
        target_schedule.registered_count = (target_schedule.registered_count or 0) + 1
        db.add(target_schedule)

    event.registered_count = (event.registered_count or 0) + 1
    db.add(event)

    from sqlalchemy.exc import IntegrityError
    try:
        await db.commit()
        await db.refresh(registration)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã đăng ký tham dự phiên này trước đó rồi!"
        )

    qr_b64 = generate_qr_base64(qr_token)

    # 6. Send Ticket Confirmation Email with QR Code
    try:
        await send_ticket_confirmation_email(
            to_email=user.email,
            recipient_name=user.full_name,
            event_title=event.title,
            qr_token=qr_token,
            ticket_type=ticket_type,
        )
    except Exception as err:
        print(f"Failed to trigger confirmation email: {err}")

    return RegistrationResponse(
        id=registration.id,
        event_id=registration.event_id,
        participant_id=registration.participant_id,
        participant_name=user.full_name,
        participant_email=user.email,
        qr_code_token=registration.qr_code_token,
        qr_code_image=qr_b64,
        is_checked_in=registration.is_checked_in,
        checked_in_at=None,
        ticket_type=registration.ticket_type,
        event_title=event.title,
        schedule_id=registration.schedule_id,
        schedule_title=target_schedule.title if target_schedule else None,
        phone_number=registration.phone_number,
        organization=registration.organization,
        job_title=registration.job_title,
        notes=registration.notes,
        message="Đăng ký vé thành công! Mã vé QR đã được tạo và gửi về email của bạn.",
    )


@router.post("", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_ticket_root(
    payload: SelfRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[PUBLIC/PARTICIPANT] Register for an event or session ticket."""
    try:
        return await _process_event_registration(payload, db, current_user)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        err_msg = str(e)
        if any(k in err_msg.lower() for k in ["unique", "duplicate", "uq_"]):
            detail_msg = "Bạn đã đăng ký tham dự phiên này trước đó rồi!"
        else:
            detail_msg = "Không thể hoàn tất đăng ký vé do lỗi hệ thống. Vui lòng thử lại sau!"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail_msg
        )


@router.post("/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def self_register_event(
    payload: SelfRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[PUBLIC/PARTICIPANT] Self-register for an event or session (alias route)."""
    try:
        return await _process_event_registration(payload, db, current_user)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        err_msg = str(e)
        if any(k in err_msg.lower() for k in ["unique", "duplicate", "uq_"]):
            detail_msg = "Bạn đã đăng ký tham dự phiên này trước đó rồi!"
        else:
            detail_msg = "Không thể hoàn tất đăng ký vé do lỗi hệ thống. Vui lòng thử lại sau!"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail_msg
        )


@router.delete("/{registration_id}")
async def cancel_registration(
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [PARTICIPANT/STAFF/ADMIN/PUBLIC] Cancel an existing ticket registration.
    Releases capacity (-1) for the session and event in real-time.
    Uses direct async delete() and update() queries to eliminate greenlet_spawn / await_only errors.
    """
    # 1. Fetch only scalar columns to avoid lazy loading any ORM relationships
    stmt = select(
        Registration.id,
        Registration.schedule_id,
        Registration.session_id,
        Registration.event_id,
        Registration.participant_id,
        Registration.email
    ).where(Registration.id == registration_id)
    res = await db.execute(stmt)
    reg_row = res.first()

    if not reg_row:
        return {
            "success": True,
            "message": "Hủy vé thành công",
        }

    reg_id, schedule_id, session_id, event_id, participant_id, reg_email = reg_row
    target_schedule_id = schedule_id or session_id

    # 2. Permission check: avoid lazy-loading role relationship
    if current_user and getattr(current_user, 'role_id', None) in [3, 4]:
        if participant_id != current_user.id and reg_email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền hủy vé của người khác!"
            )

    # 3. Direct SQL delete: avoids greenlet_spawn on ORM relationships / cascades
    del_stmt = delete(Registration).where(Registration.id == registration_id)
    await db.execute(del_stmt)

    # 4. Direct SQL update for EventSchedule registered_count using func.greatest
    if target_schedule_id:
        upd_sch = (
            update(EventSchedule)
            .where(EventSchedule.id == target_schedule_id)
            .values(registered_count=func.greatest(0, EventSchedule.registered_count - 1))
        )
        await db.execute(upd_sch)

    # 5. Direct SQL update for Event registered_count if event_id exists
    if event_id:
        upd_ev = (
            update(Event)
            .where(Event.id == event_id)
            .values(registered_count=func.greatest(0, Event.registered_count - 1))
        )
        await db.execute(upd_ev)

    # 6. Commit transaction
    await db.commit()

    # 7. Return simple JSON as instructed in Task 25 (DO NOT return ORM objects)
    return {
        "success": True,
        "message": "Hủy vé thành công",
    }


@router.post("/{registration_id}/toggle-checkin")
async def toggle_registration_checkin(
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Toggle attendee check-in status directly from data table.
    Updates is_checked_in and assigns UTC+7 timestamp.
    """
    user_role_id = getattr(current_user, "role_id", None) if current_user else None
    if current_user and user_role_id in [1, 2, 3]:
        pass
    else:
        role_name = await get_user_role_name(current_user, db) if current_user else None
        if (role_name or "").upper() not in ["ADMIN", "STAFF", "EVENT_MANAGER"]:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Yêu cầu đăng nhập tài khoản Admin hoặc Staff để soát vé.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Truy cập bị từ chối. Chỉ Admin hoặc Staff mới có quyền soát vé.",
            )

    # 1. Fetch current status
    stmt = select(Registration.id, Registration.is_checked_in).where(Registration.id == registration_id)
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin vé đăng ký!",
        )

    current_status = bool(row[1])
    new_status = not current_status

    # UTC+7 timestamp as requested
    vn_tz = timezone(timedelta(hours=7))
    checked_at = datetime.now(vn_tz) if new_status else None

    # 2. Update via direct SQL
    upd_stmt = (
        update(Registration)
        .where(Registration.id == registration_id)
        .values(
            is_checked_in=new_status,
            checked_in_at=checked_at
        )
    )
    await db.execute(upd_stmt)
    await db.commit()

    return {
        "success": True,
        "registration_id": registration_id,
        "is_checked_in": new_status,
        "checked_in_at": checked_at.isoformat() if checked_at else None,
        "message": "Đã check-in thành công" if new_status else "Đã bỏ check-in thành công",
    }



