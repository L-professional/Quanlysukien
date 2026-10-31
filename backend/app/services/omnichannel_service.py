import asyncio
import logging
from typing import List, Dict, Any, Optional

from app.services.email_service import send_invitation_email
from app.services.sms_service import send_sms
from app.services.zalo_service import send_zalo_message

logger = logging.getLogger("eventhub.omnichannel")
logger.setLevel(logging.INFO)


async def dispatch_omnichannel_message(
    channels: List[str],
    email: Optional[str] = None,
    phone: Optional[str] = None,
    subject: Optional[str] = None,
    content: Optional[str] = None,
    event_title: Optional[str] = "EventHub AI Summit 2026",
    recipient_name: Optional[str] = "Quý Khách",
    event_url: Optional[str] = "https://eventhub.ai/events",
    campaign_type: Optional[str] = "PROMOTION",
    event_id: Optional[int] = None,
    user_id: Optional[int] = None,
    speakers: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ultra-fast concurrent omnichannel dispatch across Email, SMS, and Zalo.
    Uses asyncio.gather() to achieve sub-second delivery to user devices.
    """
    clean_channels = [c.lower() for c in channels]
    tasks = []
    task_names = []

    # Dynamic Personalization Tokens Replacement
    final_content = content
    final_subject = subject
    if final_content and isinstance(final_content, str):
        final_content = final_content.replace("{{recipient_name}}", recipient_name or "Quý Khách")
        final_content = final_content.replace("{{full_name}}", recipient_name or "Quý Khách")
        if event_title:
            final_content = final_content.replace("{{event_title}}", event_title)
    if final_subject and isinstance(final_subject, str):
        final_subject = final_subject.replace("{{recipient_name}}", recipient_name or "Quý Khách")
        final_subject = final_subject.replace("{{full_name}}", recipient_name or "Quý Khách")
        if event_title:
            final_subject = final_subject.replace("{{event_title}}", event_title)

    # 1. Email Task (Resend REST API / SMTP / Ethereal)
    if ("email" in clean_channels or "all" in clean_channels) and email:
        tasks.append(
            send_invitation_email(
                to_email=email,
                recipient_name=recipient_name or "Quý Khách",
                event_title=event_title or "EventHub AI Summit 2026",
                subject=final_subject or f"🎟️ [EventHub AI] Thư Mời Tham Dự: {event_title}",
                custom_message=final_content,
                event_url=event_url or "https://eventhub.ai/events",
                campaign_type=campaign_type,
                event_id=event_id,
                user_id=user_id,
                speakers=speakers,
            )
        )
        task_names.append("email")

    # 2. SMS Task (eSMS / SpeedSMS / Twilio)
    if ("sms" in clean_channels or "all" in clean_channels) and phone:
        tasks.append(
            send_sms(
                to_phone=phone,
                message=content or f"BTC {event_title} thông báo: Quý khách vui lòng kiểm tra vé tại app EventHub AI.",
            )
        )
        task_names.append("sms")

    # 3. Zalo Task (Zalo ZNS / OA)
    if ("zalo" in clean_channels or "zalo_oa" in clean_channels or "all" in clean_channels) and phone:
        tasks.append(
            send_zalo_message(
                to_phone=phone,
                message=content or f"Ban Tổ Chức {event_title} trân trọng gửi thông báo mới tới Quý khách.",
                event_title=event_title,
                cta_url=event_url,
                customer_name=recipient_name,
            )
        )
        task_names.append("zalo")

    # Execute all tasks concurrently in parallel
    results_list = await asyncio.gather(*tasks, return_exceptions=True)

    results_map = {}
    for name, res in zip(task_names, results_list):
        if isinstance(res, Exception):
            logger.error(f"[Omnichannel] Error dispatching to {name}: {res}")
            results_map[name] = {"success": False, "error": str(res)}
        else:
            results_map[name] = res

    logger.info(f"[Omnichannel] Concurrently dispatched to {len(tasks)} channels: {task_names}")
    return results_map


async def broadcast_campaign(
    channels: List[str],
    recipients: List[Dict[str, str]],
    subject: Optional[str] = None,
    content: Optional[str] = None,
    event_title: Optional[str] = "EventHub AI Summit 2026",
    event_url: Optional[str] = "https://eventhub.ai/events",
    max_concurrency: int = 15,
    campaign_type: Optional[str] = "PROMOTION",
    event_id: Optional[int] = None,
    speakers: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Broadcasts campaign message to multiple recipients concurrently using asyncio.Semaphore.
    Ensures rapid parallel dispatch across Email, SMS, and Zalo.
    """
    if not recipients:
        return {"total": 0, "success": 0}

    semaphore = asyncio.Semaphore(max_concurrency)

    async def _send_one(recipient: Dict[str, str]):
        rec_name = recipient.get("name") or "Quý Khách"
        rec_company = recipient.get("company") or "Quý Đơn vị"
        rec_ticket = recipient.get("ticket_code") or "VIP-EVT-2026-999"
        rec_date = recipient.get("event_date") or ""

        # Personalized message content
        item_content = content or ""
        if item_content and isinstance(item_content, str):
            item_content = item_content.replace("{{recipient_name}}", rec_name)
            item_content = item_content.replace("{{full_name}}", rec_name)
            item_content = item_content.replace("{{company}}", rec_company)
            item_content = item_content.replace("{{ticket_code}}", rec_ticket)
            if rec_date:
                item_content = item_content.replace("{{event_date}}", rec_date)
            if event_title:
                item_content = item_content.replace("{{event_title}}", event_title)

        item_subject = subject or ""
        if item_subject and isinstance(item_subject, str):
            item_subject = item_subject.replace("{{recipient_name}}", rec_name)
            item_subject = item_subject.replace("{{full_name}}", rec_name)
            if event_title:
                item_subject = item_subject.replace("{{event_title}}", event_title)

        async with semaphore:
            return await dispatch_omnichannel_message(
                channels=channels,
                email=recipient.get("email"),
                phone=recipient.get("phone"),
                subject=item_subject,
                content=item_content,
                event_title=event_title,
                recipient_name=rec_name,
                event_url=event_url,
                campaign_type=campaign_type,
                event_id=event_id,
                user_id=recipient.get("user_id"),
                speakers=speakers,
            )

    results = await asyncio.gather(*[_send_one(r) for r in recipients], return_exceptions=True)
    success_count = sum(1 for r in results if not isinstance(r, Exception))
    logger.info(f"[Omnichannel] Broadcast completed for {success_count}/{len(recipients)} recipients.")
    return {
        "total": len(recipients),
        "success": success_count,
    }

