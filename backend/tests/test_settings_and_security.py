import pytest
import sys
from pathlib import Path
import pyotp
from httpx import AsyncClient, ASGITransport

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app


@pytest.mark.asyncio
async def test_settings_profile_and_security_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login with demo admin account
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@eventhub.ai", "password": "123456"}
        )
        assert login_res.status_code == 200, login_res.text
        token_data = login_res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test GET /api/v1/users/me
        me_res = await client.get("/api/v1/users/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "admin@eventhub.ai"

        # 3. Test PUT /api/v1/users/me with INVALID phone format -> expect 400
        bad_phone_res = await client.put(
            "/api/v1/users/me",
            headers=headers,
            json={"phone_number": "1234abcd"}
        )
        assert bad_phone_res.status_code == 400
        assert "không hợp lệ" in bad_phone_res.json()["detail"]

        # 4. Test PUT /api/v1/users/me with VALID profile info
        update_res = await client.put(
            "/api/v1/users/me",
            headers=headers,
            json={
                "full_name": "Nguyễn Văn Quản Trị Cấp Cao",
                "phone_number": "0901234567",
                "job_title": "Giám Đốc Kỹ Thuật (CTO)",
                "avatar_url": "https://example.com/avatar.png",
                "preferences": {"language": "vi", "theme": "dark"}
            }
        )
        assert update_res.status_code == 200
        updated_data = update_res.json()
        assert updated_data["full_name"] == "Nguyễn Văn Quản Trị Cấp Cao"
        assert updated_data["phone_number"] == "0901234567"
        assert updated_data["job_title"] == "Giám Đốc Kỹ Thuật (CTO)"
        assert updated_data["preferences"]["theme"] == "dark"

        # 5. Test 2FA Flow: Generate -> Verify -> Disable
        gen_2fa_res = await client.post("/api/v1/auth/2fa/generate", headers=headers)
        assert gen_2fa_res.status_code == 200
        gen_2fa_data = gen_2fa_res.json()
        secret = gen_2fa_data["secret"]
        assert secret and len(secret) >= 16
        assert gen_2fa_data["qr_code"].startswith("data:image/png;base64,")

        # Test invalid 2FA code
        bad_verify_res = await client.post(
            "/api/v1/auth/2fa/verify",
            headers=headers,
            json={"code": "000000", "secret": secret}
        )
        assert bad_verify_res.status_code == 400

        # Test valid 2FA code using pyotp
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()
        good_verify_res = await client.post(
            "/api/v1/auth/2fa/verify",
            headers=headers,
            json={"code": valid_code, "secret": secret}
        )
        assert good_verify_res.status_code == 200
        assert good_verify_res.json()["is_2fa_enabled"] is True

        # Test disable 2FA
        disable_res = await client.post("/api/v1/auth/2fa/disable", headers=headers, json={})
        assert disable_res.status_code == 200
        assert disable_res.json()["is_2fa_enabled"] is False

        # 6. Test Active Sessions Flow: Get Sessions -> Revoke Others
        sessions_res = await client.get("/api/v1/auth/sessions", headers=headers)
        assert sessions_res.status_code == 200
        sessions = sessions_res.json()
        assert len(sessions) >= 1
        assert any(s["is_current"] for s in sessions)

        # Revoke other sessions
        revoke_res = await client.post("/api/v1/auth/sessions/revoke-others", headers=headers)
        assert revoke_res.status_code == 200
        
        # Verify only current session remains
        sessions_after = (await client.get("/api/v1/auth/sessions", headers=headers)).json()
        assert len(sessions_after) == 1
        assert sessions_after[0]["is_current"] is True

        # 7. Test Change Password Flow
        # Wrong current password -> expect 400
        wrong_pwd_res = await client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": "wrong_password_xyz",
                "new_password": "new_password_123",
                "confirm_password": "new_password_123"
            }
        )
        assert wrong_pwd_res.status_code == 400

        # Successful password change
        change_pwd_res = await client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": "123456",
                "new_password": "new_password_123",
                "confirm_password": "new_password_123"
            }
        )
        assert change_pwd_res.status_code == 200

        # Revert password back to 123456 for subsequent tests
        revert_pwd_res = await client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": "new_password_123",
                "new_password": "123456",
                "confirm_password": "123456"
            }
        )
        assert revert_pwd_res.status_code == 200
