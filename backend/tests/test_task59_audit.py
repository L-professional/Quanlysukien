import asyncio
import json
import httpx
from datetime import datetime, timezone, timedelta

BASE_URL = "http://localhost:8000/api/v1"

async def run_tests():
    print("=== STARTING TASK 59 VERIFICATION SUITE ===")
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Test Dashboard Stats
        print("\n[TEST 1] Testing GET /api/v1/ai/dashboard-stats...")
        resp = await client.get(f"{BASE_URL}/ai/dashboard-stats")
        assert resp.status_code == 200, f"Dashboard stats failed: {resp.status_code} {resp.text}"
        stats = resp.json()
        print(f"Total Users: {stats.get('total_users')}")
        print(f"Total Events: {stats.get('total_events')}")
        print(f"Total Revenue: {stats.get('total_revenue_formatted')}")
        print(f"User Roles: {stats.get('user_roles')}")
        assert "total_users" in stats
        assert "total_revenue" in stats
        print("  => PASSED: Dashboard stats returns SQL aggregates successfully!")

        # 2. Get or create an event for testing
        print("\n[TEST 2] Testing Events API & RAG Sync...")
        events_resp = await client.get(f"{BASE_URL}/events")
        assert events_resp.status_code == 200
        events = events_resp.json()
        assert len(events) > 0, "No events found in DB!"
        target_event = events[0]
        event_id = target_event["id"]
        print(f"Target Event: ID={event_id}, Title='{target_event['title']}'")

        # Login as Admin to get bearer token
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": "admin@eventhub.ai", "password": "password123"}
        )
        if login_resp.status_code != 200:
            login_resp = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "admin@eventhub.ai", "password": "123456"}
            )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("  => Admin login successful!")

        # 3. Test Schedule Time Bound Validation
        print("\n[TEST 3] Testing Schedule Time Bound Validation...")
        invalid_schedule_payload = {
            "title": "Invalid Midnight Session",
            "speaker_name": "Dr. Test",
            "start_time": "23:59",
            "end_time": "03:00",
            "room_location": "Hall Z",
            "day_number": 99,
            "date_label": "2030-01-01",
        }
        sched_resp = await client.post(
            f"{BASE_URL}/events/{event_id}/schedule",
            json=invalid_schedule_payload,
            headers=headers,
        )
        print(f"Attempting out-of-bounds schedule: Status {sched_resp.status_code}, Response: {sched_resp.text}")
        assert sched_resp.status_code == 400, f"Expected 400 for out-of-bounds schedule, got {sched_resp.status_code}"
        print("  => PASSED: Out-of-bounds session was correctly rejected with 400!")

        # 4. Test Check-In Logic (JSON QR, Event Mismatch, Already Scanned)
        print("\n[TEST 4] Testing QR Check-In & Strict Validation...")
        # Issue ticket via manual-issue endpoint
        issue_resp = await client.post(
            f"{BASE_URL}/registrations/manual-issue",
            json={
                "event_id": event_id,
                "full_name": "Nguyen Van Test",
                "email": f"test_{int(datetime.now().timestamp())}@example.com",
                "ticket_type": "VIP Attendee",
                "note": "Test ticket for task 59"
            },
            headers=headers,
        )
        assert issue_resp.status_code == 201, f"Ticket issuance failed: {issue_resp.text}"
        ticket_data = issue_resp.json()
        raw_qr_code = ticket_data.get("qr_code_token")
        print(f"Generated Ticket QR Code Data: {raw_qr_code}")
        
        parsed_qr = json.loads(raw_qr_code)
        assert parsed_qr.get("ticket_id") is not None
        assert parsed_qr.get("event_id") == event_id
        
        # Test 4a: Scan with WRONG event_id (e.g. event_id + 9999)
        wrong_event_id = event_id + 9999
        checkin_wrong = await client.post(
            f"{BASE_URL}/registrations/check-in",
            json={
                "token": raw_qr_code,
                "event_id": wrong_event_id
            },
            headers=headers,
        )
        assert checkin_wrong.status_code == 200
        res_wrong = checkin_wrong.json()
        print(f"Scan with wrong gate event ({wrong_event_id}): status={res_wrong.get('status')}, message={res_wrong.get('message')}")
        assert res_wrong.get("status") == "INVALID_EVENT"
        assert "không hợp lệ cho sự kiện này" in res_wrong.get("message")
        print("  => PASSED: Cross-event check-in rejected with INVALID_EVENT!")

        # Test 4b: Scan with CORRECT event_id
        checkin_correct = await client.post(
            f"{BASE_URL}/registrations/check-in",
            json={
                "token": raw_qr_code,
                "event_id": event_id
            },
            headers=headers,
        )
        assert checkin_correct.status_code == 200
        res_correct = checkin_correct.json()
        print(f"Scan with correct event ({event_id}): status={res_correct.get('status')}, message={res_correct.get('message')}")
        assert res_correct.get("status") == "SUCCESS"
        print("  => PASSED: Correct check-in succeeded with SUCCESS!")

        # Test 4c: Scan AGAIN (Already used)
        checkin_again = await client.post(
            f"{BASE_URL}/registrations/check-in",
            json={
                "token": raw_qr_code,
                "event_id": event_id
            },
            headers=headers,
        )
        assert checkin_again.status_code == 200
        res_again = checkin_again.json()
        print(f"Scan again: status={res_again.get('status')}, message={res_again.get('message')}")
        assert res_again.get("status") == "ALREADY_USED"
        assert "đã được quét vào lúc" in res_again.get("message")
        print("  => PASSED: Re-scan correctly flagged with ALREADY_USED and formatted timestamp!")

        # 5. Test AI PR Studio Lifecycle Prompt Branching
        print("\n[TEST 5] Testing AI PR Studio Lifecycle Branches...")
        pr_concluded = await client.post(
            f"{BASE_URL}/ai/generate-pr",
            json={
                "event_name": "Tech AI Concluded 2026",
                "main_topic": "Tổng kết và tri ân các diễn giả hàng đầu",
                "lifecycle": "CONCLUDED"
            }
        )
        assert pr_concluded.status_code == 200
        pr_data = pr_concluded.json()
        print(f"CONCLUDED PR Subject: {pr_data.get('email_subject')}")
        print(f"CONCLUDED PR CTA: {pr_data.get('email_cta')}")
        print(f"CONCLUDED Social Hook: {pr_data.get('social_hook')}")
        assert pr_data.get("email") is not None
        print("  => PASSED: AI PR Studio CONCLUDED lifecycle generated correctly!")

    print("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_tests())
