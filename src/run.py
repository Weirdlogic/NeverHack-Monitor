import asyncio
import uvicorn
from api.poller import start_polling
from multiprocessing import Process
import sys
from pathlib import Path
from api.init_db import init_database
from api.data_ingestion import ingest_new_files
from sqlalchemy.orm import Session
import logging
from config import PROCESSED_DIR, DOWNLOAD_DIR
import os

# Add the src directory to the Python path
sys.path.append(str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_system():
    """Initialize the database and process initial JSON files"""
    logger.info("Initializing system...")
    
    # Create required directories
    for directory in [PROCESSED_DIR, DOWNLOAD_DIR]:
        os.makedirs(directory, exist_ok=True)
    
    # Check if processed directory is empty
    if not any(PROCESSED_DIR.glob('*.json')):
        logger.warning("No files found in processed directory. System requires at least one processed file.")
        return None
    
    # Initialize database without dropping
    engine = init_database(drop_existing=False)
    logger.info("Database initialized successfully!")
    
    # First process any existing files in raw directory
    with Session(engine) as session:
        files_processed = ingest_new_files(session)
        logger.info(f"Processed {files_processed} initial JSON files")
    
    return engine

def run_api():
    """Run the FastAPI server"""
    uvicorn.run("api.app:app", host="0.0.0.0", port=8000, reload=True)

async def main():
    # Initialize system first
    engine = initialize_system()
    if not engine:
        logger.error("System initialization failed. Ensure at least one processed file exists.")
        return
    
    # Start API server in a separate process
    api_process = Process(target=run_api)
    api_process.start()
    logger.info("API server started")

    # Run the poller in the main process
    try:
        await start_polling()
    except KeyboardInterrupt:
        logger.info("\nShutting down...")
        api_process.terminate()
        api_process.join()
    except Exception as e:
        logger.error(f"Error in polling process: {e}")
        api_process.terminate()
        api_process.join()

if __name__ == "__main__":
    asyncio.run(main())