import logging
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create Async SQLAlchemy Engine with NullPool to prevent event loop connection reuse issues on Windows
# Force PostgreSQL session timezone to Asia/Ho_Chi_Minh (UTC+7)
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    poolclass=NullPool,
    connect_args={"server_settings": {"timezone": "Asia/Ho_Chi_Minh"}},
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database extensions and create tables."""
    async with engine.begin() as conn:
        # Enable pgvector extension for PostgreSQL if available
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        except Exception as e:
            logger.warning(f"Could not enable vector extension (may not be supported on this instance): {e}")
        # Create all tables registered with Base metadata
        await conn.run_sync(Base.metadata.create_all)
        # Ensure schema migrations for newly added columns
        migrations = [
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 500;",
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0;",
            "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 100;",
            "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0;",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES event_schedules(id) ON DELETE CASCADE;",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 500000;",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS organization VARCHAR(255);",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes VARCHAR(1000);",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_event_participant ON registrations (event_id, participant_id) WHERE schedule_id IS NULL AND session_id IS NULL;",
            """
            CREATE TABLE IF NOT EXISTS session_questions (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                asker_name VARCHAR(255) NOT NULL,
                asker_email VARCHAR(255),
                question TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                upvotes INTEGER NOT NULL DEFAULT 0,
                is_answered BOOLEAN NOT NULL DEFAULT FALSE,
                answer TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS session_materials (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                material_type VARCHAR(50) NOT NULL DEFAULT 'SLIDE',
                file_size VARCHAR(50) DEFAULT '5.0 MB',
                is_public_to_all BOOLEAN NOT NULL DEFAULT FALSE,
                download_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS session_feedbacks (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                participant_name VARCHAR(255) NOT NULL,
                rating INTEGER NOT NULL,
                content_quality INTEGER DEFAULT 5,
                speaker_rating INTEGER DEFAULT 5,
                comment TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE(MAX(id), 1)) FROM roles;
            """,
            """
            INSERT INTO roles (id, role_name) VALUES (5, 'SPEAKER') ON CONFLICT (role_name) DO NOTHING;
            """,
            """
            SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE(MAX(id), 5)) FROM roles;
            """,
            "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS speaker_id INTEGER REFERENCES users(id) ON DELETE SET NULL;",
            "ALTER TABLE session_questions ADD COLUMN IF NOT EXISTS question_text TEXT;",
            "UPDATE session_questions SET question_text = question WHERE question_text IS NULL AND question IS NOT NULL;",
            """
            CREATE TABLE IF NOT EXISTS session_resources (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                file_type VARCHAR(50) NOT NULL DEFAULT 'PDF',
                file_size VARCHAR(50) DEFAULT '5.0 MB',
                uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                session_id INTEGER REFERENCES event_schedules(id) ON DELETE SET NULL,
                rating INTEGER NOT NULL,
                comment TEXT,
                sentiment VARCHAR(50) DEFAULT 'positive',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_feedbacks_event_id ON feedbacks(event_id);",
            "CREATE INDEX IF NOT EXISTS ix_feedbacks_session_id ON feedbacks(session_id);",
            "CREATE INDEX IF NOT EXISTS ix_feedbacks_user_id ON feedbacks(user_id);",
            """
            CREATE TABLE IF NOT EXISTS user_reminders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_id INTEGER REFERENCES event_schedules(id) ON DELETE CASCADE,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                start_time TIMESTAMP WITH TIME ZONE,
                notified_24h BOOLEAN DEFAULT FALSE,
                notified_1h BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_user_reminders_user_id ON user_reminders(user_id);",
            "CREATE INDEX IF NOT EXISTS ix_user_reminders_session_id ON user_reminders(session_id);",
            "CREATE INDEX IF NOT EXISTS ix_user_reminders_event_id ON user_reminders(event_id);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{\"language\": \"vi\", \"theme\": \"dark\"}';",
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_token VARCHAR(255) NOT NULL,
                device_name VARCHAR(255) NOT NULL,
                browser VARCHAR(100),
                os VARCHAR(100),
                ip_address VARCHAR(50),
                location VARCHAR(100) DEFAULT 'Hà Nội, Việt Nam',
                is_current BOOLEAN DEFAULT FALSE,
                last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
            "CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions(user_id);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_marketing_subscribed BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP WITH TIME ZONE NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_source VARCHAR(100) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at TIMESTAMP WITH TIME ZONE NULL;",
            """
            CREATE TABLE IF NOT EXISTS email_campaigns (
                id SERIAL PRIMARY KEY,
                campaign_name VARCHAR(255) NOT NULL,
                subject VARCHAR(500) NOT NULL,
                html_content TEXT,
                plain_text_content TEXT,
                ai_email_body TEXT,
                ai_email_subject VARCHAR(500),
                ai_email_cta TEXT,
                ai_social_body TEXT,
                ai_sms_reminder TEXT,
                event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
                target_audience VARCHAR(100) DEFAULT 'ALL_SUBSCRIBED',
                send_immediately BOOLEAN NOT NULL DEFAULT TRUE,
                scheduled_at TIMESTAMP WITH TIME ZONE,
                sending_started_at TIMESTAMP WITH TIME ZONE,
                sending_completed_at TIMESTAMP WITH TIME ZONE,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMP WITH TIME ZONE,
                total_recipients INTEGER NOT NULL DEFAULT 0,
                sent_count INTEGER NOT NULL DEFAULT 0,
                delivered_count INTEGER NOT NULL DEFAULT 0,
                bounced_count INTEGER NOT NULL DEFAULT 0,
                failed_count INTEGER NOT NULL DEFAULT 0,
                opened_count INTEGER NOT NULL DEFAULT 0,
                clicked_count INTEGER NOT NULL DEFAULT 0,
                unsubscribed_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_email_campaigns_name ON email_campaigns(campaign_name);",
            "CREATE INDEX IF NOT EXISTS ix_email_campaigns_status ON email_campaigns(status);",
            "CREATE INDEX IF NOT EXISTS ix_email_campaigns_event ON email_campaigns(event_id);",
            """
            CREATE TABLE IF NOT EXISTS email_recipients (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                email VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                provider_message_id VARCHAR(255),
                error_message TEXT,
                error_code VARCHAR(100),
                retry_count INTEGER NOT NULL DEFAULT 0,
                attempt_count INTEGER NOT NULL DEFAULT 0,
                next_retry_at TIMESTAMP WITH TIME ZONE,
                idempotency_key VARCHAR(255) UNIQUE,
                queued_at TIMESTAMP WITH TIME ZONE,
                sent_at TIMESTAMP WITH TIME ZONE,
                delivered_at TIMESTAMP WITH TIME ZONE,
                opened_at TIMESTAMP WITH TIME ZONE,
                clicked_at TIMESTAMP WITH TIME ZONE,
                bounced_at TIMESTAMP WITH TIME ZONE,
                complained_at TIMESTAMP WITH TIME ZONE,
                unsubscribe_token VARCHAR(255) UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_campaign_email UNIQUE (campaign_id, email)
            );
            """,
            "ALTER TABLE email_recipients ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;",
            "ALTER TABLE email_recipients ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE NULL;",
            "ALTER TABLE email_recipients ADD COLUMN IF NOT EXISTS error_code VARCHAR(100) NULL;",
            "ALTER TABLE email_recipients ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) NULL;",
            "CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON email_recipients(campaign_id);",
            "CREATE INDEX IF NOT EXISTS idx_email_recipients_status ON email_recipients(status);",
            "CREATE INDEX IF NOT EXISTS idx_email_recipients_provider_msg ON email_recipients(provider_message_id);",
            "CREATE INDEX IF NOT EXISTS idx_email_recipients_unsub_token ON email_recipients(unsubscribe_token);",
            "CREATE INDEX IF NOT EXISTS idx_email_recipients_idemp_key ON email_recipients(idempotency_key);",
            """
            CREATE TABLE IF NOT EXISTS email_webhook_events (
                id SERIAL PRIMARY KEY,
                provider_event_id VARCHAR(255) NOT NULL UNIQUE,
                provider_message_id VARCHAR(255),
                event_type VARCHAR(100) NOT NULL,
                payload TEXT,
                processed BOOLEAN NOT NULL DEFAULT FALSE,
                received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_webhook_provider_msg ON email_webhook_events(provider_message_id);",
            """
            CREATE TABLE IF NOT EXISTS email_unsubscribes (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE SET NULL,
                recipient_id INTEGER REFERENCES email_recipients(id) ON DELETE SET NULL,
                suppression_type VARCHAR(50) NOT NULL DEFAULT 'USER_UNSUBSCRIBE',
                reason VARCHAR(500),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "ALTER TABLE email_unsubscribes ADD COLUMN IF NOT EXISTS suppression_type VARCHAR(50) NOT NULL DEFAULT 'USER_UNSUBSCRIBE';",
            "CREATE INDEX IF NOT EXISTS idx_unsubscribe_user ON email_unsubscribes(user_id);",
        ]
        for migration in migrations:
            try:
                async with conn.begin_nested():
                    await conn.execute(text(migration))
            except Exception as e:
                # Log and safely continue past duplicate index errors
                logger.debug(f"Migration statement skipped: {e}")


