"""
Background Email Campaign Worker
Features:
- Atomic campaign claiming with database row locking (with_for_update)
- Verifiable marketing consent enforcement & pre-delivery recheck
- Idempotency keys to prevent duplicate provider sends
- Exponential backoff retry policies for transient errors & permanent failure suppression
- Worker crash recovery for interrupted campaigns
- Comprehensive recipient state tracking (QUEUED, SENDING, RETRYING, SENT, FAILED, SKIPPED)
- Partial failure status handling (PARTIALLY_FAILED)
"""
import secrets
import logging
import asyncio
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.email_campaign import (
    EmailCampaign,
    EmailRecipient,
    EmailUnsubscribe,
    CampaignStatusEnum,
    RecipientStatusEnum,
)
from app.models.user import User
from app.models.event import Event
from app.models.registration import Registration
from app.services.resend_service import (
    resend_email_service,
    render_campaign_html,
    generate_plain_text_alternative,
)

logger = logging.getLogger("eventhub.campaign_worker")
logger.setLevel(logging.INFO)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def is_valid_email(email: Optional[str]) -> bool:
    """Validate email string format."""
    if not email:
        return False
    clean = email.strip()
    return bool(EMAIL_REGEX.match(clean)) and len(clean) <= 254


def normalize_email(email: Optional[str]) -> str:
    """Normalize whitespace and casing of email string."""
    if not email:
        return ""
    return email.strip().lower()


