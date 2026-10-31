"""
Centralized Timezone & Real-Time Management Module for EventHub AI.
Standardizes all system operations to Hanoi, Vietnam Time (Asia/Ho_Chi_Minh, UTC+7).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from zoneinfo import ZoneInfo
import logging
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("eventhub.timezone")

# Hanoi, Vietnam Timezone (UTC+7)
try:
    VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
except Exception:
    VN_TZ = timezone(timedelta(hours=7))

VN_TIMEDELTA = timedelta(hours=7)
TIMEZONE_NAME = "Asia/Ho_Chi_Minh"
TIMEZONE_LABEL = "Giờ Hà Nội, Việt Nam (UTC+7)"


def get_vn_now() -> datetime:
    """Return current datetime aware of Hanoi, Vietnam timezone (UTC+7)."""
    return datetime.now(VN_TZ)


def get_vn_now_iso() -> str:
    """Return ISO 8601 formatted string of current Hanoi time."""
    return get_vn_now().isoformat()


def to_vn_datetime(dt: Optional[datetime]) -> Optional[datetime]:
    """Convert any datetime (UTC, naive, or aware) to Hanoi timezone."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Naive datetime is assumed to already be Hanoi local time
        return dt.replace(tzinfo=VN_TZ)
    return dt.astimezone(VN_TZ)


def parse_event_datetime_vn(val: Any) -> Optional[datetime]:
    """Parse string/datetime into a datetime aware of Hanoi timezone."""
    if not val:
        return None
    if isinstance(val, datetime):
        return to_vn_datetime(val)
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str:
            return None
        # ISO string
        try:
            parsed = datetime.fromisoformat(val_str.replace("Z", "+00:00"))
            return to_vn_datetime(parsed)
        except Exception:
            pass
        # Common Vietnamese datetime formats
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
                dt_naive = datetime.strptime(val_str, fmt)
                return dt_naive.replace(tzinfo=VN_TZ)
            except Exception:
                pass
    return None


def format_vn_datetime(dt: Optional[datetime], fmt: str = "%d/%m/%Y %H:%M") -> str:
    """Format datetime in Vietnamese format according to Hanoi timezone."""
    if not dt:
        return ""
    vn_dt = to_vn_datetime(dt)
    return vn_dt.strftime(fmt)


def calculate_realtime_event_status(
    start_dt: Optional[datetime],
    end_dt: Optional[datetime],
    current_status: Optional[str] = None
) -> str:
    """
    Calculate the correct event status against real-time Hanoi clock:
    - CANCELLED / DRAFT are preserved.
    - If now > end_dt => COMPLETED
    - If start_dt <= now <= end_dt => ONGOING
    - If now < start_dt => PUBLISHED
    """
    s_upper = (current_status or "").strip().upper()
    if s_upper in ("CANCELLED", "DRAFT"):
        return s_upper

    now = get_vn_now()
    if not start_dt:
        return s_upper or "PUBLISHED"

    if not end_dt:
        end_dt = start_dt + timedelta(hours=3)

    start_vn = to_vn_datetime(start_dt)
    end_vn = to_vn_datetime(end_dt)

    if now > end_vn:
        return "COMPLETED"
    elif start_vn <= now <= end_vn:
        return "ONGOING"
    else:
        return "PUBLISHED"


async def sync_all_events_with_realtime(db: AsyncSession) -> dict:
    """
    Scan all events in the database, evaluate their start_time and end_time
    against current Hanoi time, and update their statuses accordingly.
    """
    from app.models.event import Event

    stmt = select(Event)
    res = await db.execute(stmt)
    events = res.scalars().all()

    updated_count = 0
    now = get_vn_now()

    for ev in events:
        if ev.status in ("CANCELLED", "DRAFT"):
            continue

        start_dt = ev.start_time or parse_event_datetime_vn(ev.start_date)
        end_dt = ev.end_time or parse_event_datetime_vn(ev.end_date)

        if not start_dt:
            continue

        computed_status = calculate_realtime_event_status(start_dt, end_dt, ev.status)
        if computed_status != ev.status:
            ev.status = computed_status
            updated_count += 1

    if updated_count > 0:
        await db.commit()
        logger.info(f"Synchronized {updated_count} events with Hanoi real-time ({now.strftime('%d/%m/%Y %H:%M:%S')})")

    return {
        "synchronized_at": now.isoformat(),
        "timezone": TIMEZONE_NAME,
        "total_events": len(events),
        "updated_events": updated_count,
    }
