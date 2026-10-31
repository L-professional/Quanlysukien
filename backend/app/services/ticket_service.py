"""
Ticket & Registration Service for EventHub AI
Provides:
- get_or_create_registration_ticket: Automatically creates or retrieves a valid Registration ticket
  in the database with a unique QR code token for any recipient email and event.
"""
import secrets
import logging
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.event import Event
from app.models.user import User
from app.models.role import Role
from app.models.registration import Registration
from app.core.security import get_password_hash

logger = logging.getLogger("eventhub.ticket_service")
logger.setLevel(logging.INFO)


async def get_or_create_registration_ticket(
    email: str,
    db: Optional[AsyncSession] = None,
    event_id: Optional[int] = None,
    event_title: Optional[str] = None,
    full_name: Optional[str] = None,
    ticket_type: Optional[str] = "Vé VIP All-Access",
    force_fresh: bool = False,
) -> Registration:
    """
    Get an existing valid Registration or create a new one in the PostgreSQL database.
    Guarantees that the returned Registration has a scannable qr_code_token and is_checked_in=False,
    so it can be 100% verified at the /check-in scanner gate.
    """
    if not email or not email.strip():
        raise ValueError("Email recipient is required to issue a ticket.")

    clean_email = email.strip().lower()
    owns_session = False
    session = db

    if session is None:
        session = AsyncSessionLocal()
        owns_session = True

    try:
        # 1. Resolve target Event
        target_event: Optional[Event] = None
        if event_id:
            target_event = await session.get(Event, event_id)

        if not target_event and event_title and event_title.strip():
            clean_title = event_title.strip()
            # Clean title prefixes like "[AI PR] " or "Thư Mời Tham Dự: "
            for prefix in ["[AI PR] ", "Thư Mời Tham Dự: ", "Thư mời: "]:
                if clean_title.startswith(prefix):
                    clean_title = clean_title[len(prefix):].strip()
            
            ev_stmt = select(Event).where(Event.title.ilike(f"%{clean_title[:30]}%")).limit(1)
            target_event = (await session.execute(ev_stmt)).scalar_one_or_none()

        if not target_event:
            # Fallback to the first active event in database
            first_ev_stmt = select(Event).order_by(Event.id.asc()).limit(1)
            target_event = (await session.execute(first_ev_stmt)).scalar_one_or_none()

        if not target_event:
            # Create a default system event if database has no events
            target_event = Event(
                title=event_title or "Hội thảo EventHub AI Summit 2026",
                description="Hội thảo Công nghệ và Điều phối Sự kiện Thông minh EventHub AI",
                location="Trung tâm Hội nghị Quốc Gia, Hà Nội",
                location_address="Đại lộ Thăng Long, Mễ Trì, Nam Từ Liêm, Hà Nội",
                start_date="2026-10-15 08:30:00",
                end_date="2026-10-16 17:30:00",
                status="PUBLISHED",
            )
            session.add(target_event)
            await session.flush()
            logger.info(f"Created fallback system event ID #{target_event.id}")

        resolved_event_id = target_event.id

        # 2. Resolve or create User (PARTICIPANT / role_id=4)
        user_stmt = select(User).where(User.email.ilike(clean_email)).limit(1)
        user = (await session.execute(user_stmt)).scalar_one_or_none()

        display_name = full_name.strip() if full_name and full_name.strip() else clean_email.split("@")[0].title()

        if not user:
            # Create lightweight participant user
            random_pw = secrets.token_urlsafe(16)
            user = User(
                email=clean_email,
                full_name=display_name,
                role_id=4,  # PARTICIPANT role
                is_active=True,
                hashed_password=get_password_hash(random_pw),
            )
            session.add(user)
            await session.flush()
            logger.info(f"Created attendee user #{user.id} for {clean_email}")

        # 3. Lookup existing registration for (resolved_event_id, user.id or email)
        reg_stmt = (
            select(Registration)
            .where(
                Registration.event_id == resolved_event_id,
                or_(
                    Registration.participant_id == user.id,
                    Registration.email.ilike(clean_email),
                ),
            )
            .limit(1)
        )
        registration = (await session.execute(reg_stmt)).scalar_one_or_none()

        token_prefix = f"QR-EVT{resolved_event_id}-TKT-{secrets.token_hex(4).upper()}"

        if registration:
            # If already checked in or force_fresh requested, reset status so QR can be scanned again
            if registration.is_checked_in or force_fresh:
                registration.is_checked_in = False
                registration.checked_in_at = None
                registration.checked_in_by = None
                # Generate fresh token
                registration.qr_code_token = token_prefix
                registration.qr_code = token_prefix
                registration.ticket_type = ticket_type or registration.ticket_type or "Vé VIP All-Access"
                registration.full_name = display_name or registration.full_name
                registration.email = clean_email
                await session.commit()
                await session.refresh(registration)
                logger.info(f"Refreshed ticket for {clean_email} -> token: {registration.qr_code_token}")
                return registration
            else:
                # Registration is already valid and ready to scan
                if not registration.qr_code_token:
                    registration.qr_code_token = token_prefix
                    registration.qr_code = token_prefix
                    await session.commit()
                    await session.refresh(registration)
                return registration

        # 4. Create new Registration record
        new_reg = Registration(
            event_id=resolved_event_id,
            participant_id=user.id,
            email=clean_email,
            full_name=display_name,
            qr_code_token=token_prefix,
            qr_code=token_prefix,
            ticket_type=ticket_type or "Vé VIP All-Access",
            price=0,
            is_checked_in=False,
            checked_in_at=None,
            checked_in_by=None,
        )
        session.add(new_reg)
        await session.commit()
        await session.refresh(new_reg)
        logger.info(f"Created new valid Registration #{new_reg.id} for {clean_email} -> token: {new_reg.qr_code_token}")
        return new_reg

    except Exception as e:
        logger.error(f"Error in get_or_create_registration_ticket: {e}", exc_info=True)
        if owns_session:
            await session.rollback()
        raise e
    finally:
        if owns_session:
            await session.close()
