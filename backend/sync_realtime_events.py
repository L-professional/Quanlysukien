import asyncio
from app.core.database import AsyncSessionLocal
from app.core.timezone import sync_all_events_with_realtime, get_vn_now
from sqlalchemy import text

async def run_sync():
    async with AsyncSessionLocal() as session:
        # Update Event 146 ("Diễn đàn ASEAN") to be ongoing today 02/10/2026
        await session.execute(text("""
            UPDATE events 
            SET start_date = '02/10/2026 08:00', end_date = '03/10/2026 18:00',
                start_time = '2026-10-02 08:00:00+07', end_time = '2026-10-03 18:00:00+07',
                status = 'ONGOING'
            WHERE id = 146;
        """))
        await session.commit()

        # Run real-time synchronization on all events
        res = await sync_all_events_with_realtime(session)
        print("Sync result:", res)

        # Inspect updated events
        res2 = await session.execute(text("""
            SELECT id, title, start_date, end_date, status 
            FROM events 
            ORDER BY id ASC;
        """))
        print("\n--- ALL EVENTS AFTER REAL-TIME SYNC ---")
        for r in res2.all():
            print(f"ID {r[0]:3d} | [{r[4]:10s}] | {r[2]} -> {r[3]} | {r[1]}")

if __name__ == "__main__":
    asyncio.run(run_sync())
