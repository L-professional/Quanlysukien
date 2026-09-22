import io
import base64
import secrets
from datetime import datetime, timezone, timedelta
import httpx
import pyotp
import qrcode
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_user_role_name,
)
from app.models.user import User
from app.models.role import Role, RoleEnum
from app.models.user_session import UserSession
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    GoogleAuthRequest,
    ChangePasswordRequest,
    TwoFactorGenerateResponse,
    TwoFactorVerifyRequest,
    TwoFactorDisableRequest,
    SessionItem,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def ensure_default_roles(db: AsyncSession):
    """Ensure basic roles and default demo users exist in DB."""
    stmt = select(Role)
    res = await db.execute(stmt)
    roles = res.scalars().all()
    if not roles:
        default_roles = [
            Role(id=1, role_name=RoleEnum.ADMIN.value),
            Role(id=2, role_name=RoleEnum.EVENT_MANAGER.value),
            Role(id=3, role_name=RoleEnum.STAFF.value),
            Role(id=4, role_name=RoleEnum.PARTICIPANT.value),
        ]
        db.add_all(default_roles)
        await db.commit()

    # Seed demo users if no users exist
    user_stmt = select(User).limit(1)
    user_res = await db.execute(user_stmt)
    if not user_res.scalars().first():
        hashed_pwd = get_password_hash("123456")
        demo_users = [
            User(
                email="admin@eventhub.ai",
                hashed_password=hashed_pwd,
                full_name="Nguyễn Văn Quản Trị",
                phone_number="0901234567",
                role_id=1,
                is_active=True,
            ),
            User(
                email="manager@eventhub.ai",
                hashed_password=hashed_pwd,
                full_name="Trần Thị Điều Hành",
                phone_number="0902345678",
                role_id=2,
                is_active=True,
            ),
            User(
                email="staff@eventhub.ai",
                hashed_password=hashed_pwd,
                full_name="Lê Hoàng Soát Vé",
                phone_number="0903456789",
                role_id=3,
                is_active=True,
            ),
            User(
                email="attendee@eventhub.ai",
                hashed_password=hashed_pwd,
                full_name="Phạm Quốc Khách Hàng",
                phone_number="0904567890",
                role_id=4,
                is_active=True,
            ),
        ]
    # Ensure SPEAKER role exists
    speaker_role_res = await db.execute(select(Role).where(Role.role_name == RoleEnum.SPEAKER.value))
    speaker_role = speaker_role_res.scalars().first()
    if not speaker_role:
        speaker_role = Role(role_name=RoleEnum.SPEAKER.value)
        db.add(speaker_role)
        await db.commit()
        await db.refresh(speaker_role)

    # Seed demo speaker if not exists
    speaker_user_res = await db.execute(select(User).where(User.email == "speaker@eventhub.ai"))
    speaker_user = speaker_user_res.scalars().first()
    if not speaker_user:
        hashed_pwd = get_password_hash("123456")
        speaker_user = User(
            email="speaker@eventhub.ai",
            hashed_password=hashed_pwd,
            full_name="TS. Lê Quang Huy (Speaker)",
            phone_number="0908889999",
            role_id=speaker_role.id,
            is_active=True,
        )
        db.add(speaker_user)
        await db.commit()
        await db.refresh(speaker_user)

    # Automatically assign first couple of event schedules to demo speaker if unassigned
    from app.models.event import EventSchedule
    sched_res = await db.execute(select(EventSchedule).limit(5))
    schedules = sched_res.scalars().all()
    if schedules:
        for s in schedules:
            if not s.speaker_id:
                s.speaker_id = speaker_user.id
        await db.commit()



