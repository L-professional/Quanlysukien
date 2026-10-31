import os
import sys
import asyncio

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from app.api.v1.auth import ensure_default_roles
from app.db.seed_events import seed_20_realistic_events

async def run_seed():
    async with AsyncSessionLocal() as session:
        await ensure_default_roles(session)
    count = await seed_20_realistic_events()
    print(f"Seed completed: {count} events processed, demo accounts password reset to '123456'.")

if __name__ == "__main__":
    asyncio.run(run_seed())
