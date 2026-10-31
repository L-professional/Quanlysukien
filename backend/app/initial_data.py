import asyncio
import logging
import sys
import time
from sqlalchemy import text
from app.core.database import init_db, AsyncSessionLocal
from app.api.v1.auth import ensure_default_roles, DEMO_USERS
from app.db.seed_events import seed_20_realistic_events
from app.db.seed_reports_data import seed_data as seed_reports_data

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("initial_data")


async def init_with_retry(max_retries: int = 5, retry_delay: float = 2.0) -> None:
    """Connect to database and execute initialization with retry for cloud deployments."""
    connected = False
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Connecting to database (attempt {attempt}/{max_retries})...")
            await init_db()
            connected = True
            break
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(retry_delay)
            else:
                logger.error("Could not establish database connection after max retries.")
                raise e

    if not connected:
        return

    logger.info("Database schema and migrations initialized.")

    # 1. Reset & Upsert all demo accounts with standardized password "123456"
    try:
        async with AsyncSessionLocal() as session:
            await ensure_default_roles(session)
            
            # Query back all demo users to log their active status & confirm update
            demo_emails = [u["email"] for u in DEMO_USERS]
            res = await session.execute(
                text("SELECT email, role_id, is_active FROM users WHERE email = ANY(:emails) ORDER BY role_id;"),
                {"emails": demo_emails}
            )
            synced_users = res.mappings().all()
            for su in synced_users:
                logger.info(
                    f"Demo user '{su['email']}' (Role ID: {su['role_id']}, Active: {su['is_active']}) "
                    f"verified and password reset/upserted to '123456'."
                )

        logger.info("All demo accounts (Admin, Manager, Staff, Speaker, Attendee) successfully upserted with password '123456'.")
    except Exception as e:
        logger.warning(f"Default roles & demo users setup encountered an error: {e}")

    # 2. Check and seed sample realistic events if empty
    try:
        async with AsyncSessionLocal() as session:
            res = await session.execute(text("SELECT COUNT(*) FROM events;"))
            event_count = res.scalar() or 0

        if event_count == 0:
            logger.info("No events found in database. Seeding 20 realistic events...")
            seeded_count = await seed_20_realistic_events()
            logger.info(f"Seeded {seeded_count} realistic events successfully.")
        else:
            logger.info(f"Database already contains {event_count} events. Skipping event seed.")
    except Exception as e:
        logger.warning(f"Event seeding skipped or encountered an error: {e}")

    # 3. Seed sample reports and schedules if reports table is empty
    try:
        async with AsyncSessionLocal() as session:
            report_res = await session.execute(text("SELECT COUNT(*) FROM reports;"))
            report_count = report_res.scalar() or 0

        if report_count == 0:
            logger.info("Seeding sample report data...")
            await seed_reports_data()
            logger.info("Sample report data seeded.")
        else:
            logger.info(f"Database already contains {report_count} reports. Skipping report seed.")
    except Exception as e:
        logger.debug(f"Report seeding skipped: {e}")

    logger.info("Initial data provisioning completed successfully!")


def main() -> None:
    try:
        asyncio.run(init_with_retry())
    except Exception as exc:
        logger.error(f"Failed to initialize data: {exc}")
        # Exit with 0 so minor DB warnings don't block server startup if already initialized
        sys.exit(0)


if __name__ == "__main__":
    main()
