from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, or_, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_user_role_name
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    target_role: Optional[str] = None
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreateNotificationPayload(BaseModel):
    user_id: Optional[int] = None
    target_role: Optional[str] = "ALL"
    title: str
    message: str
    type: str = "INFO"
    link: Optional[str] = None


async def ensure_sample_notifications(db: AsyncSession, user: User, role_name: str):
    """Seed initial sample notifications if none exist for a realistic experience."""
    stmt = select(Notification).limit(1)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if not existing:
        samples = [
            Notification(
                user_id=user.id,
                target_role=role_name,
                title="Chào mừng đến với EventHub AI!",
                message="Hệ thống quản lý sự kiện thông minh tích hợp AI Concierge sẵn sàng phục vụ.",
                type="INFO",
                link="/events",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            ),
            Notification(
                user_id=None,
                target_role="STAFF",
                title="Câu hỏi mới cần duyệt (AI Concierge)",
                message="Khách tham dự Nguyễn Hoàng Long đã gửi thắc mắc về bãi đỗ xe VIP.",
                type="INQUIRY_PENDING",
                link="/inquiries",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            ),
            Notification(
                user_id=None,
                target_role="EVENT_MANAGER",
                title="Check-in vé thành công",
                message="Đại biểu Trần Minh Tuấn vừa hoàn tất soát vé QR Code tại Cổng A.",
                type="CHECK_IN",
                link="/check-in",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            ),
            Notification(
                user_id=None,
                target_role="ADMIN",
                title="Cảnh báo an toàn hệ thống (PII Masking)",
                message="Hệ thống đã tự động lọc 3 số điện thoại và email khỏi prompt gửi LLM.",
                type="SECURITY_ALERT",
                link="/logs",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            ),
        ]
        db.add_all(samples)
        await db.commit()


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get notifications targeted at current user or user's role.
    """
    role_name = await get_user_role_name(current_user, db)
    await ensure_sample_notifications(db, current_user, role_name)

    stmt = select(Notification).where(
        or_(
            Notification.user_id == current_user.id,
            Notification.target_role == "ALL",
            Notification.target_role == role_name,
            Notification.target_role.is_(None),
        )
    ).order_by(Notification.created_at.desc()).limit(50)

    res = await db.execute(stmt)
    notifications = res.scalars().all()
    return notifications


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a specific notification as read.
    """
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo.",
        )
    notification.is_read = True
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/mark-all-read")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark all accessible notifications as read for current user.
    """
    role_name = await get_user_role_name(current_user, db)
    stmt = (
        update(Notification)
        .where(
            or_(
                Notification.user_id == current_user.id,
                Notification.target_role == "ALL",
                Notification.target_role == role_name,
                Notification.target_role.is_(None),
            )
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "Tất cả thông báo đã được đánh dấu là đã đọc."}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a notification.
    """
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo.",
        )
    await db.delete(notification)
    await db.commit()
    return {"message": "Đã xóa thông báo thành công."}


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: CreateNotificationPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a new notification.
    """
    notification = Notification(
        user_id=payload.user_id,
        target_role=payload.target_role,
        title=payload.title,
        message=payload.message,
        type=payload.type,
        link=payload.link,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/trigger-reminders")
async def trigger_reminders():
    """
    Manually trigger scanning and sending 24h & 2h reminders.
    """
    from app.services.scheduler import check_and_send_scheduled_reminders
    await check_and_send_scheduled_reminders()
    return {"success": True, "message": "Đã kích hoạt quét và gửi nhắc lịch thành công."}