async def calculate_custom_audience_preview(
    db: AsyncSession,
    recipient_mode: str = "DATABASE",
    target_audience: str = "ALL_SUBSCRIBED",
    event_id: Optional[int] = None,
    manual_recipients: Optional[List[Any]] = None,
    campaign_id: Optional[int] = None,
) -> Dict[str, int]:
    """
    Computes recipient segmentation statistics for a campaign before sending.
    Supports DATABASE, MANUAL, and COMBINED modes.
    Enforces that only customers with verifiable consent are considered eligible.
    """
    mode = (recipient_mode or "DATABASE").upper()

    # 1. Fetch all suppressed/unsubscribed emails
    unsub_res = await db.execute(select(EmailUnsubscribe.email))
    unsubscribed_set = {normalize_email(row[0]) for row in unsub_res.all() if row[0]}

    # 2. Fetch all opted-out users (in users table with is_marketing_subscribed == False or marketing_unsubscribed_at)
    opted_out_res = await db.execute(
        select(User.email).where(
            or_(
                User.is_marketing_subscribed.is_(False),
                User.marketing_unsubscribed_at.is_not(None),
            )
        )
    )
    opted_out_users_set = {normalize_email(row[0]) for row in opted_out_res.all() if row[0]}

    # 3. Fetch already sent emails for this campaign if campaign_id is provided
    already_sent_set = set()
    if campaign_id:
        sent_res = await db.execute(
            select(EmailRecipient.email).where(
                EmailRecipient.campaign_id == campaign_id,
                EmailRecipient.status.in_([
                    RecipientStatusEnum.SENT.value,
                    RecipientStatusEnum.DELIVERED.value,
                ]),
            )
        )
        already_sent_set = {normalize_email(row[0]) for row in sent_res.all() if row[0]}

    total_entered = 0
    valid_entered = 0
    duplicates_count = 0
    suppressed_count = 0
    invalid_count = 0
    already_sent_count = 0
    missing_consent_count = 0
    eligible_count = 0
    unsub_count = 0

    seen_emails = set()

    # Process manual recipients if mode is MANUAL or COMBINED
    if mode in ("MANUAL", "COMBINED"):
        manual_list = manual_recipients or []
        # If campaign_id is passed and no manual_recipients given, fetch existing manual recipients from DB
        if campaign_id and not manual_list:
            existing_manual_res = await db.execute(
                select(EmailRecipient).where(
                    EmailRecipient.campaign_id == campaign_id,
                    EmailRecipient.source == "MANUAL",
                )
            )
            manual_list = [
                {"email": r.email, "name": r.full_name}
                for r in existing_manual_res.scalars().all()
            ]

        for item in manual_list:
            total_entered += 1
            if isinstance(item, str):
                raw_email = item
                raw_name = ""
            elif isinstance(item, dict):
                raw_email = item.get("email", "")
                raw_name = item.get("name") or item.get("full_name") or ""
            elif hasattr(item, "email"):
                raw_email = getattr(item, "email", "")
                raw_name = getattr(item, "name", "") or getattr(item, "full_name", "") or ""
            else:
                raw_email = str(item)
                raw_name = ""

            clean_email = normalize_email(raw_email)
            if not clean_email or not is_valid_email(clean_email):
                invalid_count += 1
                continue

            valid_entered += 1

            if clean_email in seen_emails:
                duplicates_count += 1
                continue
            seen_emails.add(clean_email)

            if clean_email in already_sent_set:
                already_sent_count += 1
                continue

            if clean_email in unsubscribed_set:
                unsub_count += 1
                suppressed_count += 1
                continue

            if clean_email in opted_out_users_set:
                missing_consent_count += 1
                suppressed_count += 1
                continue

            eligible_count += 1

    # Process database recipients if mode is DATABASE or COMBINED
    db_candidates: List[Tuple[str, str, Optional[int], bool]] = []
    if mode in ("DATABASE", "COMBINED"):
        if target_audience == "EVENT_REGISTERED" and event_id:
            reg_stmt = (
                select(Registration, User)
                .join(User, Registration.participant_id == User.id, isouter=True)
                .where(Registration.event_id == event_id)
            )
            res = await db.execute(reg_stmt)
            for reg, usr in res.all():
                email_val = (reg.email or (usr.email if usr else "") or "").strip()
                name_val = reg.full_name or (usr.full_name if usr else "") or "Khách Tham Dự"
                u_id = usr.id if usr else None
                has_consent = bool(usr and usr.is_marketing_subscribed and usr.marketing_consent_at)
                db_candidates.append((email_val, name_val, u_id, has_consent))
        else:
            user_stmt = select(User).where(User.is_active.is_(True))
            res = await db.execute(user_stmt)
            for usr in res.scalars().all():
                has_consent = bool(usr.is_marketing_subscribed and usr.marketing_consent_at)
                db_candidates.append((usr.email.strip(), usr.full_name or "Khách Hàng", usr.id, has_consent))

        for email_str, name, u_id, has_consent in db_candidates:
            email_clean = normalize_email(email_str)
            if not email_clean or not is_valid_email(email_clean):
                invalid_count += 1
                continue

            if email_clean in seen_emails:
                # Already included (either earlier in db or via manual list)
                duplicates_count += 1
                continue
            seen_emails.add(email_clean)

            if email_clean in already_sent_set:
                already_sent_count += 1
                continue

            if email_clean in unsubscribed_set:
                unsub_count += 1
                continue

            if not has_consent:
                missing_consent_count += 1
                continue

            eligible_count += 1

    total_selected = len(seen_emails) + invalid_count

    return {
        "total_selected": total_selected,
        "eligible": eligible_count,
        "unsubscribed": unsub_count,
        "invalid": invalid_count,
        "already_sent": already_sent_count,
        "missing_consent": missing_consent_count,
        "total_entered": total_entered,
        "valid": valid_entered,
        "duplicates": duplicates_count,
        "suppressed": suppressed_count,
    }


async def calculate_audience_preview(
    campaign_id: int,
    db: AsyncSession,
) -> Dict[str, int]:
    """
    Computes recipient segmentation statistics for a campaign before sending.
    Enforces that only customers with verifiable consent are considered eligible.
    """
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        return {
            "total_selected": 0,
            "eligible": 0,
            "unsubscribed": 0,
            "invalid": 0,
            "already_sent": 0,
            "missing_consent": 0,
            "total_entered": 0,
            "valid": 0,
            "duplicates": 0,
            "suppressed": 0,
        }

    return await calculate_custom_audience_preview(
        db=db,
        recipient_mode=getattr(campaign, "recipient_mode", "DATABASE"),
        target_audience=campaign.target_audience or "ALL_SUBSCRIBED",
        event_id=campaign.event_id,
        campaign_id=campaign_id,
    )


