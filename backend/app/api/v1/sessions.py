import uuid
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select, delete, update, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_optional, get_current_user, get_user_role_name
from app.models.registration import Registration
from app.models.user import User
from app.models.role import Role
from app.models.event import Event, EventSchedule
from app.models.session_interaction import SessionQuestion, SessionMaterial, SessionFeedback
from app.models.reminder import UserReminder
from app.api.v1.registrations import RegistrationResponse
from app.services.email_service import send_ticket_confirmation_email, generate_qr_base64

router = APIRouter(prefix="/sessions", tags=["Sessions & Registration"])


class SessionRegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    company: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    notes: Optional[str] = None
    ticket_type: Optional[str] = "Vé Tham Dự"


@router.post("/{session_id}/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_session_ticket(
    session_id: int,
    payload: SessionRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [PUBLIC/PARTICIPANT] Register for a specific session/schedule ticket.
    - Locks the session row to prevent race condition overbooking
    - Validates capacity
    - Prevents duplicate registration per email/account
    - Generates unique QR Code token: QR_SESS_{session_id}_USER_{user_id}
    - Increments registered_count in the same transaction
    """
    try:
        # 1. Lock the session/schedule row with FOR UPDATE
        stmt = (
            select(EventSchedule)
            .where(EventSchedule.id == session_id)
            .with_for_update()
        )
        res = await db.execute(stmt)
        schedule: Optional[EventSchedule] = res.scalar_one_or_none()
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin ca diễn thuyết / phiên này!"
            )

        # 2. Check capacity
        max_capacity = schedule.capacity if schedule.capacity is not None else 100
        current_registered = schedule.registered_count if schedule.registered_count is not None else 0
        if current_registered >= max_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phiên đã hết vé (đã đạt giới hạn tối đa số lượng người tham gia)!"
            )

        # 3. Resolve user (from auth or lookup by email)
        user = current_user
        email_clean = payload.email.lower().strip()
        if not user:
            if not email_clean:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng cung cấp địa chỉ Email để đăng ký vé!"
                )
            u_stmt = select(User).where(User.email == email_clean)
            u_res = await db.execute(u_stmt)
            user = u_res.scalar_one_or_none()

            if not user:
                stmt_role = select(Role).where(Role.role_name.in_(["PARTICIPANT", "ATTENDEE"]))
                res_role = await db.execute(stmt_role)
                attendee_role = res_role.scalars().first()
                role_id = attendee_role.id if attendee_role else 4

                from app.core.security import get_password_hash
                phone_val = (payload.phone or payload.phone_number or "").strip() or None
                user = User(
                    email=email_clean,
                    full_name=payload.full_name.strip() if payload.full_name else email_clean.split("@")[0],
                    hashed_password=get_password_hash(uuid.uuid4().hex),
                    phone_number=phone_val,
                    role_id=role_id,
                    is_active=True,
                )
                db.add(user)
                await db.flush()

        # Update phone if provided and not yet set
        phone_val = (payload.phone or payload.phone_number or "").strip() or None
        if phone_val and not user.phone_number:
            user.phone_number = phone_val
            db.add(user)

        # 4. Check if already registered for this session
        exist_stmt = select(Registration).where(
            ((Registration.schedule_id == session_id) | (Registration.session_id == session_id)) &
            ((Registration.participant_id == user.id) | (Registration.email == email_clean))
        )
        exist_res = await db.execute(exist_stmt)
        existing_reg = exist_res.scalar_one_or_none()
        if existing_reg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã đăng ký tham dự phiên này trước đó rồi!"
            )

        # 5. Generate unique QR Code token: QR_SESS_{session_id}_USER_{user_id}
        qr_token = f"QR_SESS_{session_id}_USER_{user.id}_{uuid.uuid4().hex.upper()[:6]}"
        ticket_type = payload.ticket_type or "Vé Tham Dự"
        org_val = (payload.company or payload.organization or "").strip() or None
        job_val = (payload.job_title or "").strip() or None
        notes_val = (payload.notes or "").strip() or None
        full_name_val = payload.full_name.strip() if payload.full_name else user.full_name

        registration = Registration(
            event_id=schedule.event_id,
            schedule_id=session_id,
            session_id=session_id,
            participant_id=user.id,
            full_name=full_name_val,
            email=email_clean,
            phone=phone_val or user.phone_number,
            company=org_val,
            qr_code=qr_token,
            qr_code_token=qr_token,
            ticket_type=ticket_type,
            phone_number=phone_val or user.phone_number,
            organization=org_val,
            job_title=job_val,
            notes=notes_val,
            is_checked_in=False,
        )
        db.add(registration)

        # Increment registered_count in the same database transaction
        schedule.registered_count = current_registered + 1
        db.add(schedule)

        # Increment event registered_count
        ev_stmt = select(Event).where(Event.id == schedule.event_id).with_for_update()
        ev_res = await db.execute(ev_stmt)
        event = ev_res.scalar_one_or_none()
        if event:
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

        # Send confirmation email
        try:
            await send_ticket_confirmation_email(
                to_email=user.email,
                recipient_name=user.full_name,
                event_title=schedule.title,
                qr_token=qr_token,
                ticket_type=ticket_type,
            )
        except Exception as err:
            print(f"Failed to send confirmation email: {err}")

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
            event_title=event.title if event else "EventHub AI Summit 2026",
            schedule_id=schedule.id,
            schedule_title=schedule.title,
            phone_number=registration.phone_number,
            organization=registration.organization,
            job_title=registration.job_title,
            notes=registration.notes,
            message="Đăng ký vé thành công! Mã QR của bạn đã sẵn sàng.",
        )
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


@router.delete("/{session_id}/cancel")
async def cancel_session_ticket(
    session_id: int,
    registration_id: Optional[int] = None,
    qr_token: Optional[str] = None,
    email: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [PUBLIC/PARTICIPANT] Cancel ticket registration for a specific session.
    1. Uses direct async select to find target registration id and event_id.
    2. Deletes with direct async delete(Registration) to prevent greenlet_spawn / lazy load errors.
    3. Decrements registered_count with direct async update(EventSchedule) using func.greatest(0, ...).
    4. Decrements event registered_count with direct async update(Event) using func.greatest(0, ...).
    5. Returns simple JSON response: {"success": True, "message": "Hủy vé thành công"}.
    """
    try:
        # Build lookup query for target registration
        conditions = [
            (Registration.schedule_id == session_id) | (Registration.session_id == session_id)
        ]

        if registration_id:
            conditions.append(Registration.id == registration_id)
        elif qr_token:
            clean_qr = qr_token.strip()
            conditions.append((Registration.qr_code_token == clean_qr) | (Registration.qr_code == clean_qr))
        elif current_user:
            conditions.append((Registration.participant_id == current_user.id) | (Registration.email == current_user.email))
        elif email:
            conditions.append(Registration.email == email.strip().lower())

        # Select only scalar columns: id, event_id, participant_id, email (no ORM object load)
        reg_stmt = select(
            Registration.id,
            Registration.event_id,
            Registration.participant_id,
            Registration.email
        ).where(*conditions).order_by(Registration.id.desc())
        reg_res = await db.execute(reg_stmt)
        reg_row = reg_res.first()

        # Fallback to direct registration_id if not found by session conditions
        if not reg_row and registration_id:
            reg_stmt2 = select(
                Registration.id,
                Registration.event_id,
                Registration.participant_id,
                Registration.email
            ).where(Registration.id == registration_id)
            reg_res2 = await db.execute(reg_stmt2)
            reg_row = reg_res2.first()

        if not reg_row:
            # If already deleted or doesn't exist, return clean success immediately
            return {
                "success": True,
                "message": "Hủy vé thành công",
            }

        target_reg_id, target_event_id, participant_id, reg_email = reg_row

        # Check permissions if authenticated participant (avoiding lazy-loaded role)
        if current_user and getattr(current_user, 'role_id', None) in [3, 4]:
            if participant_id != current_user.id and reg_email != current_user.email:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền hủy vé của người khác!"
                )

        # 1. Direct async SQL delete: avoids greenlet_spawn on ORM relationships / cascades
        del_stmt = delete(Registration).where(Registration.id == target_reg_id)
        await db.execute(del_stmt)

        # 2. Direct async SQL update for EventSchedule registered_count using func.greatest
        upd_sch = (
            update(EventSchedule)
            .where(EventSchedule.id == session_id)
            .values(registered_count=func.greatest(0, EventSchedule.registered_count - 1))
        )
        await db.execute(upd_sch)

        # 3. Direct async SQL update for Event registered_count if target_event_id exists
        if target_event_id:
            upd_ev = (
                update(Event)
                .where(Event.id == target_event_id)
                .values(registered_count=func.greatest(0, Event.registered_count - 1))
            )
            await db.execute(upd_ev)

        # 4. Commit transaction
        await db.commit()

        # 5. Return simple JSON as instructed in Task 25 (DO NOT return ORM objects)
        return {
            "success": True,
            "message": "Hủy vé thành công",
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi hủy vé: {str(e)}"
        )


