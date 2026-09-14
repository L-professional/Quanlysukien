from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import init_db, get_db
# Import all models to ensure they are registered with Base.metadata before init_db
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB (enable pgvector extension and create all tables)
    try:
        await init_db()
        print("Database initialized successfully with pgvector extension.")
    except Exception as e:
        print(f"Warning: Database initialization failed at startup: {e}")

    # Safe column migration: add new RBAC and OAuth columns if they don't exist
    try:
        from app.core.database import engine
        async with engine.begin() as conn:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(100) DEFAULT 'Vé Tham Dự';"
            ))
            await conn.execute(text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date VARCHAR(50) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date VARCHAR(50) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS location_address VARCHAR(500) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS google_maps_url TEXT NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS start_date VARCHAR(50) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS location_address VARCHAR(500) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS google_maps_url TEXT NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 100;"
            ))
            await conn.execute(text(
                "ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0;"
            ))
            await conn.execute(text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 500;"
            ))
            await conn.execute(text(
                "ALTER TABLE events ADD COLUMN IF NOT EXISTS registered_count INTEGER NOT NULL DEFAULT 0;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS schedule_id INTEGER NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS session_id INTEGER NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS company VARCHAR(255) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS organization VARCHAR(255) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS job_title VARCHAR(255) NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes TEXT NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS qr_code TEXT NULL;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations DROP CONSTRAINT IF EXISTS uq_event_participant;"
            ))
            await conn.execute(text(
                "ALTER TABLE registrations DROP CONSTRAINT IF EXISTS uq_registrations_event_participant;"
            ))
            await conn.execute(text(
                "DROP INDEX IF EXISTS idx_registrations_event_participant;"
            ))
            await conn.execute(text(
                "DROP INDEX IF EXISTS uq_event_participant;"
            ))
            await conn.execute(text(
                "UPDATE registrations SET session_id = schedule_id WHERE session_id IS NULL AND schedule_id IS NOT NULL;"
            ))
            await conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_session_participant ON registrations (session_id, participant_id) WHERE session_id IS NOT NULL;"
            ))
            # Seed initial realistic capacity and registered_count for demo schedules if all registered_counts are 0
            await conn.execute(text("""
                UPDATE event_schedules SET capacity = 150, registered_count = 84 WHERE id = 1 AND registered_count = 0;
                UPDATE event_schedules SET capacity = 500, registered_count = 340 WHERE id = 2 AND registered_count = 0;
                UPDATE event_schedules SET capacity = 300, registered_count = 215 WHERE id = 3 AND registered_count = 0;
                UPDATE event_schedules SET capacity = 200, registered_count = 136 WHERE id = 4 AND registered_count = 0;
                UPDATE event_schedules SET capacity = 450, registered_count = 306 WHERE id = 5 AND registered_count = 0;
            """))
        print("User, Registration & Event columns ensured.")
    except Exception as e:
        print(f"Warning: Column migration skipped: {e}")

    # Start Background Email Reminder Scheduler (Task 34)
    try:
        from app.services.scheduler import start_scheduler, stop_scheduler
        start_scheduler()
    except Exception as e:
        print(f"Warning: Could not start reminder scheduler: {e}")

    yield

    try:
        from app.services.scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware Configuration (Task 21)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API Routers
from app.api.v1.router import api_v1_router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Mount Static Files for Uploads & Slides
import os
from fastapi.staticfiles import StaticFiles
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "uploads", "slides"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1;"))
        db_status = "healthy" if result.scalar() == 1 else "unhealthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "environment": "development" if settings.DEBUG else "production",
    }

