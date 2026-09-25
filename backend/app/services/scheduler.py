import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import select, and_, or_
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.database import AsyncSessionLocal
from app.models.reminder import UserReminder
from app.models.notification import Notification
from app.models.user import User
from app.models.event import Event, EventSchedule
from app.services.email_service import send_session_reminder_email

logger = logging.getLogger("eventhub.scheduler")
logger.setLevel(logging.INFO)

# Global APScheduler instance
scheduler = AsyncIOScheduler()

# Vietnam timezone (UTC+7)
VN_TZ = timezone(timedelta(hours=7))


async def check_and_send_scheduled_reminders():
    """
    Periodic job: Scan user_reminders table and automatically trigger:
    1. 24-hour reminder email (notified_24h = True)
    2. 1-hour urgent reminder email (notified_1h = True)
    """
    logger.debug("Checking scheduled email reminders...")
    async with AsyncSessionLocal() as db:
        try:
            # Current time in UTC
            now_utc = datetime.now(timezone.utc)

            # Query reminders where at least one notification is pending
            stmt = (
                select(
                    UserReminder,
                    User.full_name.label("user_name"),
                    User.email.label("user_email"),
                    EventSchedule.title.label("session_title"),
                    EventSchedule.room_location.label("room_location"),
                    EventSchedule.start_time.label("schedule_start_time_str"),
                    Event.title.label("event_title"),
                )
                .join(User, UserReminder.user_id == User.id)
                .join(EventSchedule, UserReminder.session_id == EventSchedule.id, isouter=True)
                .join(Event, UserReminder.event_id == Event.id)
                .where(
                    or_(
                        UserReminder.notified_24h.is_(False),
                        UserReminder.notified_1h.is_(False),
                    )
                )
            )
            res = await db.execute(stmt)
            rows = res.all()

            sent_count = 0
            for r in rows:
                reminder: UserReminder = r[0]
                user_name = r[1] or "Khách Tham Dự"
                user_email = r[2]
                session_title = r[3] or "Phiên Sự Kiện"
                room_loc = r[4] or "Hội trường chính"
                time_str = r[5] or "09:00 AM"
                event_title = r[6] or "EventHub AI Summit"

                if not user_email:
                    continue

                target_start = reminder.start_time
                if not target_start:
                    # Default fallback: 12 hours from creation if not explicitly parsed
                    target_start = reminder.created_at + timedelta(hours=12)

                # Ensure target_start is timezone aware
                if target_start.tzinfo is None:
                    target_start = target_start.replace(tzinfo=timezone.utc)

                diff_seconds = (target_start - now_utc).total_seconds()

                # 1. 24h reminder: between 2 hours and 24 hours (24 * 3600 seconds)
                if not reminder.notified_24h and 2 * 3600 < diff_seconds <= 24 * 3600:
                    await send_session_reminder_email(
                        to_email=user_email,
                        recipient_name=user_name,
                        session_title=session_title,
                        event_title=event_title,
                        start_time_str=time_str,
                        room_location=room_loc,
                        reminder_type="24h",
                    )
                    # Create In-App Notification
                    notif_24h = Notification(
                        user_id=reminder.user_id,
                        target_role="PARTICIPANT",
                        title=f"Nhắc lịch sự kiện (còn 24h): {event_title}",
                        message=f"Sự kiện '{event_title}' sẽ bắt đầu trong 24 giờ tới tại {room_loc}. Vui lòng sắp xếp lịch trình tham dự đúng giờ!",
                        type="REMINDER_24H",
                        link="/events",
                        is_read=False,
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(notif_24h)
                    reminder.notified_24h = True
                    sent_count += 1

                # 2. 2h urgent reminder: between 0 and 2 hours (2 * 3600 seconds)
                if not reminder.notified_1h and 0 < diff_seconds <= 2 * 3600:
                    await send_session_reminder_email(
                        to_email=user_email,
                        recipient_name=user_name,
                        session_title=session_title,
                        event_title=event_title,
                        start_time_str=time_str,
                        room_location=room_loc,
                        reminder_type="1h",
                    )
                    # Create In-App Urgent Notification
                    notif_2h = Notification(
                        user_id=reminder.user_id,
                        target_role="PARTICIPANT",
                        title=f"Nhắc nhở khẩn cấp (còn 2 giờ): {event_title}",
                        message=f"Sự kiện '{event_title}' sẽ diễn ra trong 2 giờ nữa tại {room_loc}. Nhấn vào đây để mở nhanh Mã QR Check-in tại cổng!",
                        type="REMINDER_2H",
                        link="/check-in",
                        is_read=False,
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(notif_2h)
                    reminder.notified_1h = True
                    sent_count += 1

            if sent_count > 0:
                await db.commit()
                logger.info(f"Sent {sent_count} scheduled reminder email(s).")
        except Exception as e:
            logger.error(f"Error checking scheduled reminders: {e}", exc_info=True)


def start_scheduler():
    """Start the APScheduler background worker."""
    if not scheduler.running:
        scheduler.add_job(
            check_and_send_scheduled_reminders,
            trigger=IntervalTrigger(seconds=60),
            id="eventhub_email_reminders_job",
            name="Check and Send Event Reminders (24h & 1h)",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler background email reminder service started successfully.")


def stop_scheduler():
    """Stop the APScheduler background worker."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler background service stopped.")
