from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.event import EventSchedule
    from app.models.user import User


class SessionQuestion(Base, TimestampMixin):
    __tablename__ = "session_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    asker_name: Mapped[str] = mapped_column(String(255), nullable=False)
    asker_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    question_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_answered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    schedule: Mapped["EventSchedule"] = relationship("EventSchedule", backref="questions")

    def __repr__(self) -> str:
        return f"<SessionQuestion id={self.id} session_id={self.session_id} status='{self.status}'>"


class SessionResource(Base, TimestampMixin):
    __tablename__ = "session_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), default="PDF", nullable=False)
    file_size: Mapped[Optional[str]] = mapped_column(String(50), default="5.0 MB", nullable=True)
    uploaded_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationship
    schedule: Mapped["EventSchedule"] = relationship("EventSchedule", backref="resources")

    def __repr__(self) -> str:
        return f"<SessionResource id={self.id} session_id={self.session_id} title='{self.title}'>"


class SessionMaterial(Base, TimestampMixin):
    __tablename__ = "session_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    material_type: Mapped[str] = mapped_column(String(50), default="SLIDE", nullable=False)
    file_size: Mapped[Optional[str]] = mapped_column(String(50), default="5.0 MB", nullable=True)
    is_public_to_all: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationship
    schedule: Mapped["EventSchedule"] = relationship("EventSchedule", backref="materials")

    def __repr__(self) -> str:
        return f"<SessionMaterial id={self.id} title='{self.title}' type='{self.material_type}'>"


class SessionFeedback(Base, TimestampMixin):
    __tablename__ = "session_feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("event_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    participant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5
    content_quality: Mapped[Optional[int]] = mapped_column(Integer, default=5, nullable=True)
    speaker_rating: Mapped[Optional[int]] = mapped_column(Integer, default=5, nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    schedule: Mapped["EventSchedule"] = relationship("EventSchedule", backref="feedbacks")

    def __repr__(self) -> str:
        return f"<SessionFeedback id={self.id} session_id={self.session_id} rating={self.rating}>"
