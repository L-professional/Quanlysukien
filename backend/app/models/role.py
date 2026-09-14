import enum
from typing import TYPE_CHECKING, List
from sqlalchemy import Integer, String, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    EVENT_MANAGER = "EVENT_MANAGER"
    STAFF = "STAFF"
    PARTICIPANT = "PARTICIPANT"
    ATTENDEE = "ATTENDEE"  # Alias for PARTICIPANT (3-tier RBAC)
    SPEAKER = "SPEAKER"  # Diễn giả (Task 32)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="role",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} role_name='{self.role_name}'>"
