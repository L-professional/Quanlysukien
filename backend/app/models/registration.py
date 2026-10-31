from datetime import datetime
from typing import TYPE_CHECKING, Optional
# pyrefly: ignore [missing-import]
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Text, Index, text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.user import User


class Registration(Base, TimestampMixin):
    __tablename__ = "registrations"
    __table_args__ = (
        Index(
            "uq_session_participant",
            "session_id",
            "participant_id",
            unique=True,
            postgresql_where=text("session_id IS NOT NULL"),
        ),
        Index(
            "uq_event_participant",
            "event_id",
            "participant_id",
            unique=True,
            postgresql_where=text("schedule_id IS NULL AND session_id IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    participant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    schedule_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    session_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        index=True
    )
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    qr_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    qr_code_token: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    ticket_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Vé Tham Dự")
    price: Mapped[int] = mapped_column(Integer, default=500000, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_checked_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="registrations")
    participant: Mapped["User"] = relationship("User", back_populates="registrations")
    schedule = relationship("EventSchedule", back_populates="registrations")

    def __repr__(self) -> str:
        return f"<Registration id={self.id} event_id={self.event_id} schedule_id={self.schedule_id} participant_id={self.participant_id}>"
