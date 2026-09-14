"""
Admin User Management Router
Provides CRUD operations on user accounts and security log access.
Only accessible by users with ADMIN role.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_roles, get_user_role_name, get_password_hash
from app.models.user import User
from app.models.role import Role
from app.models.ai_log import AILog

router = APIRouter(prefix="/admin", tags=["Admin — User Management"])

ADMIN_ONLY = Depends(require_roles(["ADMIN"]))
ADMIN_OR_STAFF = Depends(require_roles(["ADMIN", "STAFF"]))

ONLINE_THRESHOLD_MINUTES = 5


# ── Schemas ──────────────────────────────────────────────────────────────────

class AdminUserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: Optional[str] = None
    role_id: int
    role_name: str
    is_active: bool
    is_online: bool
    last_active_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateRoleRequest(BaseModel):
    role_name: str  # "ADMIN" | "STAFF" | "ATTENDEE" | "PARTICIPANT" | "EVENT_MANAGER"


class UpdateStatusRequest(BaseModel):
    is_active: bool


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới tối thiểu 6 ký tự")


class SecurityLogResponse(BaseModel):
    id: int
    task_type: str
    staff_action: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Helper ────────────────────────────────────────────────────────────────────

def _is_online(last_active_at: Optional[datetime]) -> bool:
    """Return True if user was active within the last 5 minutes."""
    if not last_active_at:
        return False
    if last_active_at.tzinfo is None:
        last_active_at = last_active_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - last_active_at <= timedelta(minutes=ONLINE_THRESHOLD_MINUTES)


async def _build_admin_user(user: User, db: AsyncSession) -> AdminUserResponse:
    role_name = await get_user_role_name(user, db)
    return AdminUserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        role_id=user.role_id,
        role_name=role_name,
        is_active=user.is_active,
        is_online=_is_online(user.last_active_at),
        last_active_at=user.last_active_at,
        created_at=user.created_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse], dependencies=[ADMIN_ONLY])
async def list_all_users(
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN] Get all user accounts with online status computed from last_active_at.
    is_online = True if last_active_at is within 5 minutes.
    """
    stmt = select(User).order_by(User.id.asc())
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [await _build_admin_user(u, db) for u in users]


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse, dependencies=[ADMIN_ONLY])
async def update_user_role(
    user_id: int,
    payload: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN] Change a user's role. Valid values: ADMIN, STAFF, ATTENDEE (PARTICIPANT).
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    # Normalize role name
    role_name_upper = payload.role_name.upper()
    if role_name_upper == "ATTENDEE":
        role_name_upper = "PARTICIPANT"  # map to stored DB value

    # Find target Role record
    stmt = select(Role).where(Role.role_name == role_name_upper)
    res = await db.execute(stmt)
    target_role = res.scalar_one_or_none()

    if not target_role:
        # Try ATTENDEE directly
        stmt2 = select(Role).where(Role.role_name == payload.role_name.upper())
        res2 = await db.execute(stmt2)
        target_role = res2.scalar_one_or_none()

    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{payload.role_name}' không tồn tại trong hệ thống."
        )

    user.role_id = target_role.id
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _build_admin_user(user, db)


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse, dependencies=[ADMIN_ONLY])
async def update_user_status(
    user_id: int,
    payload: UpdateStatusRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN] Lock or unlock a user account (is_active: true/false).
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    user.is_active = payload.is_active
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _build_admin_user(user, db)


@router.post("/users/{user_id}/reset-password", dependencies=[ADMIN_ONLY])
async def reset_user_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN] Force reset user password to a new value (bcrypt hashed).
    Admin does not view plain text; password is securely hashed immediately with bcrypt.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    user.hashed_password = get_password_hash(payload.new_password)
    db.add(user)
    await db.commit()
    return {
        "success": True,
        "message": f"Đặt lại mật khẩu thành công cho tài khoản {user.email}."
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[ADMIN_ONLY])
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN] Permanently delete a user account and all associated data (cascade).
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại.")

    await db.delete(user)
    await db.commit()


@router.get("/security-logs", response_model=List[SecurityLogResponse], dependencies=[ADMIN_OR_STAFF])
async def get_security_logs(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN/STAFF] Export system audit logs including HITL reviews and RAG queries.
    Represents the history of privilege changes and admin operations.
    """
    stmt = select(AILog).order_by(AILog.id.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return logs
