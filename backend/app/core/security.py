from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.role import Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hashed password safely."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash password using native bcrypt with safe 72-byte truncation."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu Token xác thực (Missing Bearer Token)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user = await db.get(User, int(user_id))
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin người dùng",
        )

    # Auto-update last_active_at for every authenticated request
    try:
        user.last_active_at = datetime.now(timezone.utc)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except Exception:
        await db.rollback()

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that additionally verifies the account is not banned/deactivated."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.",
        )
    return current_user


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Optional user dependency that returns User if valid token is provided, else None."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    try:
        user = await db.get(User, int(payload["sub"]))
        return user
    except Exception:
        return None


async def get_user_role_name(user: User, db: AsyncSession) -> str:
    """Fetch role name string from the related Role table."""
    try:
        role = await db.get(Role, user.role_id)
        return role.role_name if role else "ATTENDEE"
    except Exception:
        return "ATTENDEE"


def require_roles(allowed_roles: List[str]):
    """
    Factory function returning a FastAPI dependency that enforces role-based access.
    Usage: Depends(require_roles(["ADMIN", "STAFF"]))
    Returns HTTP 403 if user's role is not in allowed_roles list.
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        role_name = await get_user_role_name(current_user, db)
        user_role_upper = (role_name or "ATTENDEE").upper()
        
        # Canonical role set: allow ATTENDEE and PARTICIPANT interchangeably
        normalized_allowed = set()
        for r in allowed_roles:
            r_up = r.upper()
            normalized_allowed.add(r_up)
            if r_up == "ATTENDEE":
                normalized_allowed.add("PARTICIPANT")
            elif r_up == "PARTICIPANT":
                normalized_allowed.add("ATTENDEE")

        if user_role_upper not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Truy cập bị từ chối. Chức vụ '{role_name}' không có quyền thực hiện thao tác này.",
            )
        return current_user

    return role_checker

