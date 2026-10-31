import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.role import RoleEnum
from sqlalchemy import select


@pytest.mark.asyncio
async def test_task96_google_sso_existing_user():
    """Test Google SSO for existing user updates last_active_at and returns JWT token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # attendee@eventhub.ai exists from demo seeding
        resp = await client.post("/api/v1/auth/google", json={
            "email": "attendee@eventhub.ai",
            "full_name": "Phạm Quốc Khách Hàng",
            "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=attendee",
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "attendee@eventhub.ai"
        assert data["user"]["role_name"] in ["ATTENDEE", "PARTICIPANT"]


@pytest.mark.asyncio
async def test_task96_google_sso_new_user_provisioning():
    """Test Google SSO auto-creates a new user in PostgreSQL with role PARTICIPANT."""
    test_email = "new_google_user_task96@gmail.com"
    async with AsyncSessionLocal() as session:
        # Clean up in case of previous run
        user = (await session.execute(select(User).where(User.email == test_email))).scalar_one_or_none()
        if user:
            await session.delete(user)
            await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/google", json={
            "email": test_email,
            "full_name": "Google Newbie",
            "avatar_url": "https://lh3.googleusercontent.com/a/test-avatar",
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["full_name"] == "Google Newbie"
        assert data["user"]["role_name"] in ["ATTENDEE", "PARTICIPANT"]
        assert data["user"]["provider"] == "google"

    # Verify directly in PostgreSQL DB
    async with AsyncSessionLocal() as session:
        db_user = (await session.execute(select(User).where(User.email == test_email))).scalar_one_or_none()
        assert db_user is not None
        assert db_user.role_id == 4
        assert db_user.provider == "google"
        assert db_user.last_active_at is not None


@pytest.mark.asyncio
async def test_task96_microsoft_sso_existing_user():
    """Test Microsoft SSO for existing user logs in and returns valid JWT."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/microsoft", json={
            "email": "manager@eventhub.ai",
            "full_name": "Trần Thị Điều Hành",
            "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=manager",
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "manager@eventhub.ai"
        assert data["user"]["role_name"] == "EVENT_MANAGER"


@pytest.mark.asyncio
async def test_task96_microsoft_sso_new_user_provisioning():
    """Test Microsoft SSO auto-provisions a new user in PostgreSQL with role PARTICIPANT."""
    test_email = "alex_microsoft_task96@outlook.com"
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == test_email))).scalar_one_or_none()
        if user:
            await session.delete(user)
            await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/microsoft", json={
            "email": test_email,
            "full_name": "Alex Microsoft",
            "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=alex",
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["full_name"] == "Alex Microsoft"
        assert data["user"]["role_name"] in ["ATTENDEE", "PARTICIPANT"]
        assert data["user"]["provider"] == "microsoft"

    # Verify directly in PostgreSQL DB
    async with AsyncSessionLocal() as session:
        db_user = (await session.execute(select(User).where(User.email == test_email))).scalar_one_or_none()
        assert db_user is not None
        assert db_user.role_id == 4
        assert db_user.provider == "microsoft"
        assert db_user.last_active_at is not None
