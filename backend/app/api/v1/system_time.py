from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any

from app.core.database import get_db
from app.core.config import settings
from app.core.timezone import (
    get_vn_now,
    TIMEZONE_NAME,
    TIMEZONE_LABEL,
    sync_all_events_with_realtime,
)

router = APIRouter(prefix="/system", tags=["System Time"])


@router.get("/time", response_model=Dict[str, Any])
async def get_system_realtime(db: AsyncSession = Depends(get_db)):
    """
    Get current system time synchronized with real-time Hanoi, Vietnam (UTC+7).
    Also checks PostgreSQL session timezone and database timestamp.
    """
    now_vn = get_vn_now()

    # Query DB time
    db_tz = "unknown"
    db_now = None
    try:
        db_res = await db.execute(text("SELECT current_setting('TIMEZONE'), NOW();"))
        row = db_res.first()
        if row:
            db_tz = row[0]
            db_now = row[1].isoformat() if row[1] else None
    except Exception as e:
        db_tz = f"error: {str(e)}"

    # Day of week in Vietnamese
    days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
    day_name = days_vi[now_vn.weekday()]

    return {
        "status": "success",
        "current_time": now_vn.isoformat(),
        "timezone": TIMEZONE_NAME,
        "timezone_label": TIMEZONE_LABEL,
        "offset": "+07:00",
        "epoch_ms": int(now_vn.timestamp() * 1000),
        "formatted_time": now_vn.strftime("%H:%M:%S"),
        "formatted_date": now_vn.strftime("%d/%m/%Y"),
        "day_of_week": day_name,
        "full_vietnamese_display": f"{day_name}, {now_vn.strftime('%d/%m/%Y %H:%M:%S')} (Giờ Hà Nội)",
        "database_timezone": db_tz,
        "database_now": db_now,
    }


@router.post("/sync-events", response_model=Dict[str, Any])
async def trigger_event_time_sync(db: AsyncSession = Depends(get_db)):
    """
    Automatically synchronize all events in the system with real-time Hanoi time:
    - Events before current time -> COMPLETED
    - Events currently running -> ONGOING
    - Events in the future -> PUBLISHED
    """
    result = await sync_all_events_with_realtime(db)
    return {
        "status": "success",
        "message": f"Đã đồng bộ toàn bộ sự kiện theo thời gian thực Hà Nội ({result['synchronized_at']})",
        **result,
    }
