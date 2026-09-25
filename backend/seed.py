import os
import sys
import asyncio

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.seed_events import seed_20_realistic_events

if __name__ == "__main__":
    count = asyncio.run(seed_20_realistic_events())
    print(f"Seed completed: {count} events processed.")
