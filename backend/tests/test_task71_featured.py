import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app


@pytest.mark.asyncio
async def test_task71_featured_events_api():
    """Verify GET /api/v1/events?is_featured=true&limit=4 returns exactly 4 featured events."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/events?is_featured=true&limit=4")
        assert res.status_code == 200, f"Error: {res.text}"
        events = res.json()
        assert len(events) == 4, f"Expected 4 featured events, got {len(events)}"
        for e in events:
            assert e["featured"] is True
            assert e["cover_image"] is not None
            assert any(pillar in e["title"] for pillar in ["AI Summit", "Fintech", "Cybersecurity", "Green Tech", "Cloud & DevOps", "TechFest"])


@pytest.mark.asyncio
async def test_task71_all_events_count():
    """Verify total seeded events count in DB is at least 20 with clean titles."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/events")
        assert res.status_code == 200
        events = res.json()
        assert len(events) >= 20, f"Expected at least 20 events, got {len(events)}"
        for e in events:
            # Verify no hash suffix like ' db3f53'
            import re
            assert not re.search(r'\s+[0-9a-f]{6}$', e["title"]), f"Event title has hash suffix: {e['title']}"
            assert e["location"] is not None
            assert e["start_date"] is not None