async def prepare_campaign_recipients(
    campaign_id: int,
    db: AsyncSession,
    manual_recipients: Optional[List[Any]] = None,
) -> int:
    """
    Populates email_recipients for a campaign based on strict consent and targeting criteria.
    Supports DATABASE, MANUAL, and COMBINED modes.
    Deduplicates across database and manual recipients.
    """
    campaign = await db.get(EmailCampaign, campaign_id)
    if not campaign:
        raise ValueError(f"Campaign {campaign_id} not found.")

    mode = (getattr(campaign, "recipient_mode", "DATABASE") or "DATABASE").upper()

    # 1. Unsubscribed set
    unsub_res = await db.execute(select(EmailUnsubscribe.email))
    unsubscribed_set = {normalize_email(row[0]) for row in unsub_res.all() if row[0]}

    # 2. Opted-out users
    opted_out_res = await db.execute(
        select(User.email).where(
            or_(
                User.is_marketing_subscribed.is_(False),
                User.marketing_unsubscribed_at.is_not(None),
            )
        )
    )
    opted_out_users_set = {normalize_email(row[0]) for row in opted_out_res.all() if row[0]}

    # 3. Existing recipients for this campaign
    existing_recipients_res = await db.execute(
        select(EmailRecipient).where(EmailRecipient.campaign_id == campaign_id)
    )
    existing_map = {
        normalize_email(r.email): r for r in existing_recipients_res.scalars().all()
    }

    candidates: List[Tuple[str, str, Optional[int], str]] = []

    # A. Add Manual recipients if mode is MANUAL or COMBINED
    if mode in ("MANUAL", "COMBINED") and manual_recipients:
        for item in manual_recipients:
            if isinstance(item, str):
                raw_email = item
                raw_name = ""
            elif isinstance(item, dict):
                raw_email = item.get("email", "")
                raw_name = item.get("name") or item.get("full_name") or ""
            elif hasattr(item, "email"):
                raw_email = getattr(item, "email", "")
                raw_name = getattr(item, "name", "") or getattr(item, "full_name", "") or ""
            else:
                raw_email = str(item)
                raw_name = ""

            clean_email = normalize_email(raw_email)
            if not clean_email or not is_valid_email(clean_email):
                continue
            if clean_email in unsubscribed_set or clean_email in opted_out_users_set:
                continue

            candidates.append((clean_email, raw_name.strip() or "Khách Hàng", None, "MANUAL"))

    # B. Add Database recipients if mode is DATABASE or COMBINED
    if mode in ("DATABASE", "COMBINED"):
        if campaign.target_audience == "EVENT_REGISTERED" and campaign.event_id:
            reg_stmt = (
                select(Registration, User)
                .join(User, Registration.participant_id == User.id, isouter=True)
                .where(Registration.event_id == campaign.event_id)
            )
            res = await db.execute(reg_stmt)
            for reg, usr in res.all():
                if not usr or not usr.is_marketing_subscribed or not usr.marketing_consent_at:
                    continue
                email_val = normalize_email(reg.email or usr.email or "")
                name_val = reg.full_name or usr.full_name or "Khách Tham Dự"
                if email_val in unsubscribed_set or email_val in opted_out_users_set:
                    continue
                candidates.append((email_val, name_val, usr.id, "DATABASE"))
        else:
            user_stmt = select(User).where(
                User.is_active.is_(True),
                User.is_marketing_subscribed.is_(True),
                User.marketing_consent_at.is_not(None),
            )
            res = await db.execute(user_stmt)
            for usr in res.scalars().all():
                email_val = normalize_email(usr.email)
                if email_val in unsubscribed_set:
                    continue
                candidates.append((email_val, usr.full_name or "Khách Hàng", usr.id, "DATABASE"))

    new_recipients: List[EmailRecipient] = []
    seen = set()

    for email_clean, name_raw, u_id, source in candidates:
        if email_clean in seen:
            continue
        seen.add(email_clean)

        if email_clean in existing_map:
            exist = existing_map[email_clean]
            if exist.status in (RecipientStatusEnum.SENT.value, RecipientStatusEnum.DELIVERED.value):
                continue
            exist.status = RecipientStatusEnum.PENDING.value
            exist.queued_at = datetime.now(timezone.utc)
            exist.source = source
        else:
            token = secrets.token_urlsafe(32)
            recipient = EmailRecipient(
                campaign_id=campaign_id,
                user_id=u_id,
                email=email_clean,
                full_name=name_raw,
                source=source,
                status=RecipientStatusEnum.PENDING.value,
                queued_at=datetime.now(timezone.utc),
                unsubscribe_token=token,
            )
            new_recipients.append(recipient)

    if new_recipients:
        db.add_all(new_recipients)
        await db.commit()

    count_stmt = select(func.count(EmailRecipient.id)).where(EmailRecipient.campaign_id == campaign_id)
    total_count = (await db.execute(count_stmt)).scalar() or 0
    campaign.total_recipients = total_count
    await db.commit()

    return total_count


