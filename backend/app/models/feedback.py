from typing import TYPE_CHECKING, Optional
from sqlalchemy import Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.event import Event, EventSchedule


class Feedback(Base, TimestampMixin):
    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    session_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(50), default="positive", nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
    event: Mapped["Event"] = relationship("Event", foreign_keys=[event_id])
    session: Mapped[Optional["EventSchedule"]] = relationship("EventSchedule", foreign_keys=[session_id])

    def __repr__(self) -> str:
        return f"<Feedback id={self.id} event_id={self.event_id} rating={self.rating}>"
