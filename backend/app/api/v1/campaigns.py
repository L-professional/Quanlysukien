"""
Campaign Management REST API
Provides full CRUD, approval workflow, immediate & scheduled delivery,
audience preview, recipient logs, analytics, and unsubscribe endpoints.
"""
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select, func, desc, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_active_user, require_roles
from app.models.user import User
from app.models.event import Event
from app.models.email_campaign import (
    EmailCampaign,
    EmailRecipient,
    EmailUnsubscribe,
    CampaignStatusEnum,
    RecipientStatusEnum,
)
from app.services.resend_service import resend_email_service, render_campaign_html
from app.services.campaign_worker import (
    calculate_audience_preview,
    calculate_custom_audience_preview,
    prepare_campaign_recipients,
    send_campaign_in_background,
    is_valid_email,
    normalize_email,
)

logger = logging.getLogger("eventhub.campaigns_api")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/campaigns", tags=["Email Campaigns"])


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ManualRecipientItem(BaseModel):
    email: str
    name: Optional[str] = None


class CampaignCreateRequest(BaseModel):
    campaign_name: str = Field(..., min_length=2, max_length=255)
    subject: str = Field(..., min_length=2, max_length=500)
    html_content: Optional[str] = None
    plain_text_content: Optional[str] = None
    ai_email_body: Optional[str] = None
    ai_email_subject: Optional[str] = None
    ai_email_cta: Optional[str] = None
    ai_social_body: Optional[str] = None
    ai_sms_reminder: Optional[str] = None
    event_id: Optional[int] = None
    target_audience: Optional[str] = "ALL_SUBSCRIBED"  # ALL_SUBSCRIBED, EVENT_REGISTERED
    recipient_mode: Optional[str] = "DATABASE"  # DATABASE, MANUAL, COMBINED
    manual_recipients: Optional[List[Any]] = None
    send_immediately: Optional[bool] = True
    scheduled_at: Optional[datetime] = None


class CampaignUpdateRequest(BaseModel):
    campaign_name: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    plain_text_content: Optional[str] = None
    ai_email_body: Optional[str] = None
    ai_email_cta: Optional[str] = None
    event_id: Optional[int] = None
    target_audience: Optional[str] = None
    recipient_mode: Optional[str] = None
    manual_recipients: Optional[List[Any]] = None
    send_immediately: Optional[bool] = None
    scheduled_at: Optional[datetime] = None


class AudiencePreviewRequest(BaseModel):
    event_id: Optional[int] = None
    target_audience: Optional[str] = "ALL_SUBSCRIBED"
    recipient_mode: Optional[str] = "DATABASE"
    manual_recipients: Optional[List[Any]] = None


class TestSendRequest(BaseModel):
    test_email: EmailStr
    subject: Optional[str] = None
    html_content: Optional[str] = None


class ScheduleCampaignRequest(BaseModel):
    scheduled_at: datetime


class UnsubscribeRequest(BaseModel):
    token: str = Field(..., min_length=10)
    reason: Optional[str] = None


