import asyncio
from sqlalchemy import text
from app.core.database import engine

async def set_db_tz():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER DATABASE eventhub SET timezone TO 'Asia/Ho_Chi_Minh';"))
            print("Successfully set eventhub database timezone to Asia/Ho_Chi_Minh")
        except Exception as e:
            print("Error altering database timezone:", e)
        
        # Verify current setting
        res = await conn.execute(text("SELECT current_setting('TIMEZONE'), NOW();"))
        print("Verification:", res.all())

if __name__ == "__main__":
    asyncio.run(set_db_tz())
