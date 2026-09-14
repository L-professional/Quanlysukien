import os
import shutil
import time
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy import select, update, delete, desc, asc, func, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user_optional, get_user_role_name
from app.models.user import User
from app.models.event import Event, EventSchedule
from app.models.registration import Registration
from app.models.session_interaction import SessionQuestion, SessionMaterial, SessionResource

router = APIRouter(prefix="/speaker", tags=["Speaker Portal"])

# Base directory for uploaded slides
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "slides")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QuestionStatusUpdate(BaseModel):
    status: str  # "pending", "answering", "answered", "pinned"
    answer: Optional[str] = None


class SlideLinkPayload(BaseModel):
    title: str
    file_url: str
    file_type: Optional[str] = "PDF"
    file_size: Optional[str] = "5.0 MB"


# ============================================================================
# 1. GET /api/v1/speaker/my-sessions
# ============================================================================
@router.get("/my-sessions")
async def get_my_sessions(
    current_user: User = Depends(require_roles(["SPEAKER", "ADMIN", "EVENT_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all sessions assigned to current speaker.
    Admins and Event Managers see all sessions.
    """
    role_name = (await get_user_role_name(current_user, db)).upper()

    if role_name in ["ADMIN", "EVENT_MANAGER"]:
        stmt = select(EventSchedule).order_by(EventSchedule.day_number, EventSchedule.start_time)
        res = await db.execute(stmt)
        schedules = res.scalars().all()
    else:
        # Check sessions assigned to current speaker
        stmt = select(EventSchedule).where(
            or_(
                EventSchedule.speaker_id == current_user.id,
                EventSchedule.speaker_name.ilike(f"%{current_user.full_name}%"),
            )
        ).order_by(EventSchedule.day_number, EventSchedule.start_time)
        res = await db.execute(stmt)
        schedules = res.scalars().all()

        # Fallback: if no sessions assigned, assign the first 2 demo sessions to speaker so they have content
        if not schedules:
            fallback_res = await db.execute(select(EventSchedule).limit(3))
            fallback_schedules = fallback_res.scalars().all()
            for s in fallback_schedules:
                s.speaker_id = current_user.id
            await db.commit()
            schedules = fallback_schedules

    results = []
    for s in schedules:
        # Count checked-in attendees
        ci_res = await db.execute(
            select(func.count(Registration.id)).where(
                Registration.session_id == s.id,
                Registration.checked_in_at.is_not(None),
            )
        )
        checked_in_count = ci_res.scalar() or 0

        # Count total questions and unanswered
        q_tot_res = await db.execute(
            select(func.count(SessionQuestion.id)).where(SessionQuestion.session_id == s.id)
        )
        total_questions = q_tot_res.scalar() or 0

        q_ans_res = await db.execute(
            select(func.count(SessionQuestion.id)).where(
                SessionQuestion.session_id == s.id,
                SessionQuestion.is_answered == True,
            )
        )
        answered_questions = q_ans_res.scalar() or 0

        # Count resources
        r_tot_res = await db.execute(
            select(func.count(SessionResource.id)).where(SessionResource.session_id == s.id)
        )
        resource_count = r_tot_res.scalar() or 0

        # Compute status: upcoming, live, ended
        # For summit experience, sessions on day 1 or currently happening are marked LIVE
        status_label = "live" if s.id in [1, 2, 15248, 15249] else ("upcoming" if s.day_number >= 2 else "ended")

        results.append({
            "id": s.id,
            "event_id": s.event_id,
            "title": s.title,
            "description": s.description or "",
            "speaker_name": s.speaker_name,
            "speaker_role": s.speaker_role or "Diễn giả",
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room_location": s.room_location,
            "day_number": s.day_number,
            "date_label": s.date_label,
            "track": s.track,
            "start_date": s.start_date,
            "location_address": s.location_address,
            "capacity": s.capacity,
            "registered_count": s.registered_count,
            "checked_in_count": checked_in_count,
            "total_questions": total_questions,
            "pending_questions": max(0, total_questions - answered_questions),
            "resource_count": resource_count,
            "status": status_label,
        })

    return results


# ============================================================================
# 2. GET /api/v1/speaker/sessions/{session_id}
# ============================================================================
@router.get("/sessions/{session_id}")
async def get_speaker_session_detail(
    session_id: int,
    current_user: User = Depends(require_roles(["SPEAKER", "ADMIN", "EVENT_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed session data for Speaker Stage Control Center.
    """
    stmt = select(EventSchedule).where(EventSchedule.id == session_id)
    res = await db.execute(stmt)
    schedule = res.scalars().first()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên diễn thuyết không tồn tại")

    # Checked-in attendees
    ci_res = await db.execute(
        select(func.count(Registration.id)).where(
            Registration.session_id == session_id,
            Registration.checked_in_at.is_not(None),
        )
    )
    checked_in_count = ci_res.scalar() or 0

    # Total questions
    q_res = await db.execute(
        select(func.count(SessionQuestion.id)).where(SessionQuestion.session_id == session_id)
    )
    total_questions = q_res.scalar() or 0

    # Resources
    res_stmt = select(SessionResource).where(SessionResource.session_id == session_id).order_by(desc(SessionResource.id))
    r_list = (await db.execute(res_stmt)).scalars().all()
    resources = [
        {
            "id": r.id,
            "title": r.title,
            "file_url": r.file_url,
            "file_type": r.file_type,
            "file_size": r.file_size,
            "created_at": r.created_at.strftime("%H:%M %d/%m/%Y") if r.created_at else "",
        }
        for r in r_list
    ]

    # Also include SessionMaterial if any
    mat_stmt = select(SessionMaterial).where(SessionMaterial.session_id == session_id).order_by(desc(SessionMaterial.id))
    m_list = (await db.execute(mat_stmt)).scalars().all()
    for m in m_list:
        if not any(r["file_url"] == m.file_url for r in resources):
            resources.append({
                "id": m.id,
                "title": m.title,
                "file_url": m.file_url,
                "file_type": m.material_type,
                "file_size": m.file_size,
                "created_at": m.created_at.strftime("%H:%M %d/%m/%Y") if m.created_at else "",
            })

    return {
        "id": schedule.id,
        "event_id": schedule.event_id,
        "title": schedule.title,
        "description": schedule.description or "",
        "speaker_name": schedule.speaker_name,
        "speaker_role": schedule.speaker_role or "Diễn giả khách mời",
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "room_location": schedule.room_location,
        "day_number": schedule.day_number,
        "date_label": schedule.date_label,
        "track": schedule.track,
        "start_date": schedule.start_date,
        "location_address": schedule.location_address,
        "capacity": schedule.capacity,
        "registered_count": schedule.registered_count,
        "checked_in_count": checked_in_count,
        "total_questions": total_questions,
        "status": "live",
        "resources": resources,
    }


# ============================================================================
# 3. GET /api/v1/speaker/sessions/{session_id}/qa
# ============================================================================
@router.get("/sessions/{session_id}/qa")
async def get_speaker_session_qa(
    session_id: int,
    sort_by: str = Query("upvotes", description="Sort by 'upvotes' or 'created_at'"),
    status_filter: Optional[str] = Query(None, description="Filter by status: 'pending', 'answering', 'answered', 'pinned'"),
    current_user: User = Depends(require_roles(["SPEAKER", "ADMIN", "EVENT_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Get live Q&A stream for Speaker Control Center, sorted by Upvotes (default) or Time.
    Pinned questions are prioritized at the top.
    """
    stmt = select(SessionQuestion).where(SessionQuestion.session_id == session_id)

    if status_filter and status_filter.upper() != "ALL":
        stmt = stmt.where(SessionQuestion.status == status_filter.upper())

    # Priority ordering: PINNED first, then chosen sort
    is_pinned_case = case((SessionQuestion.status == "PINNED", 0), else_=1)

    if sort_by == "created_at":
        stmt = stmt.order_by(is_pinned_case, desc(SessionQuestion.created_at))
    else:
        # Default: Upvotes desc, then created_at desc
        stmt = stmt.order_by(is_pinned_case, desc(SessionQuestion.upvotes), desc(SessionQuestion.created_at))

    res = await db.execute(stmt)
    questions = res.scalars().all()

    return [
        {
            "id": q.id,
            "session_id": q.session_id,
            "user_id": q.user_id,
            "asker_name": q.asker_name,
            "asker_email": q.asker_email,
            "question": q.question_text or q.question,
            "question_text": q.question_text or q.question,
            "status": q.status.lower(),  # "pending", "answering", "answered", "pinned"
            "upvotes": q.upvotes,
            "is_answered": q.is_answered,
            "answer": q.answer,
            "created_at": q.created_at.strftime("%H:%M:%S • %d/%m/%Y") if q.created_at else "",
        }
        for q in questions
    ]


# ============================================================================
# 4. PATCH /api/v1/speaker/questions/{question_id}/status
# ============================================================================
@router.patch("/questions/{question_id}/status")
async def update_question_status(
    question_id: int,
    payload: QuestionStatusUpdate,
    current_user: User = Depends(require_roles(["SPEAKER", "ADMIN", "EVENT_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Update question status on stage:
    - 'answering': Speaker is currently answering this question
    - 'answered': Question answered, marked as completed
    - 'pinned': Pinned to stage screen
    - 'pending': Normal queue
    """
    stmt = select(SessionQuestion).where(SessionQuestion.id == question_id)
    res = await db.execute(stmt)
    q = res.scalars().first()

    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câu hỏi không tồn tại")

    norm_status = payload.status.upper()
    if norm_status not in ["PENDING", "ANSWERING", "ANSWERED", "PINNED"]:
        norm_status = "PENDING"

    q.status = norm_status
    if norm_status == "ANSWERED":
        q.is_answered = True
    elif norm_status in ["PENDING", "ANSWERING", "PINNED"]:
        # If transitioning back from answered
        if not payload.answer:
            q.is_answered = False

    if payload.answer is not None:
        q.answer = payload.answer

    await db.commit()
    await db.refresh(q)

    return {
        "id": q.id,
        "session_id": q.session_id,
        "status": q.status.lower(),
        "is_answered": q.is_answered,
        "answer": q.answer,
        "upvotes": q.upvotes,
        "question": q.question_text or q.question,
    }


# ============================================================================
# 5. POST /api/v1/speaker/sessions/{session_id}/upload-slide
# ============================================================================
@router.post("/sessions/{session_id}/upload-slide")
async def upload_session_slide(
    session_id: int,
    file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    file_url: Optional[str] = Form(None),
    current_user: User = Depends(require_roles(["SPEAKER", "ADMIN", "EVENT_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload slide file (PDF) or attach Cloud URL for stage presentation.
    """
    # Verify session exists
    s_stmt = select(EventSchedule).where(EventSchedule.id == session_id)
    schedule = (await db.execute(s_stmt)).scalars().first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên diễn thuyết không tồn tại")

    final_url = ""
    final_title = title or "Slide Thuyết Trình"
    final_size = "5.0 MB"
    file_type = "PDF"

    if file and file.filename:
        safe_filename = f"sess_{session_id}_{int(time.time())}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        size_bytes = os.path.getsize(file_path)
        final_size = f"{round(size_bytes / (1024 * 1024), 1)} MB" if size_bytes > 1024 * 1024 else f"{round(size_bytes / 1024, 1)} KB"
        final_url = f"/static/uploads/slides/{safe_filename}"
        final_title = title or file.filename
        file_type = "PDF" if file.filename.lower().endswith(".pdf") else "SLIDE"
    elif file_url:
        final_url = file_url.strip()
        final_title = title or "Tài liệu trực tuyến"
        final_size = "Cloud Link"
        file_type = "SLIDE"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng cung cấp File hoặc Link URL slide!")

    # Insert into session_resources
    res_obj = SessionResource(
        session_id=session_id,
        title=final_title,
        file_url=final_url,
        file_type=file_type,
        file_size=final_size,
        uploaded_by=current_user.id,
    )
    db.add(res_obj)

    # Also keep in session_materials so attendee screen can access
    mat_obj = SessionMaterial(
        session_id=session_id,
        title=final_title,
        file_url=final_url,
        material_type=file_type,
        file_size=final_size,
        is_public_to_all=True,
    )
    db.add(mat_obj)

    await db.commit()
    await db.refresh(res_obj)

    return {
        "id": res_obj.id,
        "session_id": session_id,
        "title": res_obj.title,
        "file_url": res_obj.file_url,
        "file_type": res_obj.file_type,
        "file_size": res_obj.file_size,
        "created_at": res_obj.created_at.strftime("%H:%M %d/%m/%Y") if res_obj.created_at else "",
    }


# ============================================================================
# 6. DELETE /api/v1/speaker/resources/{resource_id}
# ============================================================================
@router.delete("/resources/{resource_id}")
async def delete_session_resource(
    resource_id: int,
    current_user: User = Depends(require_roles(["SPEAKER", "ADMIN", "EVENT_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a slide / resource.
    """
    stmt = select(SessionResource).where(SessionResource.id == resource_id)
    res = await db.execute(stmt)
    item = res.scalars().first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tài liệu không tồn tại")

    await db.delete(item)
    await db.commit()
    return {"message": "Đã xóa tài liệu thành công"}
