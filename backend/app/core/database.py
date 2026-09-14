from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Create Async SQLAlchemy Engine with NullPool to prevent event loop connection reuse issues on Windows
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    poolclass=NullPool,
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
        # Enable pgvector extension for PostgreSQL
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # Create all tables registered with Base metadata
        await conn.run_sync(Base.metadata.create_all)
        # Ensure schema migrations for newly added columns
        migrations = [
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 500;",
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0;",
            "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 100;",
            "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0;",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES event_schedules(id) ON DELETE CASCADE;",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS organization VARCHAR(255);",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);",
            "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes VARCHAR(1000);",
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
        ]
        for migration in migrations:
            await conn.execute(text(migration))