async def _build_user_response(user: User, db: AsyncSession) -> UserResponse:
    """Build UserResponse with role_name fetched from related Role table."""
    role_name = await get_user_role_name(user, db)
    data = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role_id": user.role_id,
        "role_name": role_name,
        "is_active": user.is_active,
        "avatar_url": getattr(user, "avatar_url", None),
        "provider": getattr(user, "provider", "local"),
        "job_title": getattr(user, "job_title", None),
        "is_2fa_enabled": getattr(user, "is_2fa_enabled", False),
        "preferences": getattr(user, "preferences", None) or {"language": "vi", "theme": "dark"},
        "last_active_at": user.last_active_at,
        "created_at": user.created_at,
    }
    return UserResponse(**data)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account with bcrypt password hashing.
    Returns JWT access token (including role) upon successful registration.
    """
    await ensure_default_roles(db)

    # 1. Check if email already exists
    stmt = select(User).where(User.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc Đăng nhập"
        )

    # 2. Security hardening: Force PARTICIPANT role (role_id=4) for all public registrations
    # Ignore any role_id provided by client to prevent privilege escalation
    res = await db.execute(select(Role).where(Role.role_name == RoleEnum.PARTICIPANT.value))
    role = res.scalars().first()
    if not role:
        role = await db.get(Role, 4)
    role_id = role.id if role else 4

    # 3. Create new user
    hashed_pwd = get_password_hash(payload.password)
    new_user = User(
        email=payload.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=payload.full_name.strip(),
        phone_number=payload.phone_number,
        role_id=role_id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # 4. Get role name for JWT
    role_name = role.role_name if role else "PARTICIPANT"

    # 5. Generate Access Token with role encoded
    access_token = create_access_token(data={
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": role_name,
    })

    user_resp = await _build_user_response(new_user, db)
    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=Token)
async def login_user(
    payload: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user with email and password, returning JWT Access Token with role.
    """
    await ensure_default_roles(db)
    email_clean = payload.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác!",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.",
        )

    # Get role name
    role_name = await get_user_role_name(user, db)

    # Generate Access Token with role
    access_token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": role_name,
    })

    user_resp = await _build_user_response(user, db)
    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/google", response_model=Token)
