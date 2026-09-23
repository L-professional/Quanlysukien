import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
# pyrefly: ignore [missing-import]
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.category import EventCategory
    from app.models.registration import Registration
    from app.models.inquiry import EventInquiry
    from app.models.knowledge import KnowledgeBase


class EventStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("event_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    location_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    google_maps_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    registered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # New Fields
    slug: Mapped[str] = mapped_column(String(255), nullable=True, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), default="Hội thảo", nullable=True)
    cover_image: Mapped[str] = mapped_column(String(1000), nullable=True)
    homepage_visible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    homepage_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[str] = mapped_column(
        String(50),
        default=EventStatusEnum.DRAFT.value,
        nullable=False,
        index=True
    )

    # Relationships
    category: Mapped["EventCategory"] = relationship("EventCategory", back_populates="events")
    registrations: Mapped[List["Registration"]] = relationship(
        "Registration",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    inquiries: Mapped[List["EventInquiry"]] = relationship(
        "EventInquiry",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    knowledge_items: Mapped[List["KnowledgeBase"]] = relationship(
        "KnowledgeBase",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    schedules: Mapped[List["EventSchedule"]] = relationship(
        "EventSchedule",
        back_populates="event",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Event id={self.id} title='{self.title}' status='{self.status}'>"


class EventSchedule(Base, TimestampMixin):
    __tablename__ = "event_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    speaker_name: Mapped[str] = mapped_column(String(255), nullable=False)
    speaker_role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_time: Mapped[str] = mapped_column(String(50), nullable=False)
    end_time: Mapped[str] = mapped_column(String(50), nullable=False)
    room_location: Mapped[str] = mapped_column(String(255), nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    date_label: Mapped[str] = mapped_column(String(100), default="Ngày 1", nullable=False)
    track: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    google_maps_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    registered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    speaker_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="schedules")
    registrations = relationship("Registration", back_populates="schedule", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<EventSchedule id={self.id} title='{self.title}' speaker='{self.speaker_name}'>"