async def recover_interrupted_campaigns():
    """
    Recovers campaigns and recipients left in an intermediate state (e.g. SENDING)
    after a server crash or worker restart.
    """
    logger.info("Scanning for interrupted email campaigns to recover...")
    async with AsyncSessionLocal() as db:
        try:
            # Find campaigns stuck in SENDING
            stuck_stmt = select(EmailCampaign).where(
                EmailCampaign.status == CampaignStatusEnum.SENDING.value
            )
            res = await db.execute(stuck_stmt)
            stuck_campaigns = res.scalars().all()

            for camp in stuck_campaigns:
                logger.warning(
                    f"Recovering interrupted campaign #{camp.id} ('{camp.campaign_name}')..."
                )
                # Reset any recipients stuck in SENDING back to QUEUED
                reset_stmt = select(EmailRecipient).where(
                    EmailRecipient.campaign_id == camp.id,
                    EmailRecipient.status == RecipientStatusEnum.SENDING.value,
                )
                recip_res = await db.execute(reset_stmt)
                for r in recip_res.scalars().all():
                    r.status = RecipientStatusEnum.QUEUED.value

                await db.commit()
                # Relaunch delivery in background
                asyncio.create_task(send_campaign_in_background(camp.id))
        except Exception as e:
            logger.error(f"Error during campaign worker crash recovery: {e}", exc_info=True)


