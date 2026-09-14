from typing import TYPE_CHECKING, List, Optional
# pyrefly: ignore [missing-import]
from pgvector.sqlalchemy import Vector
# pyrefly: ignore [missing-import]
from sqlalchemy import Integer, String, Text, ForeignKey
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.event import Event


class KnowledgeBase(Base, TimestampMixin):
    __tablename__ = "knowledge_base"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Gemini text-embedding-004 produces 768-dimensional embeddings
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(768), nullable=True)

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="knowledge_items")

    def __repr__(self) -> str:
        return f"<KnowledgeBase id={self.id} event_id={self.event_id} title='{self.title}'>"
