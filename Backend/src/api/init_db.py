import os
from sqlalchemy import create_engine, inspect, event
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
import sys
import time
import logging
from pathlib import Path

# Add parent directory to Python path
parent_dir = str(Path(__file__).parent.parent)
if (parent_dir not in sys.path):
    sys.path.append(parent_dir)

from api.models import Base
from config import DB_PATH, DATA_DIR, DOWNLOAD_DIR, PROCESSED_DIR

logger = logging.getLogger(__name__)

def init_database(drop_existing=False, max_retries=3):
    """Initialize the database with retry mechanism for concurrent access"""
    retry_count = 0
    while retry_count < max_retries:
        try:
            engine = create_engine(f'sqlite:///{DB_PATH}')
            
            if drop_existing:
                Base.metadata.drop_all(engine)
                logger.info("Dropped existing tables")
            
            # Configure SQLite for better concurrent access
            @event.listens_for(engine, 'connect')
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.close()
            
            Base.metadata.create_all(engine)
            logger.info("Database initialized successfully")
            return engine
            
        except OperationalError as e:
            retry_count += 1
            if retry_count >= max_retries:
                logger.error(f"Failed to initialize database after {max_retries} attempts: {e}")
                raise
            logger.warning(f"Database initialization failed (attempt {retry_count}), retrying in 1 second...")
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"Unexpected error during database initialization: {e}")
            raise

if __name__ == "__main__":
    engine = init_database()
    
    # Verify the schema
    inspector = inspect(engine)
    for table_name in inspector.get_table_names():
        print(f"\nTable: {table_name}")
        for column in inspector.get_columns(table_name):
            print(f"  - {column['name']}: {column['type']}")
    
    print("\nDatabase initialized successfully!")
