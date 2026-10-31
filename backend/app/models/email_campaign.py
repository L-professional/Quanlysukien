"""
Email Campaign Models
Provides: EmailCampaign, EmailRecipient, EmailWebhookEvent, EmailUnsubscribe
"""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Integer, String, Text, DateTime, Boolean,
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.event import Event


class CampaignStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    SENDING = "SENDING"
    COMPLETED = "COMPLETED"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class RecipientStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    SENDING = "SENDING"
    RETRYING = "RETRYING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    BOUNCED = "BOUNCED"
    COMPLAINED = "COMPLAINED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class EmailCampaign(Base, TimestampMixin):
    """
    Represents a single marketing email campaign.
    Stores the AI-generated or manually crafted email content,
    approval status, and scheduling information.
    """
    __tablename__ = "email_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Campaign identification
    campaign_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)

    # Content (HTML rendered from AI-generated promotional article)
    html_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plain_text_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Source AI content (stores raw PR Studio JSON output for traceability)
    ai_email_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_email_subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ai_email_cta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_social_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_sms_reminder: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Related event
    event_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Campaign status
    status: Mapped[str] = mapped_column(
        String(50),
        default=CampaignStatusEnum.DRAFT.value,
        nullable=False,
        index=True
    )

    # Recipient targeting
    target_audience: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="ALL_SUBSCRIBED"
        # Possible values: ALL_SUBSCRIBED, EVENT_REGISTERED, MANUAL
    )
    recipient_mode: Mapped[str] = mapped_column(
        String(50),
        default="DATABASE",
        nullable=False
        # Possible values: DATABASE, MANUAL, COMBINED
    )

    # Sending configuration
    send_immediately: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sending_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sending_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Approval workflow
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    approved_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Statistics (updated as sending progresses)
    total_recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bounced_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    opened_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clicked_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unsubscribed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    event: Mapped[Optional["Event"]] = relationship("Event", foreign_keys=[event_id])
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by])
    recipients: Mapped[List["EmailRecipient"]] = relationship(
        "EmailRecipient",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )

    def __init__(self, **kwargs):
        if "recipient_mode" not in kwargs:
            kwargs["recipient_mode"] = "DATABASE"
        if "status" not in kwargs:
            kwargs["status"] = CampaignStatusEnum.DRAFT.value
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<EmailCampaign id={self.id} name='{self.campaign_name}' status='{self.status}'>"


class EmailRecipient(Base, TimestampMixin):
    """
    Tracks individual email delivery for each recipient in a campaign.
    Prevents duplicate sends and tracks provider delivery events.
    """
    __tablename__ = "email_recipients"
    __table_args__ = (
        UniqueConstraint("campaign_id", "email", name="uq_campaign_email"),
        Index("idx_email_recipients_campaign", "campaign_id"),
        Index("idx_email_recipients_status", "status"),
        Index("idx_email_recipients_provider_msg", "provider_message_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    campaign_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("email_campaigns.id", ondelete="CASCADE"),
        nullable=False
    )
    # Reference to the user (participant) — may be null for external recipients
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Recipient information (denormalized for delivery independence)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(
        String(50),
        default="DATABASE",
        nullable=False,
        index=True
        # Possible values: DATABASE, MANUAL
    )

    # Delivery tracking
    status: Mapped[str] = mapped_column(
        String(50),
        default=RecipientStatusEnum.PENDING.value,
        nullable=False,
        index=True
    )
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True, index=True)

    # Timestamps for delivery events
    queued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    bounced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    complained_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Unsubscribe token for this specific delivery (secure, opaque)
    unsubscribe_token: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True
    )

    # Relationships
    campaign: Mapped["EmailCampaign"] = relationship("EmailCampaign", back_populates="recipients")
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])

    def __init__(self, **kwargs):
        if "source" not in kwargs:
            kwargs["source"] = "DATABASE"
        if "status" not in kwargs:
            kwargs["status"] = RecipientStatusEnum.PENDING.value
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<EmailRecipient id={self.id} email='{self.email}' status='{self.status}'>"


class EmailWebhookEvent(Base):
    """
    Stores raw incoming Resend webhook events for idempotent processing.
    Prevents double-processing of duplicate webhook deliveries.
    """
    __tablename__ = "email_webhook_events"
    __table_args__ = (
        UniqueConstraint("provider_event_id", name="uq_provider_event_id"),
        Index("idx_webhook_provider_msg", "provider_message_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON stored as text
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<EmailWebhookEvent id={self.id} type='{self.event_type}' msg='{self.provider_message_id}'>"


class EmailUnsubscribe(Base, TimestampMixin):
    """
    Tracks global marketing email unsubscriptions.
    When a user unsubscribes from any campaign, they are added here
    and excluded from all future marketing campaigns.
    """
    __tablename__ = "email_unsubscribes"
    __table_args__ = (
        UniqueConstraint("email", name="uq_unsubscribe_email"),
        Index("idx_unsubscribe_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    # The campaign and recipient that triggered the unsubscribe
    campaign_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("email_campaigns.id", ondelete="SET NULL"),
        nullable=True
    )
    recipient_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("email_recipients.id", ondelete="SET NULL"),
        nullable=True
    )
    suppression_type: Mapped[str] = mapped_column(
        String(50),
        default="USER_UNSUBSCRIBE",
        nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<EmailUnsubscribe id={self.id} email='{self.email}' type='{self.suppression_type}'>"
