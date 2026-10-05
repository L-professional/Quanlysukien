import pytest
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text

from app.main import app
from app.core.timezone import (
    get_vn_now,
    TIMEZONE_NAME,
    to_vn_datetime,
    parse_event_datetime_vn,
    calculate_realtime_event_status,
)
from app.core.database import AsyncSessionLocal


@pytest.mark.asyncio
async def test_timezone_configuration():
    """Verify that get_vn_now returns timezone-aware datetime in Asia/Ho_Chi_Minh."""
    now_vn = get_vn_now()
    assert now_vn.tzinfo is not None
    # Offset must be +07:00 (25200 seconds)
    offset_seconds = now_vn.utcoffset().total_seconds()
    assert offset_seconds == 7 * 3600
    assert TIMEZONE_NAME == "Asia/Ho_Chi_Minh"


@pytest.mark.asyncio
async def test_parse_event_datetime_vn():
    """Verify parsing of Vietnamese date string into Hanoi timezone."""
    dt_str = "02/10/2026 16:30"
    parsed = parse_event_datetime_vn(dt_str)
    assert parsed is not None
    assert parsed.year == 2026
    assert parsed.month == 10
    assert parsed.day == 2
    assert parsed.hour == 16
    assert parsed.minute == 30
    assert parsed.utcoffset().total_seconds() == 7 * 3600


@pytest.mark.asyncio
async def test_calculate_realtime_event_status():
    """Verify accurate status calculation for past, ongoing and future events."""
    now = get_vn_now()

    # Past event (ended yesterday)
    past_start = now - timedelta(days=2)
    past_end = now - timedelta(days=1)
    assert calculate_realtime_event_status(past_start, past_end, "PUBLISHED") == "COMPLETED"

    # Ongoing event (started 2 hours ago, ends in 2 hours)
    ongoing_start = now - timedelta(hours=2)
    ongoing_end = now + timedelta(hours=2)
    assert calculate_realtime_event_status(ongoing_start, ongoing_end, "PUBLISHED") == "ONGOING"

    # Future event (starts in 3 days)
    future_start = now + timedelta(days=3)
    future_end = now + timedelta(days=4)
    assert calculate_realtime_event_status(future_start, future_end, "PUBLISHED") == "PUBLISHED"

    # Cancelled and Draft statuses must be preserved
    assert calculate_realtime_event_status(past_start, past_end, "CANCELLED") == "CANCELLED"
    assert calculate_realtime_event_status(ongoing_start, ongoing_end, "DRAFT") == "DRAFT"


@pytest.mark.asyncio
async def test_database_session_timezone():
    """Verify PostgreSQL session timezone is Asia/Ho_Chi_Minh."""
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT current_setting('TIMEZONE');"))
        tz = res.scalar()
        assert tz == "Asia/Ho_Chi_Minh"


@pytest.mark.asyncio
async def test_api_system_time_endpoint():
    """Verify GET /api/v1/system/time returns HTTP 200 and Hanoi time info."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/system/time")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["timezone"] == "Asia/Ho_Chi_Minh"
        assert data["offset"] == "+07:00"
        assert "formatted_time" in data
        assert "formatted_date" in data
        assert "day_of_week" in data
        assert "database_timezone" in data


@pytest.mark.asyncio
async def test_api_events_realtime_statuses():
    """Verify GET /api/v1/events returns events with real-time synchronized status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/events")
        assert response.status_code == 200
        events = response.json()
        assert len(events) > 0

        for e in events:
            assert e["status"] in ("PUBLISHED", "UPCOMING", "ONGOING", "LIVE", "COMPLETED", "ENDED", "CANCELLED", "DRAFT")
