from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: str = Field(..., min_length=2)
    phone_number: Optional[str] = None
    role: Optional[str] = "PARTICIPANT"
    role_id: Optional[int] = 4  # Default to 4 (PARTICIPANT / ATTENDEE)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone_number: Optional[str] = None
    role_id: int
    role_name: Optional[str] = None
    is_active: bool = True
    avatar_url: Optional[str] = None
    provider: Optional[str] = "local"
    job_title: Optional[str] = None
    is_2fa_enabled: bool = False
    preferences: Optional[dict] = None
    last_active_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[dict] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới tối thiểu 6 ký tự")
    confirm_password: Optional[str] = None


class TwoFactorGenerateResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_code: str  # Data URL or SVG string for displaying QR code
    issuer: str = "EventHub AI"


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, description="Mã xác thực 6 chữ số")
    secret: Optional[str] = None


class TwoFactorDisableRequest(BaseModel):
    password: Optional[str] = None


class SessionItem(BaseModel):
    id: int
    device_name: str
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = "Hà Nội, Việt Nam"
    is_current: bool = False
    last_active_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

