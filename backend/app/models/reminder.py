from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.event import Event, EventSchedule


class UserReminder(Base, TimestampMixin):
    __tablename__ = "user_reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    session_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    notified_24h: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notified_1h: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    session: Mapped[Optional["EventSchedule"]] = relationship("EventSchedule", foreign_keys=[session_id])
    event: Mapped["Event"] = relationship("Event", foreign_keys=[event_id])

    def __repr__(self) -> str:
        return f"<UserReminder id={self.id} user_id={self.user_id} session_id={self.session_id}>"