async def send_campaign_in_background(campaign_id: int):
    """
    Core recoverable background task that dispatches a campaign's pending recipients.
    Features:
    - Atomically claims the campaign
    - Rechecks consent and suppression status immediately before each dispatch
    - Uses Resend idempotency keys
    - Implements exponential backoff on transient errors
    - Never retries permanent invalid address errors
    - Checks for mid-send campaign cancellation
    - Updates partial failure states
    """
    logger.info(f"Initiating delivery workflow for Campaign #{campaign_id}...")

    async with AsyncSessionLocal() as db:
        try:
            # 1. Atomic claim using database row locking (prevents concurrent workers)
            claim_stmt = (
                select(EmailCampaign)
                .where(
                    EmailCampaign.id == campaign_id,
                    EmailCampaign.status.in_([
                        CampaignStatusEnum.APPROVED.value,
                        CampaignStatusEnum.SCHEDULED.value,
                        CampaignStatusEnum.SENDING.value,
                    ]),
                )
                .with_for_update(skip_locked=True)
            )
            res = await db.execute(claim_stmt)
            campaign = res.scalar_one_or_none()

            if not campaign:
                logger.warning(
                    f"Campaign #{campaign_id} could not be locked or is already being processed by another worker."
                )
                return

            if campaign.status == CampaignStatusEnum.CANCELLED.value:
                logger.info(f"Campaign #{campaign_id} was cancelled before sending began.")
                return

            campaign.status = CampaignStatusEnum.SENDING.value
            if not campaign.sending_started_at:
                campaign.sending_started_at = datetime.now(timezone.utc)
            await db.commit()

            # 2. Ensure recipients are prepared
            await prepare_campaign_recipients(campaign_id, db)

            # 3. Retrieve verified event details from database
            event_obj: Optional[Event] = None
            if campaign.event_id:
                event_obj = await db.get(Event, campaign.event_id)

            event_title = event_obj.title if event_obj else campaign.campaign_name
            event_time = f"{event_obj.start_date or ''} - {event_obj.end_date or ''}" if event_obj else "15-16 Oct 2026"
            event_location = event_obj.location_address or event_obj.location if event_obj else "Hội trường EventHub AI"
            event_cat = event_obj.category.name if (event_obj and event_obj.category) else "Công nghệ & Sự kiện"
            cover_img = event_obj.cover_image if event_obj else None

            # 4. Fetch pending or due retrying recipients
            now_utc = datetime.now(timezone.utc)
            stmt = select(EmailRecipient).where(
                EmailRecipient.campaign_id == campaign_id,
                or_(
                    EmailRecipient.status.in_([
                        RecipientStatusEnum.PENDING.value,
                        RecipientStatusEnum.QUEUED.value,
                    ]),
                    and_(
                        EmailRecipient.status == RecipientStatusEnum.RETRYING.value,
                        or_(
                            EmailRecipient.next_retry_at.is_(None),
                            EmailRecipient.next_retry_at <= now_utc,
                        ),
                    ),
                ),
            )
            res = await db.execute(stmt)
            recipients_to_send = res.scalars().all()

            logger.info(f"Campaign #{campaign_id}: {len(recipients_to_send)} recipient(s) ready for delivery.")

            processed_count = 0
            for recipient in recipients_to_send:
                # 5. Check if campaign was cancelled during batch delivery
                await db.refresh(campaign)
                if campaign.status == CampaignStatusEnum.CANCELLED.value:
                    logger.warning(f"Campaign #{campaign_id} was cancelled mid-send. Aborting remaining dispatches.")
                    break

                # 6. CRITICAL: Recheck consent and suppression status immediately before each delivery
                email_clean = recipient.email.strip().lower()
                unsub_exist = (
                    await db.execute(
                        select(EmailUnsubscribe).where(EmailUnsubscribe.email == email_clean)
                    )
                ).scalar_one_or_none()

                if unsub_exist:
                    logger.info(f"Recipient {email_clean} opted out before delivery. Skipping.")
                    recipient.status = RecipientStatusEnum.SKIPPED.value
                    recipient.error_message = "Recipient unsubscribed prior to delivery"
                    await db.commit()
                    continue

                if recipient.user_id:
                    user_record = await db.get(User, recipient.user_id)
                    if not user_record or not user_record.is_marketing_subscribed or not user_record.marketing_consent_at:
                        logger.info(f"Recipient {email_clean} lacks active marketing consent. Skipping.")
                        recipient.status = RecipientStatusEnum.SKIPPED.value
                        recipient.error_message = "Missing verifiable marketing consent"
                        await db.commit()
                        continue
                else:
                    # Manual recipient without user_id: verify against user account opt-outs
                    user_opted_out = (
                        await db.execute(
                            select(User).where(
                                func.lower(User.email) == email_clean,
                                or_(
                                    User.is_marketing_subscribed.is_(False),
                                    User.marketing_unsubscribed_at.is_not(None),
                                ),
                            )
                        )
                    ).scalar_one_or_none()
                    if user_opted_out:
                        logger.info(f"Manual recipient {email_clean} has an account that opted out of marketing. Skipping.")
                        recipient.status = RecipientStatusEnum.SKIPPED.value
                        recipient.error_message = "User has not consented to marketing"
                        await db.commit()
                        continue

                # 7. Generate RFC 8058 One-Click Unsubscribe URL and Idempotency Key
                base_url = settings.FRONTEND_URL.rstrip("/")
                unsub_url = f"{base_url}/unsubscribe?token={recipient.unsubscribe_token}" if recipient.unsubscribe_token else None
                idemp_key = f"eh_camp_{campaign_id}_rec_{recipient.id}_att_{recipient.attempt_count + 1}"
                recipient.idempotency_key = idemp_key
                recipient.status = RecipientStatusEnum.SENDING.value
                recipient.attempt_count += 1
                await db.commit()

                # 8. Issue or retrieve official event registration ticket in PostgreSQL
                from app.services.ticket_service import get_or_create_registration_ticket
                reg_ticket = await get_or_create_registration_ticket(
                    db=db,
                    email=recipient.email,
                    event_id=campaign.event_id,
                    event_title=event_title,
                    full_name=recipient.full_name,
                    ticket_type="Vé VIP Tham Dự",
                )

                # 9. Render responsive HTML & Plain-text alternative with QR ticket pass
                body_content = campaign.ai_email_body or campaign.plain_text_content or "Trân trọng kính mời quý khách tham dự sự kiện của EventHub AI."
                personalized_html = render_campaign_html(
                    article_body=body_content,
                    subject=campaign.subject,
                    event_title=event_title,
                    recipient_name=recipient.full_name,
                    event_time=event_time,
                    event_location=event_location,
                    event_category=event_cat,
                    cover_image_url=cover_img,
                    cta_text=campaign.ai_email_cta or "Đăng Ký Tham Dự Ngay",
                    unsubscribe_url=unsub_url,
                    frontend_url=base_url,
                    qr_token=reg_ticket.qr_code_token,
                    ticket_type=reg_ticket.ticket_type,
                )
                plain_text_alt = generate_plain_text_alternative(
                    article_body=body_content,
                    subject=campaign.subject,
                    event_title=event_title,
                    recipient_name=recipient.full_name,
                    event_time=event_time,
                    event_location=event_location,
                    cta_url=f"{base_url}/events",
                    unsubscribe_url=unsub_url,
                    qr_token=reg_ticket.qr_code_token,
                    ticket_type=reg_ticket.ticket_type,
                )

                # 10. Send via Resend service with idempotency key
                result = await resend_email_service.send_single_email(
                    to_email=recipient.email,
                    subject=campaign.subject,
                    html_content=personalized_html,
                    plain_text=plain_text_alt,
                    unsubscribe_url=unsub_url,
                    idempotency_key=idemp_key,
                    tags=[
                        {"name": "campaign_id", "value": str(campaign_id)},
                        {"name": "recipient_id", "value": str(recipient.id)},
                    ],
                )

                if result.get("success"):
                    recipient.status = RecipientStatusEnum.SENT.value
                    recipient.provider_message_id = result.get("message_id")
                    recipient.sent_at = datetime.now(timezone.utc)
                    recipient.error_message = None
                    recipient.error_code = None
                    campaign.sent_count += 1
                else:
                    err_msg = result.get("error")
                    err_code = result.get("error_code")
                    is_permanent = result.get("is_permanent_error", False)
                    recipient.error_message = err_msg
                    recipient.error_code = err_code

                    if is_permanent:
                        # Never retry permanent invalid address failures indefinitely
                        logger.warning(f"Permanent delivery failure for {recipient.email}: {err_msg}")
                        recipient.status = RecipientStatusEnum.FAILED.value
                        campaign.failed_count += 1
                    else:
                        # Temporary error: apply exponential backoff
                        recipient.retry_count += 1
                        if recipient.retry_count >= 3:
                            recipient.status = RecipientStatusEnum.FAILED.value
                            campaign.failed_count += 1
                        else:
                            recipient.status = RecipientStatusEnum.RETRYING.value
                            backoff_seconds = (2 ** recipient.retry_count) * 20
                            recipient.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=backoff_seconds)
                            logger.info(
                                f"Scheduled retry #{recipient.retry_count} for {recipient.email} in {backoff_seconds}s."
                            )

                processed_count += 1
                if processed_count % 5 == 0 or processed_count == len(recipients_to_send):
                    await db.commit()

                # 10. Configurable delivery pacing (default 2 reqs/sec -> 0.5s pause)
                pacing_delay = 1.0 / resend_email_service.rate_limit_per_second
                await asyncio.sleep(pacing_delay)

            # 11. Finalize campaign status
            await db.refresh(campaign)
            if campaign.status != CampaignStatusEnum.CANCELLED.value:
                campaign.sending_completed_at = datetime.now(timezone.utc)
                if campaign.sent_count > 0 and campaign.failed_count > 0:
                    campaign.status = CampaignStatusEnum.PARTIALLY_FAILED.value
                elif campaign.sent_count > 0 and campaign.failed_count == 0:
                    campaign.status = CampaignStatusEnum.COMPLETED.value
                elif campaign.failed_count > 0 and campaign.sent_count == 0:
                    campaign.status = CampaignStatusEnum.FAILED.value
                else:
                    campaign.status = CampaignStatusEnum.COMPLETED.value
                await db.commit()

            logger.info(
                f"Campaign #{campaign_id} delivery finished. Status: {campaign.status}. Sent: {campaign.sent_count}, Failed: {campaign.failed_count}"
            )
        except Exception as e:
            logger.error(f"Fatal error in campaign delivery worker for #{campaign_id}: {e}", exc_info=True)
            try:
                campaign = await db.get(EmailCampaign, campaign_id)
                if campaign and campaign.status != CampaignStatusEnum.CANCELLED.value:
                    campaign.status = CampaignStatusEnum.FAILED.value
                    await db.commit()
            except Exception:
                pass
