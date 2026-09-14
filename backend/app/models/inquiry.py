import enum
from typing import TYPE_CHECKING, List, Optional
# pyrefly: ignore [missing-import]
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey, Enum
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.user import User


class InquiryStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    AI_SUGGESTED = "AI_SUGGESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REPLIED = "REPLIED"


class EventInquiry(Base, TimestampMixin):
    __tablename__ = "event_inquiries"

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
    assigned_staff_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    ai_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default=InquiryStatusEnum.PENDING.value,
        nullable=False,
        index=True
    )

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="inquiries")
    participant: Mapped["User"] = relationship(
        "User",
        foreign_keys=[participant_id],
        back_populates="inquiries"
    )
    assigned_staff: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[assigned_staff_id],
        back_populates="assigned_inquiries"
    )
    replies: Mapped[List["InquiryReply"]] = relationship(
        "InquiryReply",
        back_populates="inquiry",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<EventInquiry id={self.id} event_id={self.event_id} status='{self.status}'>"


class InquiryReply(Base, TimestampMixin):
    __tablename__ = "inquiry_replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inquiry_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("event_inquiries.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    edited_by_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    inquiry: Mapped["EventInquiry"] = relationship("EventInquiry", back_populates="replies")
    sender: Mapped["User"] = relationship("User", back_populates="replies")

    def __repr__(self) -> str:
        return f"<InquiryReply id={self.id} inquiry_id={self.inquiry_id} is_ai={self.is_ai_generated}>"
