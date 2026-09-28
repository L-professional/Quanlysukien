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
) -> Dict[str, Any]:
    """
    Ultra-fast concurrent omnichannel dispatch across Email, SMS, and Zalo.
    Uses asyncio.gather() to achieve sub-second delivery to user devices.
    """
    clean_channels = [c.lower() for c in channels]
    tasks = []
    task_names = []

    # 1. Email Task (Resend REST API / SMTP / Ethereal)
    if ("email" in clean_channels or "all" in clean_channels) and email:
        tasks.append(
            send_invitation_email(
                to_email=email,
                recipient_name=recipient_name or "Quý Khách",
                event_title=event_title or "EventHub AI Summit 2026",
                subject=subject or f"🎟️ [EventHub AI] Thư Mời Tham Dự: {event_title}",
                custom_message=content,
                event_url=event_url or "https://eventhub.ai/events",
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
) -> Dict[str, Any]:
    """
    Broadcasts campaign message to multiple recipients concurrently using asyncio.Semaphore.
    Ensures rapid parallel dispatch across Email, SMS, and Zalo.
    """
    if not recipients:
        return {"total": 0, "success": 0}

    semaphore = asyncio.Semaphore(max_concurrency)

    async def _send_one(recipient: Dict[str, str]):
        async with semaphore:
            return await dispatch_omnichannel_message(
                channels=channels,
                email=recipient.get("email"),
                phone=recipient.get("phone"),
                subject=subject,
                content=content,
                event_title=event_title,
                recipient_name=recipient.get("name", "Quý Khách"),
                event_url=event_url,
            )

    results = await asyncio.gather(*[_send_one(r) for r in recipients], return_exceptions=True)
    success_count = sum(1 for r in results if not isinstance(r, Exception))
    logger.info(f"[Omnichannel] Broadcast completed for {success_count}/{len(recipients)} recipients.")
    return {
        "total": len(recipients),
        "success": success_count,
    }

