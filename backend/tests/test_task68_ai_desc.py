import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

@pytest.mark.asyncio
async def test_task68_ai_generate_description():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: POST /api/v1/ai/generate-description
        payload = {
            "title": "Hội Nghị Thượng Đỉnh Công Nghệ AI 2026",
            "track": "AI & Big Data",
            "location": "GEM Center TP.HCM",
            "style": "professional"
        }
        res = await client.post("/api/v1/ai/generate-description", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "description" in data
        assert len(data["description"]) > 10
        assert data.get("style_applied") == "professional"

        # Test 2: Non-tech context sanitize
        payload_non_tech = {
            "title": "Hội Thảo Chăm Sóc Sức Khỏe & Tâm Lý Học Đường",
            "track": "Y tế & Sức khỏe",
            "location": "Hà Nội",
            "style": "wellness"
        }
        res2 = await client.post("/api/v1/ai/generate-description", json=payload_non_tech)
        assert res2.status_code == 200
        data2 = res2.json()
        assert "description" in data2
        assert len(data2["description"]) > 10
