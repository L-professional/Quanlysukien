from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False) # 'Tổng quan', 'Hiệu quả sự kiện', etc.
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    date_from = Column(DateTime(timezone=True), nullable=True)
    date_to = Column(DateTime(timezone=True), nullable=True)
    filters = Column(JSON, nullable=True) # Any other filters like location, status
    format = Column(String(10), nullable=False, default="PDF")
    status = Column(String(50), nullable=False, default="Hoàn thành")
    file_url = Column(String(500), nullable=True)
    shared_with = Column(JSON, nullable=True) # List of emails or user IDs
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    event = relationship("Event", backref="reports")
    creator = relationship("User", backref="created_reports")


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    frequency = Column(String(50), nullable=False) # 'daily', 'weekly', 'monthly'
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    recipients = Column(JSON, nullable=True) # List of emails
    format = Column(String(10), nullable=False, default="PDF")
    filters = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    event = relationship("Event", backref="scheduled_reports")
    creator = relationship("User", backref="scheduled_reports")
