import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_all_8_tabs_data():
    """Verify that all 8 tabs return valid HTTP 200 with PostgreSQL real-time metrics."""
    tabs = [
        "Tổng quan",
        "Hiệu quả sự kiện",
        "Người tham dự",
        "Vé & QR",
        "Diễn giả",
        "Feedback",
        "AI",
        "Hệ thống"
    ]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for tab in tabs:
            resp = await client.get("/api/v1/reports/tab-data", params={"tab": tab})
            assert resp.status_code == 200, f"Tab {tab} returned status {resp.status_code}: {resp.text}"
            data = resp.json()
            assert data["tab"] == tab
            assert "kpis" in data
            assert len(data["kpis"]) >= 4, f"Tab {tab} should have at least 4 KPIs"

        # Tab 1 checks
        resp_overview = await client.get("/api/v1/reports/tab-data", params={"tab": "Tổng quan"})
        d1 = resp_overview.json()
        assert "lineChartData" in d1
        assert "donutData" in d1
        assert "barChartData" in d1

        # Tab 2 checks (Event Performance)
        resp_perf = await client.get("/api/v1/reports/tab-data", params={"tab": "Hiệu quả sự kiện"})
        d2 = resp_perf.json()
        assert "eventsRanking" in d2
        assert len(d2["eventsRanking"]) > 0
        assert "fill_rate" in d2["eventsRanking"][0]

        # Tab 3 checks (Attendees & Peak Hours)
        resp_att = await client.get("/api/v1/reports/tab-data", params={"tab": "Người tham dự"})
        d3 = resp_att.json()
        assert "peakHoursChartData" in d3
        assert len(d3["peakHoursChartData"]) > 0
        assert "demographicsRoles" in d3
        assert "recentAttendees" in d3

        # Tab 4 checks (Tickets & QR)
        resp_tickets = await client.get("/api/v1/reports/tab-data", params={"tab": "Vé & QR"})
        d4 = resp_tickets.json()
        assert "ticketTiers" in d4
        assert "gateStats" in d4

        # Tab 5 checks (Speakers & CSAT)
        resp_speakers = await client.get("/api/v1/reports/tab-data", params={"tab": "Diễn giả"})
        d5 = resp_speakers.json()
        assert "speakersRanking" in d5
        assert "topQuestions" in d5

        # Tab 6 checks (Feedback)
        resp_fb = await client.get("/api/v1/reports/tab-data", params={"tab": "Feedback"})
        d6 = resp_fb.json()
        assert "starDistribution" in d6
        assert "commentsList" in d6

        # Tab 7 checks (AI)
        resp_ai = await client.get("/api/v1/reports/tab-data", params={"tab": "AI"})
        d7 = resp_ai.json()
        assert "taskDistribution" in d7
        assert "recentLogs" in d7

        # Tab 8 checks (System)
        resp_sys = await client.get("/api/v1/reports/tab-data", params={"tab": "Hệ thống"})
        d8 = resp_sys.json()
        assert "infraServices" in d8
        assert "securityLogs" in d8

@pytest.mark.asyncio
async def test_filter_by_event():
    """Verify that filtering by event_id restricts and updates the returned data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/reports/tab-data", params={"tab": "Tổng quan", "event_id": 146})
        assert resp.status_code == 200
        data = resp.json()
        kpis = {k["title"]: k["value"] for k in data["kpis"]}
        assert kpis["Tổng sự kiện"] == "1"

@pytest.mark.asyncio
async def test_ai_executive_insights():
    """Verify the AI Executive Insights endpoint returns 🟢 Highlights, 🟡 Bottlenecks, 🎯 Recommendations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "tab": "Tổng quan",
            "event_id": None,
            "date_range": "01/01/2026 - 31/12/2026"
        }
        resp = await client.post("/api/v1/reports/ai-analyze", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tab"] == "Tổng quan"
        assert len(data["summary"]) > 10
        assert len(data["highlights"]) >= 2
        assert len(data["bottlenecks"]) >= 1
        assert len(data["recommendations"]) >= 2
        assert 80 <= data["score"] <= 100

@pytest.mark.asyncio
async def test_export_report_csv():
    """Verify the CSV export endpoint streams UTF-8 BOM CSV data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "report_type": "Người tham dự",
            "date_range": "01/01/2026 - 31/12/2026"
        }
        resp = await client.post("/api/v1/reports/export", json=payload)
        assert resp.status_code == 200
        content = resp.text
        assert "EVENTHUB AI" in content
        assert "KPIS" in content

@pytest.mark.asyncio
async def test_schedule_crud():
    """Verify creating, listing, and deleting a scheduled report."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create
        new_sched = {
            "name": "Báo cáo Test Tự Động Task 95",
            "report_type": "Tổng quan",
            "frequency": "Hàng tuần",
            "format": "PDF",
            "recipients": ["test@eventhub.ai"]
        }
        resp_create = await client.post("/api/v1/reports/schedules", json=new_sched)
        assert resp_create.status_code == 200
        created = resp_create.json()
        sched_id = created["id"]
        assert created["name"] == new_sched["name"]

        # List
        resp_list = await client.get("/api/v1/reports/schedules")
        assert resp_list.status_code == 200
        schedules = resp_list.json()
        assert any(s["id"] == sched_id for s in schedules)

        # Delete
        resp_del = await client.delete(f"/api/v1/reports/schedules/{sched_id}")
        assert resp_del.status_code == 200
