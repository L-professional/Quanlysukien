import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app


@pytest.mark.asyncio
async def test_task72_distinct_four_pillars():
    """Verify GET /api/v1/events?is_featured=true&limit=4 returns exactly 4 featured events

    representing 4 distinct pillars (AI, Fintech, Cybersecurity, Green Tech).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/events?is_featured=true&limit=4")
        assert res.status_code == 200, f"Error: {res.text}"
        events = res.json()
        assert len(events) == 4, f"Expected 4 featured events, got {len(events)}"

        # 4 distinct pillars
        pillars = ["AI", "Fintech", "Cybersecurity", "Green Tech"]
        event_types = [e.get("event_type", "") for e in events]
        titles = [e.get("title", "") for e in events]
        images = [e.get("cover_image", "") for e in events]

        # Verify all 4 images are unique
        assert len(set(images)) == 4, f"Featured events have duplicate images: {images}"

        # Verify 4 distinct domains
        assert any("AI" in t or "Trí Tuệ Nhân Tạo" in t for t in titles), "Missing AI pillar"
        assert any("Fintech" in t or "Tài Chính" in t for t in titles), "Missing Fintech pillar"
        assert any("Cybersecurity" in t or "An Ninh Mạng" in t for t in titles), "Missing Cybersecurity pillar"
        assert any("Green Tech" in t or "Năng Lượng Tái Tạo" in t for t in titles), "Missing Green Tech pillar"


@pytest.mark.asyncio
async def test_task72_twenty_unique_events():
    """Verify total seeded events count is at least 20 and cover images are unique."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/events")
        assert res.status_code == 200
        events = res.json()
        assert len(events) >= 20, f"Expected at least 20 events, got {len(events)}"

        # Verify images among seeded events are unique
        images = [e["cover_image"] for e in events if e.get("cover_image")]
        assert len(images) == len(set(images)), "Found duplicate cover image URLs in events database!"
