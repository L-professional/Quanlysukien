import pytest
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.security import get_permissions_for_role, get_user_role_name
from app.models.user import User


@pytest.mark.asyncio
async def test_permissions_mapping():
    """Verify role permissions mapping."""
    admin_perms = get_permissions_for_role("ADMIN")
    assert "*" in admin_perms or "EVENT_CREATE" in admin_perms
    assert "TICKET_SCAN" in admin_perms

    manager_perms = get_permissions_for_role("EVENT_MANAGER")
    assert "EVENT_CREATE" in manager_perms
    assert "AI_MANAGE" in manager_perms

    staff_perms = get_permissions_for_role("STAFF")
    assert "TICKET_SCAN" in staff_perms
    assert "AI_MANAGE" in staff_perms
    assert "EVENT_CREATE" not in staff_perms

    attendee_perms = get_permissions_for_role("ATTENDEE")
    assert "EVENT_VIEW" in attendee_perms
    assert "TICKET_SCAN" not in attendee_perms


@pytest.mark.asyncio
async def test_get_user_role_name_argument_flexibility():
    """Verify get_user_role_name works with both (user, db) and (db, user) ordering."""
    class DummyUser:
        role_id = 999

    class DummyRole:
        role_name = "TEST_ROLE"

    class DummyDb:
        async def get(self, model, role_id):
            return DummyRole()

    user = DummyUser()
    db = DummyDb()

    # Normal order: (user, db)
    role_normal = await get_user_role_name(user, db)
    assert role_normal == "TEST_ROLE"

    # Reversed order: (db, user)
    role_reversed = await get_user_role_name(db, user)
    assert role_reversed == "TEST_ROLE"


@pytest.mark.asyncio
async def test_anonymous_access_denied_on_protected_endpoints():
    """Verify unauthenticated requests to protected endpoints return 401 Unauthorized."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Creating event without token must fail with 401
        res_create_event = await client.post(
            "/api/v1/events",
            json={
                "title": "Hacker Event",
                "location": "Dark Web",
                "start_time": "2026-10-15 09:00:00",
                "end_time": "2026-10-15 12:00:00"
            }
        )
        assert res_create_event.status_code == 401, f"Expected 401, got {res_create_event.status_code}"

        # Reviewing inquiry without token must fail with 401
        res_review = await client.post(
            "/api/v1/inquiries/1/review",
            json={"action": "ACCEPT", "staff_id": 1}
        )
        assert res_review.status_code == 401, f"Expected 401, got {res_review.status_code}"

        # Exporting audit logs without token must fail with 401
        res_export_audit = await client.get("/api/v1/audit-logs/export")
        assert res_export_audit.status_code == 401, f"Expected 401, got {res_export_audit.status_code}"

        # Generating PR without token must fail with 401
        res_pr = await client.post(
            "/api/v1/ai/generate-pr",
            json={"event_name": "Test Event"}
        )
        assert res_pr.status_code == 401, f"Expected 401, got {res_pr.status_code}"


@pytest.mark.asyncio
async def test_role_based_access_flow():
    """Verify authorization checks for different user roles."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Admin
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@eventhub.ai", "password": "password123"}
        )
        if admin_login.status_code != 200:
            admin_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "admin@eventhub.ai", "password": "123456"}
            )
        assert admin_login.status_code == 200
        admin_data = admin_login.json()
        admin_token = admin_data["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Check permissions in user response
        assert "permissions" in admin_data["user"]
        assert len(admin_data["user"]["permissions"]) > 0

        # Admin can view admin user list
        users_res = await client.get("/api/v1/admin/users", headers=admin_headers)
        assert users_res.status_code == 200

        # 2. Login as Attendee
        attendee_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "attendee@eventhub.ai", "password": "password123"}
        )
        if attendee_login.status_code != 200:
            attendee_login = await client.post(
                "/api/v1/auth/login",
                json={"email": "attendee@eventhub.ai", "password": "123456"}
            )
        assert attendee_login.status_code == 200
        attendee_token = attendee_login.json()["access_token"]
        attendee_headers = {"Authorization": f"Bearer {attendee_token}"}

        # Attendee MUST NOT be allowed to view admin users (403 Forbidden)
        forbidden_users_res = await client.get("/api/v1/admin/users", headers=attendee_headers)
        assert forbidden_users_res.status_code == 403

        # Attendee MUST NOT be allowed to create events (403 Forbidden)
        forbidden_event_res = await client.post(
            "/api/v1/events",
            headers=attendee_headers,
            json={
                "title": "Unauthorized Attendee Event",
                "location": "Unauthorized Hall",
                "start_time": "2026-10-15 09:00:00",
                "end_time": "2026-10-15 12:00:00"
            }
        )
        assert forbidden_event_res.status_code == 403