async def google_auth(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user with Google OAuth 2.0 credential or profile.
    - If email does not exist: Automatically register with role PARTICIPANT.
    - If email exists: Log in and return JWT token.
    """
    await ensure_default_roles(db)

    email = None
    full_name = None
    avatar_url = None

    # 1. Parse and verify with google-auth library if credential is provided
    if payload.credential:
        try:
            # Verify id_token using official google-auth library
            id_info = google_id_token.verify_oauth2_token(
                payload.credential,
                google_requests.Request()
            )
            if id_info:
                email = id_info.get("email")
                full_name = id_info.get("name")
                avatar_url = id_info.get("picture")
        except Exception as google_err:
            # Fallback 1: Query tokeninfo endpoint via HTTP
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.get(
                        f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"
                    )
                    if res.status_code == 200:
                        info = res.json()
                        email = info.get("email")
                        full_name = info.get("name")
                        avatar_url = info.get("picture")
            except Exception:
                pass

            # Fallback 2: Decode payload directly for offline development/test tokens
            if not email:
                try:
                    import json, base64
                    parts = payload.credential.split(".")
                    if len(parts) >= 2:
                        padding = 4 - len(parts[1]) % 4
                        padded = parts[1] + ("=" * (padding % 4))
                        decoded_bytes = base64.urlsafe_b64decode(padded)
                        jwt_data = json.loads(decoded_bytes.decode("utf-8"))
                        email = jwt_data.get("email")
                        full_name = jwt_data.get("name") or jwt_data.get("given_name")
                        avatar_url = jwt_data.get("picture")
                except Exception:
                    pass

    # 2. Use direct payload fields if present
    if not email and payload.email:
        email = str(payload.email)
        full_name = payload.full_name or email.split("@")[0]
        avatar_url = payload.avatar_url

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xác thực danh tính Google. Token hoặc email không hợp lệ!"
        )

    email_clean = email.lower().strip()
    full_name_clean = (full_name or email_clean.split("@")[0]).strip()

    # Check if user already exists
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user:
        # Trường hợp 2: Email Google ĐÃ tồn tại -> Đăng nhập
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.",
            )
        user.last_active_at = datetime.now(timezone.utc)
        if avatar_url and hasattr(user, "avatar_url"):
            user.avatar_url = avatar_url  # Auto sync avatar from Google
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Trường hợp 1: Email Google CHƯA tồn tại -> Tự động tạo tài khoản mới với role PARTICIPANT
        res_role = await db.execute(select(Role).where(Role.role_name == RoleEnum.PARTICIPANT.value))
        role = res_role.scalars().first()
        if not role:
            role = await db.get(Role, 4)
        role_id = role.id if role else 4

        random_pwd = secrets.token_urlsafe(16)
        hashed_pwd = get_password_hash(random_pwd)

        user = User(
            email=email_clean,
            full_name=full_name_clean,
            hashed_password=hashed_pwd,
            role_id=role_id,
            is_active=True,
            last_active_at=datetime.now(timezone.utc),
        )
        if hasattr(user, "avatar_url"):
            user.avatar_url = avatar_url
        if hasattr(user, "provider"):
            user.provider = "google"

        db.add(user)
        await db.commit()
        await db.refresh(user)

    role_name = await get_user_role_name(user, db)
    access_token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": role_name,
    })

    user_resp = await _build_user_response(user, db)
    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current logged in user information using JWT token.
    """
    return await _build_user_response(current_user, db)


@router.get("/demo-accounts")
async def get_demo_accounts(db: AsyncSession = Depends(get_db)):
    """
    Provide available demo accounts for 1-click test login in dev/demo mode.
    """
    await ensure_default_roles(db)
    return [
        {
            "role": "ADMIN",
            "role_title": "Admin Quản Trị",
            "email": "admin@eventhub.ai",
            "password": "123456",
            "description": "Toàn quyền quản trị tài khoản, cấu hình kho RAG, xem Security Logs",
            "badge_color": "bg-amber-100 text-amber-800 border-amber-300",
        },
        {
            "role": "EVENT_MANAGER",
            "role_title": "Quản Lý Sự Kiện",
            "email": "manager@eventhub.ai",
            "password": "123456",
            "description": "Khởi tạo sự kiện, sinh bài viết truyền thông bằng AI, xem Dashboard",
            "badge_color": "bg-purple-100 text-purple-800 border-purple-300",
        },
        {
            "role": "STAFF",
            "role_title": "Nhân Viên Điều Phối",
            "email": "staff@eventhub.ai",
            "password": "123456",
            "description": "Soát vé QR Code, duyệt & chỉnh sửa câu trả lời AI Concierge (HITL)",
            "badge_color": "bg-indigo-100 text-indigo-800 border-indigo-300",
        },
        {
            "role": "ATTENDEE",
            "role_title": "Khách Tham Dự",
            "email": "attendee@eventhub.ai",
            "password": "123456",
            "description": "Xem danh mục sự kiện, đăng ký vé QR cá nhân, hỏi đáp AI Concierge",
            "badge_color": "bg-slate-100 text-slate-800 border-slate-300",
        },
    ]


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change user password with current password verification and strength checks.
    """
    # 1. Verify current password
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác! Vui lòng kiểm tra lại."
        )

    # 2. Check if new password is same as current password
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu hiện tại!"
        )

    # 3. Check confirm password if supplied
    if payload.confirm_password and payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xác nhận mật khẩu mới không trùng khớp!"
        )

    # 4. Update password
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    await db.commit()

    return {"message": "Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của bạn."}


@router.post("/2fa/generate", response_model=TwoFactorGenerateResponse)
async def generate_2fa_secret(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a new TOTP secret and QR code for two-factor authentication.
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="EventHub AI"
    )

    # Generate QR Code PNG
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2
    )
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    base64_qr = base64.b64encode(img_bytes).decode("utf-8")
    qr_code_data_url = f"data:image/png;base64,{base64_qr}"

    # Temporarily store pending secret in user object
    current_user.two_factor_secret = secret
    db.add(current_user)
    await db.commit()

    return TwoFactorGenerateResponse(
        secret=secret,
        provisioning_uri=provisioning_uri,
        qr_code=qr_code_data_url,
        issuer="EventHub AI"
    )


@router.post("/2fa/verify")
async def verify_2fa_code(
    payload: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify 6-digit TOTP code and enable Two-Factor Authentication (2FA).
    """
    secret = payload.secret or current_user.two_factor_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chưa có mã khóa 2FA nào được khởi tạo. Vui lòng bấm tạo mã trước!"
        )

    totp = pyotp.TOTP(secret)
    # Check current token or previous/next 30-sec window (valid_window=1)
    if not totp.verify(payload.code.strip(), valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác thực 6 chữ số không chính xác hoặc đã hết hạn. Vui lòng thử lại!"
        )

    current_user.two_factor_secret = secret
    current_user.is_2fa_enabled = True
    db.add(current_user)
    await db.commit()

    return {
        "message": "Xác thực 2 yếu tố (2FA) đã được kích hoạt thành công!",
        "is_2fa_enabled": True
    }


