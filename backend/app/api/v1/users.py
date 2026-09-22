import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import UserResponse, UserProfileUpdate
from app.api.v1.auth import _build_user_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user profile."""
    return await _build_user_response(current_user, db)


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update profile info for the currently authenticated user:
    - Display Name (full_name)
    - Phone Number (with Vietnamese/international format validation)
    - Job Title
    - Avatar URL
    - Preferences (Language, Theme)
    """
    # 1. Validate and update Full Name
    if payload.full_name is not None:
        trimmed_name = payload.full_name.strip()
        if len(trimmed_name) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên hiển thị phải có ít nhất 2 ký tự!"
            )
        current_user.full_name = trimmed_name

    # 2. Validate and update Phone Number
    if payload.phone_number is not None:
        phone_raw = payload.phone_number.strip()
        if phone_raw == "":
            current_user.phone_number = None
        else:
            # Strip spaces, hyphens, parentheses, dots
            clean_phone = re.sub(r"[\s\-\.\(\)]", "", phone_raw)
            is_valid_vn = bool(re.match(r"^(\+84|0)[3|5|7|8|9][0-9]{8}$", clean_phone))
            is_valid_intl = bool(re.match(r"^\+?[0-9]{9,15}$", clean_phone))

            if not (is_valid_vn or is_valid_intl):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Định dạng số điện thoại không hợp lệ! Vui lòng nhập số điện thoại hợp lệ (ví dụ: 0901234567 hoặc +84901234567)."
                )
            current_user.phone_number = phone_raw

    # 3. Update Job Title
    if payload.job_title is not None:
        current_user.job_title = payload.job_title.strip() if payload.job_title.strip() else None

    # 4. Update Avatar URL
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip() if payload.avatar_url.strip() else None

    # 5. Update Preferences (Language, Theme)
    if payload.preferences is not None:
        existing_prefs = dict(current_user.preferences or {"language": "vi", "theme": "dark"})
        existing_prefs.update(payload.preferences)
        current_user.preferences = existing_prefs

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return await _build_user_response(current_user, db)