@router.get("/{session_id}/registrations")
async def get_session_registrations(
    session_id: int,
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [ADMIN/STAFF/EVENT_MANAGER] Get attendees list for a specific session.
    Supports real-time keyword search (name, email, phone, company, qr_token)
    and status filter (all, checked_in, not_checked_in).
    """
    # Verify RBAC: Allow ADMIN, STAFF, EVENT_MANAGER
    user_role_id = getattr(current_user, "role_id", None) if current_user else None
    if current_user and user_role_id in [1, 2, 3]:
        pass
    else:
        role_name = await get_user_role_name(current_user, db) if current_user else None
        if (role_name or "").upper() not in ["ADMIN", "STAFF", "EVENT_MANAGER"]:
            if not current_user:
                raise HTTPException(
                    status_code=status_code.HTTP_401_UNAUTHORIZED if 'status_code' in locals() else status.HTTP_401_UNAUTHORIZED,
                    detail="Yêu cầu đăng nhập tài khoản Admin hoặc Staff để xem danh sách.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Truy cập bị từ chối. Chỉ tài khoản Admin hoặc Staff mới có quyền truy cập.",
            )

    conditions = [
        (Registration.schedule_id == session_id) | (Registration.session_id == session_id)
    ]

    # Keyword search
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(Registration.full_name).ilike(term),
                func.lower(Registration.email).ilike(term),
                func.lower(Registration.phone).ilike(term),
                func.lower(Registration.phone_number).ilike(term),
                func.lower(Registration.company).ilike(term),
                func.lower(Registration.organization).ilike(term),
                func.lower(Registration.qr_code_token).ilike(term),
            )
        )

    # Status filter
    filter_val = status_filter or status
    if filter_val == "checked_in":
        conditions.append(Registration.is_checked_in.is_(True))
    elif filter_val == "not_checked_in":
        conditions.append(Registration.is_checked_in.is_(False))

    stmt = (
        select(
            Registration.id,
            Registration.full_name,
            Registration.email,
            Registration.phone,
            Registration.phone_number,
            Registration.company,
            Registration.organization,
            Registration.job_title,
            Registration.ticket_type,
            Registration.qr_code_token,
            Registration.is_checked_in,
            Registration.checked_in_at,
            Registration.created_at,
            Registration.notes,
        )
        .where(*conditions)
        .order_by(Registration.id.desc())
    )

    res = await db.execute(stmt)
    rows = res.all()

    attendees = []
    for r in rows:
        created_str = r.created_at.isoformat() if r.created_at else None
        checked_str = r.checked_in_at.isoformat() if r.checked_in_at else None
        attendees.append({
            "id": r.id,
            "full_name": r.full_name or "Khách Tham Dự",
            "email": r.email or "",
            "phone": r.phone or r.phone_number or "",
            "company": r.company or r.organization or "",
            "job_title": r.job_title or "",
            "ticket_type": r.ticket_type or "Vé Tham Dự",
            "qr_code_token": r.qr_code_token,
            "is_checked_in": bool(r.is_checked_in),
            "checked_in_at": checked_str,
            "created_at": created_str,
            "notes": r.notes or "",
        })

    return {
        "success": True,
        "session_id": session_id,
        "total": len(attendees),
        "checked_in_count": sum(1 for a in attendees if a["is_checked_in"]),
        "not_checked_in_count": sum(1 for a in attendees if not a["is_checked_in"]),
        "data": attendees,
    }


@router.get("/{session_id}/export-excel")
async def export_session_attendees_excel(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [ADMIN/STAFF] Export attendee list to CSV/Excel format with UTF-8 BOM.
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
                    detail="Yêu cầu đăng nhập tài khoản Admin hoặc Staff để xuất dữ liệu.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Truy cập bị từ chối. Chỉ tài khoản Admin hoặc Staff mới có quyền xuất dữ liệu.",
            )

    # Get session title
    sch_stmt = select(EventSchedule.title).where(EventSchedule.id == session_id)
    sch_res = await db.execute(sch_stmt)
    session_title = sch_res.scalar_one_or_none() or f"Phien_{session_id}"

    # Get all attendees for this session
    stmt = (
        select(
            Registration.id,
            Registration.full_name,
            Registration.email,
            Registration.phone,
            Registration.phone_number,
            Registration.company,
            Registration.organization,
            Registration.job_title,
            Registration.ticket_type,
            Registration.qr_code_token,
            Registration.is_checked_in,
            Registration.checked_in_at,
            Registration.created_at,
        )
        .where(
            (Registration.schedule_id == session_id) | (Registration.session_id == session_id)
        )
        .order_by(Registration.id.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    output = io.StringIO()
    # Write UTF-8 BOM for Microsoft Excel Vietnamese character support
    output.write("\ufeff")

    writer = csv.writer(output)
    writer.writerow([
        "STT",
        "Họ và Tên",
        "Email",
        "Số Điện Thoại",
        "Đơn Vị / Công Ty",
        "Chức Danh",
        "Loại Vé",
        "Mã QR Token",
        "Trạng Thái Check-in",
        "Thời Gian Check-in",
        "Thời Gian Đăng Ký",
    ])

    for idx, r in enumerate(rows, start=1):
        phone_val = r.phone or r.phone_number or ""
        company_val = r.company or r.organization or ""
        status_str = "Đã Check-in" if r.is_checked_in else "Chưa Check-in"
        checked_time_str = r.checked_in_at.strftime("%d/%m/%Y %H:%M:%S") if r.checked_in_at else ""
        created_time_str = r.created_at.strftime("%d/%m/%Y %H:%M:%S") if r.created_at else ""

        writer.writerow([
            idx,
            r.full_name or "Khách Tham Dự",
            r.email or "",
            phone_val,
            company_val,
            r.job_title or "",
            r.ticket_type or "Vé Tham Dự",
            r.qr_code_token or "",
            status_str,
            checked_time_str,
            created_time_str,
        ])

    csv_data = output.getvalue().encode("utf-8")
    filename = f"Danh_sach_tham_du_phien_{session_id}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ==========================================
# Task 31: 2-WAY INTERACTIVE APIS
# 1. Q&A Diễn Giả (Live / Pre-session Q&A)
# 2. Quản Lý Tài Liệu & Slide (Session Resources)
# 3. Đánh Giá & Phản Hồi (Feedback 1-5 Star)
# ==========================================

class QuestionCreateRequest(BaseModel):
    asker_name: str
    asker_email: Optional[str] = None
    question: str
    user_id: Optional[int] = None


class QuestionUpdateRequest(BaseModel):
    status: Optional[str] = None  # PENDING, APPROVED, ANSWERED, HIDDEN
    answer: Optional[str] = None
    is_answered: Optional[bool] = None


class MaterialCreateRequest(BaseModel):
    title: str
    file_url: str
    material_type: Optional[str] = "SLIDE"
    file_size: Optional[str] = "5.0 MB"
    is_public_to_all: Optional[bool] = False


class FeedbackCreateRequest(BaseModel):
    participant_name: str
    rating: int  # 1 to 5
    content_quality: Optional[int] = 5
    speaker_rating: Optional[int] = 5
    comment: Optional[str] = None
    user_id: Optional[int] = None


# --- 1. Q&A Endpoints ---

@router.post("/{session_id}/questions", status_code=status.HTTP_201_CREATED)
async def submit_session_question(
    session_id: int,
    payload: QuestionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[ATTENDEE/PUBLIC] Submit a question for session speaker."""
    # Verify session exists
    session_res = await db.execute(select(EventSchedule).where(EventSchedule.id == session_id))
    schedule = session_res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên diễn thuyết này!")

    asker_name = payload.asker_name.strip() or (current_user.full_name if current_user else "Khách Tham Dự")
    asker_email = payload.asker_email or (current_user.email if current_user else None)
    user_id = payload.user_id or (current_user.id if current_user else None)

    q = SessionQuestion(
        session_id=session_id,
        user_id=user_id,
        asker_name=asker_name,
        asker_email=asker_email,
        question=payload.question.strip(),
        status="PENDING",
        upvotes=0,
        is_answered=False,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)

    return {
        "id": q.id,
        "session_id": q.session_id,
        "asker_name": q.asker_name,
        "asker_email": q.asker_email,
        "question": q.question,
        "status": q.status,
        "upvotes": q.upvotes,
        "is_answered": q.is_answered,
        "created_at": q.created_at.isoformat() if q.created_at else datetime.now(timezone.utc).isoformat(),
        "message": "Câu hỏi của bạn đã được gửi thành công đến diễn giả!",
    }


@router.get("/{session_id}/questions")
async def list_session_questions(
    session_id: int,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [PUBLIC / ATTENDEE / ADMIN] List questions for a session.
    - Admin/Manager/Staff see all and can filter by status (PENDING, APPROVED, ANSWERED, HIDDEN).
    - Public/Attendees see APPROVED and ANSWERED questions, plus their own questions.
    """
    user_role = await get_user_role_name(db, current_user) if current_user else "ATTENDEE"
    is_staff_or_admin = user_role in ["ADMIN", "EVENT_MANAGER", "STAFF"]

    query = select(SessionQuestion).where(SessionQuestion.session_id == session_id)

    if is_staff_or_admin:
        if status_filter and status_filter.upper() != "ALL":
            query = query.where(SessionQuestion.status == status_filter.upper())
    else:
        # Public only sees APPROVED/ANSWERED or their own
        if current_user:
            query = query.where(
                or_(
                    SessionQuestion.status.in_(["APPROVED", "ANSWERED"]),
                    SessionQuestion.user_id == current_user.id,
                    SessionQuestion.asker_email == current_user.email,
                )
            )
        else:
            query = query.where(SessionQuestion.status.in_(["APPROVED", "ANSWERED"]))

    query = query.order_by(SessionQuestion.upvotes.desc(), SessionQuestion.created_at.desc())
    res = await db.execute(query)
    questions = res.scalars().all()

    return [
        {
            "id": q.id,
            "session_id": q.session_id,
            "asker_name": q.asker_name,
            "asker_email": q.asker_email,
            "question": q.question,
            "status": q.status,
            "upvotes": q.upvotes,
            "is_answered": q.is_answered,
            "answer": q.answer,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in questions
    ]


@router.patch("/questions/{question_id}")
async def update_question_status(
    question_id: int,
    payload: QuestionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[ADMIN / SPEAKER] Approve, answer or hide a question."""
    user_role = await get_user_role_name(db, current_user) if current_user else "ATTENDEE"
    if user_role not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên hoặc Diễn giả mới có quyền duyệt Q&A!")

    res = await db.execute(select(SessionQuestion).where(SessionQuestion.id == question_id))
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi!")

    if payload.status:
        question.status = payload.status.upper()
    if payload.answer is not None:
        question.answer = payload.answer
        if payload.answer.strip():
            question.is_answered = True
            question.status = "ANSWERED"
    if payload.is_answered is not None:
        question.is_answered = payload.is_answered
        if payload.is_answered:
            question.status = "ANSWERED"

    await db.commit()
    await db.refresh(question)

    return {
        "id": question.id,
        "status": question.status,
        "is_answered": question.is_answered,
        "answer": question.answer,
        "message": "Đã cập nhật trạng thái câu hỏi thành công!",
    }


@router.post("/questions/{question_id}/upvote")
async def upvote_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
):
    """[ATTENDEE] Upvote an interesting question."""
    res = await db.execute(select(SessionQuestion).where(SessionQuestion.id == question_id))
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi!")

    question.upvotes = (question.upvotes or 0) + 1
    await db.commit()
    return {"id": question.id, "upvotes": question.upvotes, "message": "Đã upvote câu hỏi thành công!"}


# --- 2. Materials & Slides Endpoints ---

@router.get("/{session_id}/materials")
async def list_session_materials(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    [PUBLIC / ATTENDEE] List materials/slides for a session.
    - Includes download permissions (check if attendee is registered/checked-in).
    """
    user_role = await get_user_role_name(db, current_user) if current_user else "ATTENDEE"
    is_staff_or_admin = user_role in ["ADMIN", "EVENT_MANAGER", "STAFF"]

    # Check if current user is registered for this session
    is_registered = False
    if current_user:
        reg_check = await db.execute(
            select(Registration).where(
                Registration.participant_id == current_user.id,
                or_(
                    Registration.session_id == session_id,
                    Registration.schedule_id == session_id,
                )
            )
        )
        is_registered = reg_check.scalar_one_or_none() is not None

    res = await db.execute(
        select(SessionMaterial)
        .where(SessionMaterial.session_id == session_id)
        .order_by(SessionMaterial.created_at.desc())
    )
    materials = res.scalars().all()

    results = []
    for m in materials:
        can_download = is_staff_or_admin or is_registered or m.is_public_to_all
        results.append({
            "id": m.id,
            "session_id": m.session_id,
            "title": m.title,
            "file_url": m.file_url,
            "material_type": m.material_type,
            "file_size": m.file_size,
            "is_public_to_all": m.is_public_to_all,
            "download_count": m.download_count,
            "can_download": can_download,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return results


@router.post("/{session_id}/materials", status_code=status.HTTP_201_CREATED)
async def add_session_material(
    session_id: int,
    payload: MaterialCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[ADMIN / MANAGER] Upload/Add material or slide link for a session."""
    user_role = await get_user_role_name(db, current_user) if current_user else "ATTENDEE"
    if user_role not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên mới có quyền thêm tài liệu!")

    # Verify session exists
    session_res = await db.execute(select(EventSchedule).where(EventSchedule.id == session_id))
    schedule = session_res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên diễn thuyết này!")

    mat = SessionMaterial(
        session_id=session_id,
        title=payload.title.strip(),
        file_url=payload.file_url.strip(),
        material_type=payload.material_type or "SLIDE",
        file_size=payload.file_size or "5.0 MB",
        is_public_to_all=payload.is_public_to_all or False,
        download_count=0,
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)

    return {
        "id": mat.id,
        "session_id": mat.session_id,
        "title": mat.title,
        "file_url": mat.file_url,
        "material_type": mat.material_type,
        "file_size": mat.file_size,
        "is_public_to_all": mat.is_public_to_all,
        "download_count": mat.download_count,
        "can_download": True,
        "message": "Đã thêm tài liệu cho ca diễn thuyết thành công!",
    }


@router.delete("/materials/{material_id}")
async def delete_session_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[ADMIN / MANAGER] Delete a session material."""
    user_role = await get_user_role_name(db, current_user) if current_user else "ATTENDEE"
    if user_role not in ["ADMIN", "EVENT_MANAGER", "STAFF"]:
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên mới có quyền xóa tài liệu!")

    res = await db.execute(select(SessionMaterial).where(SessionMaterial.id == material_id))
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu!")

    await db.delete(mat)
    await db.commit()
    return {"success": True, "message": "Đã xóa tài liệu thành công!"}


@router.post("/materials/{material_id}/download")
async def record_material_download(
    material_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Record download count and return download URL."""
    res = await db.execute(select(SessionMaterial).where(SessionMaterial.id == material_id))
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu!")

    mat.download_count = (mat.download_count or 0) + 1
    await db.commit()
    return {
        "id": mat.id,
        "download_count": mat.download_count,
        "file_url": mat.file_url,
        "title": mat.title,
    }


# --- 3. Feedback & Rating Endpoints ---

@router.get("/feedback/stats")
async def get_all_sessions_feedback_stats(
    db: AsyncSession = Depends(get_db),
):
    """[ADMIN / DASHBOARD] Aggregate feedback statistics across all sessions."""
    # Total count and average
    res = await db.execute(
        select(
            func.count(SessionFeedback.id).label("total"),
            func.coalesce(func.avg(SessionFeedback.rating), 0).label("avg_rating"),
            func.coalesce(func.avg(SessionFeedback.content_quality), 0).label("avg_content"),
            func.coalesce(func.avg(SessionFeedback.speaker_rating), 0).label("avg_speaker"),
        )
    )
    total, avg_rating, avg_content, avg_speaker = res.one()

    # Star breakdown
    star_counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    stars_res = await db.execute(
        select(SessionFeedback.rating, func.count(SessionFeedback.id)).group_by(SessionFeedback.rating)
    )
    for r, count in stars_res.all():
        if r in star_counts:
            star_counts[r] = count

    satisfied_count = star_counts[5] + star_counts[4]
    satisfaction_rate = round((satisfied_count / total * 100) if total > 0 else 100, 1)

    # Recent feedbacks with session title
    recent_stmt = (
        select(SessionFeedback, EventSchedule.title.label("session_title"))
        .join(EventSchedule, SessionFeedback.session_id == EventSchedule.id, isouter=True)
        .order_by(SessionFeedback.created_at.desc())
        .limit(10)
    )
    recent_res = await db.execute(recent_stmt)
    recent_list = []
    for fb, s_title in recent_res.all():
        recent_list.append({
            "id": fb.id,
            "session_id": fb.session_id,
            "session_title": s_title or f"Phiên #{fb.session_id}",
            "participant_name": fb.participant_name,
            "rating": fb.rating,
            "content_quality": fb.content_quality,
            "speaker_rating": fb.speaker_rating,
            "comment": fb.comment,
            "created_at": fb.created_at.isoformat() if fb.created_at else None,
        })

    return {
        "total_reviews": total,
        "average_rating": round(float(avg_rating), 1),
        "avg_content_quality": round(float(avg_content), 1),
        "avg_speaker_rating": round(float(avg_speaker), 1),
        "satisfaction_rate": satisfaction_rate,
        "star_breakdown": star_counts,
        "recent_reviews": recent_list,
    }


@router.post("/{session_id}/feedbacks", status_code=status.HTTP_201_CREATED)
async def submit_session_feedback(
    session_id: int,
    payload: FeedbackCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """[ATTENDEE] Submit 1-5 star rating and comment for a session."""
    # Verify session exists
    session_res = await db.execute(select(EventSchedule).where(EventSchedule.id == session_id))
    schedule = session_res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên diễn thuyết này!")

    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Điểm đánh giá phải từ 1 đến 5 sao!")

    # Task 35: Verify registration for attendees
    user_role_id = getattr(current_user, "role_id", None) if current_user else None
    is_staff_or_admin = user_role_id in [1, 2, 3]

    if not is_staff_or_admin:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Vui lòng đăng nhập tài khoản để gửi đánh giá!"
            )
        reg_stmt = select(Registration).where(
            and_(
                Registration.participant_id == current_user.id,
                or_(
                    Registration.schedule_id == session_id,
                    Registration.session_id == session_id,
                    Registration.event_id == schedule.event_id,
                )
            )
        )
        reg_res = await db.execute(reg_stmt)
        reg = reg_res.scalar_one_or_none()
        if not reg and current_user.email:
            reg_res2 = await db.execute(
                select(Registration).where(
                    and_(
                        Registration.email == current_user.email,
                        or_(
                            Registration.schedule_id == session_id,
                            Registration.session_id == session_id,
                            Registration.event_id == schedule.event_id,
                        )
                    )
                )
            )
            reg = reg_res2.scalar_one_or_none()

        if not reg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người đã đăng ký tham gia sự kiện mới được phép gửi hoặc chỉnh sửa đánh giá."
            )

    participant_name = payload.participant_name.strip() or (current_user.full_name if current_user else "Khách Tham Dự")
    user_id = payload.user_id or (current_user.id if current_user else None)

    fb = SessionFeedback(
        session_id=session_id,
        user_id=user_id,
        participant_name=participant_name,
        rating=payload.rating,
        content_quality=payload.content_quality or 5,
        speaker_rating=payload.speaker_rating or 5,
        comment=payload.comment.strip() if payload.comment else None,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    return {
        "id": fb.id,
        "session_id": fb.session_id,
        "participant_name": fb.participant_name,
        "rating": fb.rating,
        "comment": fb.comment,
        "created_at": fb.created_at.isoformat() if fb.created_at else None,
        "message": "Cảm ơn bạn đã gửi đánh giá và nhận xét quý báu!",
    }


@router.get("/{session_id}/feedbacks")
async def list_session_feedbacks(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """[PUBLIC / ATTENDEE] List feedbacks and stats for a specific session."""
    res = await db.execute(
        select(SessionFeedback)
        .where(SessionFeedback.session_id == session_id)
        .order_by(SessionFeedback.created_at.desc())
    )
    feedbacks = res.scalars().all()

    total = len(feedbacks)
    if total > 0:
        avg_rating = sum(f.rating for f in feedbacks) / total
        avg_content = sum(f.content_quality or 5 for f in feedbacks) / total
        avg_speaker = sum(f.speaker_rating or 5 for f in feedbacks) / total
    else:
        avg_rating = 5.0
        avg_content = 5.0
        avg_speaker = 5.0

    star_counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for f in feedbacks:
        if f.rating in star_counts:
            star_counts[f.rating] += 1

    return {
        "stats": {
            "total_reviews": total,
            "average_rating": round(avg_rating, 1),
            "avg_content_quality": round(avg_content, 1),
            "avg_speaker_rating": round(avg_speaker, 1),
            "star_breakdown": star_counts,
        },
        "feedbacks": [
            {
                "id": f.id,
                "participant_name": f.participant_name,
                "rating": f.rating,
                "content_quality": f.content_quality,
                "speaker_rating": f.speaker_rating,
                "comment": f.comment,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in feedbacks
        ],
    }


# =========================================================================
# Task 34: Automated Email Reminders & Bookmark Synchronization
# =========================================================================

@router.post("/{session_id}/reminder")
async def toggle_session_reminder(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    [ATTENDEE] Toggle session reminder when user clicks [🔖 Đặt Lịch].
    Persists to user_reminders table for 24h & 1h automated email reminders.
    """
    # 1. Check if reminder already exists
    stmt = select(UserReminder).where(
        UserReminder.user_id == current_user.id,
        UserReminder.session_id == session_id,
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.commit()
        return {
            "is_bookmarked": False,
            "session_id": session_id,
            "message": "Đã hủy đặt lịch và nhắc nhở email cho phiên này.",
        }

    # 2. Lookup session details to compute start_time
    sess_stmt = select(EventSchedule).where(EventSchedule.id == session_id)
    sess_res = await db.execute(sess_stmt)
    schedule = sess_res.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên diễn thuyết này!")

    # Compute start_time datetime
    y, m, d = 2026, 10, 15
    if schedule.start_date:
        if "/" in schedule.start_date:
            parts = schedule.start_date.split(" ")[0].split("/")
            if len(parts) == 3:
                try:
                    d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                except Exception:
                    pass
        elif "-" in schedule.start_date:
            parts = schedule.start_date.split(" ")[0].split("-")
            if len(parts) == 3:
                try:
                    y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
                except Exception:
                    pass
    elif schedule.day_number == 2:
        d = 16

    h, mn = 9, 0
    if schedule.start_time:
        t_clean = schedule.start_time.strip()
        is_pm = "pm" in t_clean.lower()
        is_am = "am" in t_clean.lower()
        digits = "".join(c for c in t_clean if c.isdigit() or c == ":")
        if ":" in digits:
            sp = digits.split(":")
            try:
                h = int(sp[0])
                mn = int(sp[1])
                if is_pm and h < 12:
                    h += 12
                if is_am and h == 12:
                    h = 0
            except Exception:
                pass

    vn_tz = timezone(timedelta(hours=7))
    try:
        dt_start = datetime(y, m, d, h, mn, 0, tzinfo=vn_tz)
    except Exception:
        dt_start = datetime.now(timezone.utc) + timedelta(hours=20)

    reminder = UserReminder(
        user_id=current_user.id,
        session_id=session_id,
        event_id=schedule.event_id,
        start_time=dt_start,
        notified_24h=False,
        notified_1h=False,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)

    return {
        "is_bookmarked": True,
        "reminder_id": reminder.id,
        "session_id": session_id,
        "session_title": schedule.title,
        "start_time": reminder.start_time.isoformat() if reminder.start_time else None,
        "message": f"Đã đặt lịch! Hệ thống sẽ tự động gửi email nhắc nhở trước 24h và 1h tới {current_user.email}.",
    }


@router.get("/reminders/my-reminders")
async def get_my_session_reminders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """[ATTENDEE] Retrieve list of bookmarked session IDs for current user."""
    stmt = select(UserReminder.session_id).where(UserReminder.user_id == current_user.id)
    res = await db.execute(stmt)
    session_ids = [r[0] for r in res.all() if r[0] is not None]
    return {
        "session_ids": session_ids,
        "total": len(session_ids),
    }


@router.post("/reminders/trigger-check")
async def trigger_reminders_check_now():
    """[ADMIN / TEST] Manually trigger background scheduler reminder check."""
    from app.services.scheduler import check_and_send_scheduled_reminders
    await check_and_send_scheduled_reminders()
    return {"success": True, "message": "Triggered reminder check successfully."}





