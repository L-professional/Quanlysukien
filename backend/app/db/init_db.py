"""Database initialization and demo account seeding helper module.
Can be executed via: python -m app.db.init_db
"""
from app.initial_data import init_with_retry, main

if __name__ == "__main__":
    main()
