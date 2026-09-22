import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app


@pytest.mark.asyncio
async def test_event_schedule_and_location_overlap_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_loc = "Trung tâm Hội nghị White Palace Hoàng Văn Thụ"

        # 1. Create Base Event 1
        event1_payload = {
            "title": "Hội Thảo Cloud & DevOps 2026",
            "description": "Chuyên đề Cloud Native & Kubernetes",
            "location": test_loc,
            "start_time": "2026-11-20T08:00:00",
            "end_time": "2026-11-20T12:00:00",
            "start_date": "20/11/2026 08:00",
            "end_date": "20/11/2026 12:00",
            "status": "PUBLISHED",
            "category_id": 1,
        }
        res1 = await client.post("/api/v1/events", json=event1_payload)
        assert res1.status_code == 201, f"Failed to create event 1: {res1.text}"
        ev1 = res1.json()
        ev1_id = ev1["id"]

        try:
            # 2. Attempt to create Event 2 at SAME location with OVERLAPPING time (10:00 to 14:00 overlaps 08:00 to 12:00)
            overlap_payload = {
                "title": "Hội Thảo An Ninh Mạng 2026",
                "description": "Thảo luận Zero Trust",
                "location": test_loc,
                "start_time": "2026-11-20T10:00:00",
                "end_time": "2026-11-20T14:00:00",
                "start_date": "20/11/2026 10:00",
                "end_date": "20/11/2026 14:00",
                "status": "PUBLISHED",
                "category_id": 1,
            }
            res_overlap = await client.post("/api/v1/events", json=overlap_payload)
            assert res_overlap.status_code == 400, f"Expected 400 Bad Request, got {res_overlap.status_code}"
            err_detail = res_overlap.json().get("detail", "")
            expected_msg = f"Địa điểm '{test_loc}' đã có sự kiện 'Hội Thảo Cloud & DevOps 2026' đăng ký trong khoảng thời gian này. Vui lòng chọn địa điểm hoặc thời gian khác."
            assert err_detail == expected_msg, f"Unexpected error message: {err_detail}"

            # 3. Create Event 3 at SAME location with NON-OVERLAPPING time (13:00 to 17:00 does not overlap 08:00 to 12:00)
            non_overlap_payload = {
                "title": "Workshop Lập Trình Rust 2026",
                "description": "Thực hành phát triển backend hiệu năng cao",
                "location": test_loc,
                "start_time": "2026-11-20T13:00:00",
                "end_time": "2026-11-20T17:00:00",
                "start_date": "20/11/2026 13:00",
                "end_date": "20/11/2026 17:00",
                "status": "PUBLISHED",
                "category_id": 1,
            }
            res_non_overlap = await client.post("/api/v1/events", json=non_overlap_payload)
            assert res_non_overlap.status_code == 201, f"Expected 201 Created, got {res_non_overlap.status_code}: {res_non_overlap.text}"
            ev3 = res_non_overlap.json()
            ev3_id = ev3["id"]

            try:
                # 4. Attempt to update Event 3 to OVERLAP with Event 1 (move from 13:00 to 11:00)
                update_overlap_payload = {
                    "start_time": "2026-11-20T11:00:00",
                    "end_time": "2026-11-20T15:00:00",
                }
                res_upd_overlap = await client.put(f"/api/v1/events/{ev3_id}", json=update_overlap_payload)
                assert res_upd_overlap.status_code == 400, f"Expected 400 Bad Request on update, got {res_upd_overlap.status_code}"
                assert "đã có sự kiện" in res_upd_overlap.json().get("detail", "")

                # 5. Update Event 3 to valid time (14:00 to 18:00) -> Should succeed
                update_valid_payload = {
                    "start_time": "2026-11-20T14:00:00",
                    "end_time": "2026-11-20T18:00:00",
                }
                res_upd_valid = await client.put(f"/api/v1/events/{ev3_id}", json=update_valid_payload)
                assert res_upd_valid.status_code == 200, f"Expected 200 OK on valid update, got {res_upd_valid.status_code}"

            finally:
                # Cleanup ev3
                await client.delete(f"/api/v1/events/{ev3_id}")

        finally:
            # Cleanup ev1
            await client.delete(f"/api/v1/events/{ev1_id}")
