from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, JSON
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.registration import Registration
    from app.models.inquiry import EventInquiry, InquiryReply


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        default=4,
        server_default="4",
        index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="local", server_default="local")
    job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    two_factor_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=lambda: {"language": "vi", "theme": "dark"})

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    registrations: Mapped[List["Registration"]] = relationship(
        "Registration",
        back_populates="participant",
        cascade="all, delete-orphan"
    )
    inquiries: Mapped[List["EventInquiry"]] = relationship(
        "EventInquiry",
        foreign_keys="EventInquiry.participant_id",
        back_populates="participant",
        cascade="all, delete-orphan"
    )
    assigned_inquiries: Mapped[List["EventInquiry"]] = relationship(
        "EventInquiry",
        foreign_keys="EventInquiry.assigned_staff_id",
        back_populates="assigned_staff"
    )
    replies: Mapped[List["InquiryReply"]] = relationship(
        "InquiryReply",
        back_populates="sender",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' full_name='{self.full_name}'>"