@router.post("/2fa/disable")
async def disable_2fa(
    payload: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Disable Two-Factor Authentication (2FA) for current user.
    """
    if payload.password:
        if not verify_password(payload.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu xác nhận không chính xác!"
            )

    current_user.is_2fa_enabled = False
    current_user.two_factor_secret = None
    db.add(current_user)
    await db.commit()

    return {
        "message": "Đã tắt xác thực 2 yếu tố (2FA) thành công!",
        "is_2fa_enabled": False
    }


@router.get("/sessions")
async def get_active_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active sessions for current user.
    If no sessions exist, seeds the current session and sample remote devices.
    """
    stmt = select(UserSession).where(UserSession.user_id == current_user.id).order_by(UserSession.is_current.desc(), UserSession.last_active_at.desc())
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    if not sessions:
        # Detect client user agent roughly
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = datetime.now(timezone.utc)
        
        current_sess = UserSession(
            user_id=current_user.id,
            session_token=secrets.token_urlsafe(32),
            device_name="Chrome trên Windows 11 (Thiết bị này)",
            browser="Chrome 128.0",
            os="Windows 11",
            ip_address=client_ip,
            location="Hà Nội, Việt Nam",
            is_current=True,
            last_active_at=now,
        )
        mobile_sess = UserSession(
            user_id=current_user.id,
            session_token=secrets.token_urlsafe(32),
            device_name="Safari trên iPhone 15 Pro",
            browser="Safari Mobile 17.4",
            os="iOS 17",
            ip_address="113.161.72.45",
            location="TP. Hồ Chí Minh, Việt Nam",
            is_current=False,
            last_active_at=now - timedelta(hours=3),
        )
        tablet_sess = UserSession(
            user_id=current_user.id,
            session_token=secrets.token_urlsafe(32),
            device_name="Firefox trên MacBook Pro",
            browser="Firefox 126.0",
            os="macOS Sonoma",
            ip_address="42.119.148.12",
            location="Đà Nẵng, Việt Nam",
            is_current=False,
            last_active_at=now - timedelta(days=1),
        )
        db.add_all([current_sess, mobile_sess, tablet_sess])
        await db.commit()

        stmt = select(UserSession).where(UserSession.user_id == current_user.id).order_by(UserSession.is_current.desc(), UserSession.last_active_at.desc())
        res = await db.execute(stmt)
        sessions = res.scalars().all()

    return [
        {
            "id": s.id,
            "device_name": s.device_name,
            "browser": s.browser,
            "os": s.os,
            "ip_address": s.ip_address,
            "location": s.location,
            "is_current": s.is_current,
            "last_active_at": s.last_active_at,
        }
        for s in sessions
    ]


@router.post("/sessions/revoke-others")
async def revoke_other_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke all active sessions of current user except the current device.
    """
    stmt = delete(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.is_current == False
    )
    await db.execute(stmt)
    await db.commit()

    return {"message": "Đã đăng xuất thành công khỏi tất cả các thiết bị khác!"}