class RecipientLogItem(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    source: Optional[str] = "DATABASE"
    status: str
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/overview")
async def get_campaign_analytics_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Aggregate analytics dashboard stats across all campaigns."""
    total_campaigns = (await db.execute(select(func.count(EmailCampaign.id)))).scalar() or 0
    total_sent = (await db.execute(select(func.sum(EmailCampaign.sent_count)))).scalar() or 0
    total_delivered = (await db.execute(select(func.sum(EmailCampaign.delivered_count)))).scalar() or 0
    total_bounced = (await db.execute(select(func.sum(EmailCampaign.bounced_count)))).scalar() or 0
    total_opened = (await db.execute(select(func.sum(EmailCampaign.opened_count)))).scalar() or 0
    total_clicked = (await db.execute(select(func.sum(EmailCampaign.clicked_count)))).scalar() or 0
    total_unsubscribed = (await db.execute(select(func.count(EmailUnsubscribe.id)))).scalar() or 0

    delivery_rate = round((total_delivered / total_sent * 100), 1) if total_sent > 0 else 0.0
    open_rate = round((total_opened / total_delivered * 100), 1) if total_delivered > 0 else 0.0
    click_rate = round((total_clicked / total_opened * 100), 1) if total_opened > 0 else 0.0

    return {
        "total_campaigns": total_campaigns,
        "total_sent": total_sent,
        "total_delivered": total_delivered,
        "total_bounced": total_bounced,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_unsubscribed": total_unsubscribed,
        "delivery_rate_pct": delivery_rate,
        "open_rate_pct": open_rate,
        "click_rate_pct": click_rate,
    }


@router.get("")
async def list_campaigns(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """List campaigns with status filter, search, and pagination."""
    query = select(EmailCampaign).order_by(desc(EmailCampaign.created_at))

    if status_filter:
        query = query.where(EmailCampaign.status == status_filter.upper())
    if search:
        query = query.where(EmailCampaign.campaign_name.ilike(f"%{search.strip()}%"))

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    campaigns = (await db.execute(query.limit(limit).offset(offset))).scalars().all()

    items = []
    for c in campaigns:
        items.append({
            "id": c.id,
            "campaign_name": c.campaign_name,
            "subject": c.subject,
            "status": c.status,
            "target_audience": c.target_audience,
            "recipient_mode": getattr(c, "recipient_mode", "DATABASE"),
            "send_immediately": c.send_immediately,
            "scheduled_at": c.scheduled_at,
            "event_id": c.event_id,
            "total_recipients": c.total_recipients,
            "sent_count": c.sent_count,
            "delivered_count": c.delivered_count,
            "bounced_count": c.bounced_count,
            "opened_count": c.opened_count,
            "clicked_count": c.clicked_count,
            "unsubscribed_count": c.unsubscribed_count,
            "created_at": c.created_at,
            "approved_at": c.approved_at,
        })

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Create a new promotional email campaign (draft mode by default)."""
    # Verify event exists if provided
    if payload.event_id:
        ev = await db.get(Event, payload.event_id)
        if not ev:
            raise HTTPException(status_code=404, detail="Sự kiện liên kết không tồn tại.")

    # Render HTML template from body if not explicitly provided
    html_content = payload.html_content
    if not html_content and (payload.ai_email_body or payload.plain_text_content):
        ev = await db.get(Event, payload.event_id) if payload.event_id else None
        event_title = ev.title if ev else payload.campaign_name
        event_time = f"{ev.start_date or ''} - {ev.end_date or ''}" if ev else "15-16 Oct 2026"
        event_loc = ev.location_address or ev.location if ev else "EventHub AI Hall"
        cover_img = ev.cover_image if ev else None
        body_text = payload.ai_email_body or payload.plain_text_content or ""
        html_content = render_campaign_html(
            article_body=body_text,
            subject=payload.subject,
            event_title=event_title,
            event_time=event_time,
            event_location=event_loc,
            cover_image_url=cover_img,
            cta_text=payload.ai_email_cta or "Đăng Ký Tham Dự Ngay",
        )

    recipient_mode = (payload.recipient_mode or "DATABASE").upper()
    if recipient_mode not in ("DATABASE", "MANUAL", "COMBINED"):
        recipient_mode = "DATABASE"

    campaign = EmailCampaign(
        campaign_name=payload.campaign_name.strip(),
        subject=payload.subject.strip(),
        html_content=html_content,
        plain_text_content=payload.plain_text_content or payload.ai_email_body,
        ai_email_body=payload.ai_email_body,
        ai_email_subject=payload.ai_email_subject,
        ai_email_cta=payload.ai_email_cta,
        ai_social_body=payload.ai_social_body,
        ai_sms_reminder=payload.ai_sms_reminder,
        event_id=payload.event_id,
        target_audience=payload.target_audience or "ALL_SUBSCRIBED",
        recipient_mode=recipient_mode,
        send_immediately=payload.send_immediately if payload.send_immediately is not None else True,
        scheduled_at=payload.scheduled_at,
        status=CampaignStatusEnum.DRAFT.value,
        created_by=current_user.id,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    # Immediately prepare campaign recipients based on recipient_mode & manual_recipients
    await prepare_campaign_recipients(
        campaign_id=campaign.id,
        db=db,
        manual_recipients=payload.manual_recipients,
    )

    # Calculate initial recipient preview count
    preview = await calculate_audience_preview(campaign.id, db)
    campaign.total_recipients = preview["eligible"]
    await db.commit()

    return {
        "id": campaign.id,
        "campaign_name": campaign.campaign_name,
        "subject": campaign.subject,
        "status": campaign.status,
        "recipient_mode": campaign.recipient_mode,
        "total_recipients": campaign.total_recipients,
        "created_at": campaign.created_at,
    }


@router.post("/audience-preview")
async def calculate_custom_audience_preview_endpoint(
    payload: AudiencePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Calculates live recipient segmentation breakdown before campaign creation."""
    return await calculate_custom_audience_preview(
        db=db,
        recipient_mode=payload.recipient_mode or "DATABASE",
        target_audience=payload.target_audience or "ALL_SUBSCRIBED",
        event_id=payload.event_id,
        manual_recipients=payload.manual_recipients,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public Unsubscribe Endpoints (RFC 8058 & Anti-Crawler Safe)
# Registered before parameterized /{campaign_id} routes to prevent route collision.
# ─────────────────────────────────────────────────────────────────────────────

def _mask_email(email: str) -> str:
    """Mask email for privacy e.g. j***n@domain.com."""
    parts = email.split("@")
    if len(parts) != 2:
        return "***"
    name, domain = parts
    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[0] + "***" + name[-1]
    return f"{masked_name}@{domain}"


@router.get("/unsubscribe-info")
async def get_unsubscribe_info(
    token: str = Query(..., min_length=10),
    db: AsyncSession = Depends(get_db),
):
    """
    Public GET endpoint: Safely retrieves campaign context for the unsubscribe page.
    CRITICAL: Does NOT unsubscribe the user, preventing email virus/crawler scanners
    from automatically opting out users.
    """
    token_clean = token.strip()
    recipient = (
        await db.execute(
            select(EmailRecipient).where(EmailRecipient.unsubscribe_token == token_clean)
        )
    ).scalar_one_or_none()

    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mã token hủy đăng ký không hợp lệ hoặc đã hết hạn.",
        )

    campaign = await db.get(EmailCampaign, recipient.campaign_id)
    campaign_name = campaign.campaign_name if campaign else "EventHub AI"

    # Check if already unsubscribed
    is_unsubscribed = (
        await db.execute(
            select(EmailUnsubscribe).where(EmailUnsubscribe.email == recipient.email)
        )
    ).scalar_one_or_none() is not None

    return {
        "valid": True,
        "masked_email": _mask_email(recipient.email),
        "campaign_name": campaign_name,
        "is_already_unsubscribed": is_unsubscribed,
    }


@router.post("/unsubscribe")
async def unsubscribe_recipient(
    payload: UnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public POST endpoint: Confirms explicit recipient unsubscription.
    Validates token, immediately excludes from future campaigns,
    and updates suppression logs with timestamp and source.
    """
    token_clean = payload.token.strip()
    recipient = (
        await db.execute(
            select(EmailRecipient).where(EmailRecipient.unsubscribe_token == token_clean)
        )
    ).scalar_one_or_none()

    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mã token hủy đăng ký không hợp lệ hoặc đã hết hạn.",
        )

    now_utc = datetime.now(timezone.utc)

    # Check if already unsubscribed
    existing_unsub = (
        await db.execute(
            select(EmailUnsubscribe).where(EmailUnsubscribe.email == recipient.email)
        )
    ).scalar_one_or_none()

    if not existing_unsub:
        unsub_record = EmailUnsubscribe(
            email=recipient.email,
            user_id=recipient.user_id,
            campaign_id=recipient.campaign_id,
            recipient_id=recipient.id,
            suppression_type="USER_UNSUBSCRIBE",
            reason=payload.reason or "Người dùng chủ động bấm xác nhận hủy đăng ký",
        )
        db.add(unsub_record)

        # Immediately update user marketing consent state
        if recipient.user_id:
            user = await db.get(User, recipient.user_id)
            if user:
                user.is_marketing_subscribed = False
                user.marketing_unsubscribed_at = now_utc

        # Update campaign unsubscribed counter
        campaign = await db.get(EmailCampaign, recipient.campaign_id)
        if campaign:
            campaign.unsubscribed_count += 1

        await db.commit()

    return {
        "status": "success",
        "message": f"Email {_mask_email(recipient.email)} đã được hủy đăng ký nhận thông báo truyền thông thành công.",
        "unsubscribed_at": now_utc,
    }


@router.get("/{campaign_id}")
async def get_campaign_detail(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Retrieve full campaign details, HTML preview, and audience preview."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    event_title = None
    if campaign.event_id:
        ev = await db.get(Event, campaign.event_id)
        if ev:
            event_title = ev.title

    preview = await calculate_audience_preview(campaign.id, db)

    return {
        "id": campaign.id,
        "campaign_name": campaign.campaign_name,
        "subject": campaign.subject,
        "html_content": campaign.html_content,
        "plain_text_content": campaign.plain_text_content,
        "ai_email_body": campaign.ai_email_body,
        "ai_email_cta": campaign.ai_email_cta,
        "status": campaign.status,
        "target_audience": campaign.target_audience,
        "recipient_mode": getattr(campaign, "recipient_mode", "DATABASE"),
        "send_immediately": campaign.send_immediately,
        "scheduled_at": campaign.scheduled_at,
        "event_id": campaign.event_id,
        "event_title": event_title,
        "created_by": campaign.created_by,
        "approved_by": campaign.approved_by,
        "approved_at": campaign.approved_at,
        "total_recipients": campaign.total_recipients,
        "sent_count": campaign.sent_count,
        "delivered_count": campaign.delivered_count,
        "bounced_count": campaign.bounced_count,
        "opened_count": campaign.opened_count,
        "clicked_count": campaign.clicked_count,
        "unsubscribed_count": campaign.unsubscribed_count,
        "created_at": campaign.created_at,
        "sending_started_at": campaign.sending_started_at,
        "sending_completed_at": campaign.sending_completed_at,
        "audience_preview": preview,
    }


@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: int,
    payload: CampaignUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Update campaign draft parameters before launching."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    if campaign.status in [CampaignStatusEnum.SENDING.value, CampaignStatusEnum.COMPLETED.value]:
        raise HTTPException(status_code=400, detail="Không thể chỉnh sửa chiến dịch đang gửi hoặc đã hoàn tất.")

    if payload.campaign_name:
        campaign.campaign_name = payload.campaign_name.strip()
    if payload.subject:
        campaign.subject = payload.subject.strip()
    if payload.html_content is not None:
        campaign.html_content = payload.html_content
    if payload.plain_text_content is not None:
        campaign.plain_text_content = payload.plain_text_content
    if payload.ai_email_body is not None:
        campaign.ai_email_body = payload.ai_email_body
    if payload.ai_email_cta is not None:
        campaign.ai_email_cta = payload.ai_email_cta
    if payload.event_id is not None:
        campaign.event_id = payload.event_id
    if payload.target_audience:
        campaign.target_audience = payload.target_audience
    if payload.recipient_mode:
        campaign.recipient_mode = payload.recipient_mode.upper()
    if payload.send_immediately is not None:
        campaign.send_immediately = payload.send_immediately
    if payload.scheduled_at is not None:
        campaign.scheduled_at = payload.scheduled_at

    # If audience targeting parameters or manual recipients are updated for draft, re-populate recipients
    if (
        payload.recipient_mode is not None
        or payload.manual_recipients is not None
        or payload.target_audience is not None
        or payload.event_id is not None
    ):
        if campaign.status in [CampaignStatusEnum.DRAFT.value, CampaignStatusEnum.PENDING_APPROVAL.value]:
            await db.execute(
                delete(EmailRecipient).where(
                    EmailRecipient.campaign_id == campaign.id,
                    EmailRecipient.status == RecipientStatusEnum.PENDING.value
                )
            )
            await prepare_campaign_recipients(
                campaign=campaign,
                db=db,
                manual_recipients=payload.manual_recipients,
            )

    await db.commit()
    await db.refresh(campaign)

    return {"message": "Cập nhật chiến dịch thành công.", "id": campaign.id}


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    """Delete a campaign (only allowed for Draft or Cancelled campaigns)."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    if campaign.status == CampaignStatusEnum.SENDING.value:
        raise HTTPException(status_code=400, detail="Chiến dịch đang gửi, vui lòng bấm Hủy trước khi xóa.")

    await db.delete(campaign)
    await db.commit()
    return {"message": "Đã xóa chiến dịch thành công."}


@router.get("/{campaign_id}/audience-preview")
async def preview_campaign_audience(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Calculates eligible vs excluded recipient counts."""
    preview = await calculate_audience_preview(campaign_id, db)
    return preview


@router.post("/{campaign_id}/approve")
async def approve_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Approve a draft campaign for dispatch."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    if campaign.status not in [CampaignStatusEnum.DRAFT.value, CampaignStatusEnum.PENDING_APPROVAL.value]:
        raise HTTPException(status_code=400, detail=f"Không thể duyệt chiến dịch có trạng thái '{campaign.status}'.")

    campaign.status = CampaignStatusEnum.APPROVED.value
    campaign.approved_by = current_user.id
    campaign.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(campaign)

    return {"message": "Chiến dịch đã được duyệt thành công.", "status": campaign.status}


@router.post("/{campaign_id}/send")
async def launch_campaign_now(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Initiates immediate background email dispatch for an approved campaign."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    if campaign.status not in [CampaignStatusEnum.APPROVED.value, CampaignStatusEnum.DRAFT.value]:
        raise HTTPException(status_code=400, detail=f"Chiến dịch ở trạng thái '{campaign.status}' không thể khởi chạy.")

    # Auto-approve if triggered by authorized manager/admin
    if not campaign.approved_at:
        campaign.approved_by = current_user.id
        campaign.approved_at = datetime.now(timezone.utc)

    campaign.status = CampaignStatusEnum.SENDING.value
    campaign.send_immediately = True
    await db.commit()

    # Launch background worker task
    asyncio.create_task(send_campaign_in_background(campaign_id))

    return {
        "message": "Đã bắt đầu gửi chiến dịch email trong nền.",
        "campaign_id": campaign.id,
        "status": campaign.status,
    }


@router.post("/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: int,
    payload: ScheduleCampaignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Schedule campaign to be automatically launched at a future timestamp."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    sched_time = payload.scheduled_at
    if sched_time.tzinfo is None:
        sched_time = sched_time.replace(tzinfo=timezone.utc)

    now_utc = datetime.now(timezone.utc)
    if sched_time <= now_utc:
        raise HTTPException(status_code=400, detail="Thời gian lên lịch phải ở tương lai.")

    campaign.scheduled_at = sched_time
    campaign.send_immediately = False
    campaign.status = CampaignStatusEnum.SCHEDULED.value
    if not campaign.approved_at:
        campaign.approved_by = current_user.id
        campaign.approved_at = now_utc

    await db.commit()
    await db.refresh(campaign)

    return {
        "message": f"Đã lên lịch chiến dịch gửi vào {campaign.scheduled_at}.",
        "scheduled_at": campaign.scheduled_at,
        "status": campaign.status,
    }


@router.post("/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Cancels a scheduled or currently sending campaign."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    if campaign.status in [CampaignStatusEnum.COMPLETED.value, CampaignStatusEnum.CANCELLED.value]:
        raise HTTPException(status_code=400, detail="Chiến dịch đã hoàn tất hoặc đã bị hủy trước đó.")

    campaign.status = CampaignStatusEnum.CANCELLED.value
    await db.commit()
    await db.refresh(campaign)

    return {"message": "Đã hủy chiến dịch thành công.", "status": campaign.status}


@router.post("/{campaign_id}/test-send")
@router.post("/{campaign_id}/send-test")
async def send_test_preview(
    campaign_id: int,
    payload: TestSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Send an instant preview email to an authorized email address."""
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch email.")

    subject_to_use = payload.subject or campaign.subject

    # 1. Always create or fetch a valid Registration in DB for this test recipient & event
    from app.services.ticket_service import get_or_create_registration_ticket
    ticket_reg = await get_or_create_registration_ticket(
        db=db,
        email=str(payload.test_email),
        event_id=campaign.event_id,
        event_title=campaign.campaign_name,
        full_name=current_user.full_name or "Ban Quản Trị",
        ticket_type="Vé VIP All-Access Pass",
        force_fresh=True,
    )

    ev = await db.get(Event, ticket_reg.event_id) if ticket_reg.event_id else None
    recipient_display_name = (
        current_user.full_name
        if (current_user and current_user.full_name and "demo" not in current_user.full_name.lower())
        else str(payload.test_email).split("@")[0].title()
    )

    html_to_use = render_campaign_html(
        article_body=campaign.ai_email_body or campaign.plain_text_content or "Bản tin truyền thông sự kiện EventHub AI.",
        subject=subject_to_use,
        event_title=ev.title if ev else campaign.campaign_name,
        recipient_name=recipient_display_name,
        event_time=f"{ev.start_date or ''} - {ev.end_date or ''}" if ev else "15-16 Oct 2026",
        event_location=ev.location_address or ev.location if ev else "Trung tâm Hội nghị EventHub AI",
        cover_image_url=ev.cover_image if ev else None,
        cta_text=campaign.ai_email_cta or "Đăng Ký Tham Dự Ngay",
        qr_token=ticket_reg.qr_code_token,
        ticket_type=ticket_reg.ticket_type or "Vé VIP All-Access Pass",
    )

    res = await resend_email_service.send_test_email(
        to_email=str(payload.test_email),
        subject=subject_to_use,
        html_content=html_to_use,
        campaign_name=campaign.campaign_name,
    )

    if not res.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Gửi email thử nghiệm thất bại: {res.get('error')}",
        )

    return {
        "message": f"Đã gửi email thử nghiệm kèm vé QR đến {payload.test_email} thành công.",
        "provider_message_id": res.get("message_id"),
        "is_simulated": res.get("is_simulated", False),
        "qr_code_token": ticket_reg.qr_code_token,
        "event_id": ticket_reg.event_id,
        "ticket_id": ticket_reg.id,
    }


@router.get("/{campaign_id}/recipients", response_model=List[RecipientLogItem])
async def list_campaign_recipients(
    campaign_id: int,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "EVENT_MANAGER"])),
):
    """Retrieve delivery logs for a specific campaign."""
    stmt = (
        select(EmailRecipient)
        .where(EmailRecipient.campaign_id == campaign_id)
        .order_by(desc(EmailRecipient.id))
        .limit(limit)
        .offset(offset)
    )
    recipients = (await db.execute(stmt)).scalars().all()
    return recipients

