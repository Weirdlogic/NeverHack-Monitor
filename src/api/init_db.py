import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session
import sys
from pathlib import Path

# Add parent directory to Python path
parent_dir = str(Path(__file__).parent.parent)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from api.models import Base
from config import DB_PATH, DATA_DIR, DOWNLOAD_DIR, PROCESSED_DIR

def init_database():
    """Initialize the database and required directories"""
    # Create all required directories
    for directory in [DATA_DIR, DOWNLOAD_DIR, PROCESSED_DIR]:
        directory.mkdir(exist_ok=True, parents=True)
    
    # Remove existing database if it exists
    if os.path.exists(DB_PATH):
        print("Removing existing database...")
        os.remove(DB_PATH)
    
    # Create database directory if it doesn't exist
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Create database engine
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # Create all tables
    Base.metadata.create_all(engine)
    print("Created new database with fresh schema")
    
    return engine

if __name__ == "__main__":
    engine = init_database()
    
    # Verify the schema
    inspector = inspect(engine)
    for table_name in inspector.get_table_names():
        print(f"\nTable: {table_name}")
        for column in inspector.get_columns(table_name):
            print(f"  - {column['name']}: {column['type']}")
    
    print("\nDatabase initialized successfully!")
