"""
Resend Webhooks Endpoint
Validates incoming Svix signatures, stores raw events for idempotent processing,
and updates recipient delivery logs and campaign statistics.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, Header, HTTPException, status, Depends
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from svix.webhooks import Webhook, WebhookVerificationError
except ImportError:
    Webhook = None
    WebhookVerificationError = Exception

from app.core.config import settings
from app.core.database import get_db
from app.models.email_campaign import (
    EmailCampaign,
    EmailRecipient,
    EmailWebhookEvent,
    EmailUnsubscribe,
    RecipientStatusEnum,
)

logger = logging.getLogger("eventhub.webhooks")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/resend")
async def resend_webhook_handler(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    """
    Handles real-time delivery events dispatched by Resend.
    Supported events:
    - email.sent
    - email.delivered
    - email.delivery_delayed
    - email.bounced
    - email.complained
    - email.opened
    - email.clicked
    """
    raw_body = await request.body()
    payload_str = raw_body.decode("utf-8")

    # 1. Signature Verification
    secret = settings.RESEND_WEBHOOK_SECRET
    if secret and secret.strip() and not secret.startswith("whsec_your_"):
        if not svix_id or not svix_timestamp or not svix_signature:
            logger.warning("Rejecting Resend webhook: Missing Svix signature headers.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing webhook signature headers",
            )
        if Webhook:
            try:
                wh = Webhook(secret.strip())
                headers = {
                    "svix-id": svix_id,
                    "svix-timestamp": svix_timestamp,
                    "svix-signature": svix_signature,
                }
                wh.verify(payload_str, headers)
            except WebhookVerificationError as e:
                logger.warning(f"Rejecting Resend webhook: Invalid signature ({e})")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid webhook signature",
                )
        else:
            logger.warning("svix package not installed; signature verification skipped.")
    else:
        logger.debug("RESEND_WEBHOOK_SECRET not set; accepting callback in dev mode.")

    # 2. Parse JSON payload
    try:
        data = json.loads(payload_str)
    except Exception as e:
        logger.error(f"Malformed JSON payload in Resend webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON body",
        )

    event_type = data.get("type")
    event_data = data.get("data", {})
    provider_event_id = svix_id or data.get("id") or f"evt_{datetime.now(timezone.utc).timestamp()}"
    provider_message_id = event_data.get("email_id") or event_data.get("id")

    # 3. Idempotency Check
    existing_event = (
        await db.execute(
            select(EmailWebhookEvent).where(EmailWebhookEvent.provider_event_id == str(provider_event_id))
        )
    ).scalar_one_or_none()

    if existing_event:
        logger.info(f"Duplicate webhook event #{provider_event_id} already processed. Skipping.")
        return {"status": "ok", "message": "Event already processed"}

    # Record event in DB
    webhook_record = EmailWebhookEvent(
        provider_event_id=str(provider_event_id),
        provider_message_id=str(provider_message_id) if provider_message_id else None,
        event_type=str(event_type or "unknown"),
        payload=payload_str,
        processed=False,
        received_at=datetime.now(timezone.utc),
    )
    db.add(webhook_record)
    await db.flush()

    # 4. Find recipient record
    recipient: Optional[EmailRecipient] = None
    if provider_message_id:
        recipient = (
            await db.execute(
                select(EmailRecipient).where(EmailRecipient.provider_message_id == str(provider_message_id))
            )
        ).scalar_one_or_none()

    # Fallback to recipient_id tag if present
    if not recipient and isinstance(event_data.get("tags"), list):
        for tag in event_data["tags"]:
            if isinstance(tag, dict) and tag.get("name") == "recipient_id":
                try:
                    r_id = int(tag.get("value"))
                    recipient = await db.get(EmailRecipient, r_id)
                    break
                except Exception:
                    pass

    now_utc = datetime.now(timezone.utc)

    # 5. Process event according to type
    if recipient:
        campaign = await db.get(EmailCampaign, recipient.campaign_id)

        if event_type == "email.sent":
            recipient.status = RecipientStatusEnum.SENT.value
            if not recipient.sent_at:
                recipient.sent_at = now_utc

        elif event_type == "email.delivered":
            recipient.status = RecipientStatusEnum.DELIVERED.value
            if not recipient.delivered_at:
                recipient.delivered_at = now_utc
                if campaign:
                    campaign.delivered_count += 1

        elif event_type == "email.bounced":
            recipient.status = RecipientStatusEnum.BOUNCED.value
            recipient.bounced_at = now_utc
            if campaign:
                campaign.bounced_count += 1

            bounce_type_raw = str(event_data.get("bounce_type") or "hard").lower()
            supp_type = "HARD_BOUNCE" if "hard" in bounce_type_raw else "SOFT_BOUNCE"

            unsub_exist = (
                await db.execute(
                    select(EmailUnsubscribe).where(EmailUnsubscribe.email == recipient.email)
                )
            ).scalar_one_or_none()
            if not unsub_exist:
                db.add(
                    EmailUnsubscribe(
                        email=recipient.email,
                        user_id=recipient.user_id,
                        campaign_id=recipient.campaign_id,
                        recipient_id=recipient.id,
                        suppression_type=supp_type,
                        reason=f"Automated {supp_type} suppression via Resend webhook",
                    )
                )
            if recipient.user_id:
                usr = await db.get(User, recipient.user_id)
                if usr:
                    usr.is_marketing_subscribed = False
                    usr.marketing_unsubscribed_at = now_utc

        elif event_type == "email.complained":
            recipient.status = RecipientStatusEnum.COMPLAINED.value
            recipient.complained_at = now_utc
            unsub_exist = (
                await db.execute(
                    select(EmailUnsubscribe).where(EmailUnsubscribe.email == recipient.email)
                )
            ).scalar_one_or_none()
            if not unsub_exist:
                db.add(
                    EmailUnsubscribe(
                        email=recipient.email,
                        user_id=recipient.user_id,
                        campaign_id=recipient.campaign_id,
                        recipient_id=recipient.id,
                        suppression_type="COMPLAINT",
                        reason="Spam complaint recorded via Resend webhook",
                    )
                )
            if recipient.user_id:
                usr = await db.get(User, recipient.user_id)
                if usr:
                    usr.is_marketing_subscribed = False
                    usr.marketing_unsubscribed_at = now_utc

        elif event_type == "email.opened":
            if not recipient.opened_at:
                recipient.opened_at = now_utc
                if campaign:
                    campaign.opened_count += 1

        elif event_type == "email.clicked":
            if not recipient.clicked_at:
                recipient.clicked_at = now_utc
                if campaign:
                    campaign.clicked_count += 1

    webhook_record.processed = True
    await db.commit()
    logger.info(f"Processed Resend webhook '{event_type}' for provider message '{provider_message_id}'.")

    return {"status": "ok", "event_id": provider_event_id}
