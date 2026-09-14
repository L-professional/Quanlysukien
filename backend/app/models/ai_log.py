from datetime import datetime
from typing import Optional
# pyrefly: ignore [missing-import]
from sqlalchemy import Integer, String, Float, DateTime, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AILog(Base):
    __tablename__ = "ai_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    staff_action: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<AILog id={self.id} task_type='{self.task_type}' latency_ms={self.latency_ms} action='{self.staff_action}'>"
