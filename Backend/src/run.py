import asyncio
import uvicorn
from api.poller import start_polling
from multiprocessing import Process
import sys
from pathlib import Path
from api.init_db import init_database
from api.data_ingestion import ingest_new_files, get_files_to_process, process_single_file
from sqlalchemy.orm import Session
import logging
from config import PROCESSED_DIR, DOWNLOAD_DIR
import os
import shutil
from api.database import get_session
from api.models import TargetList

sys.path.append(str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_system():
    """Initialize the database and process initial JSON files"""
    logger.info("Initializing system...")
    
    # Create required directories
    for directory in [PROCESSED_DIR, DOWNLOAD_DIR]:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize database without dropping
    engine = init_database(drop_existing=False)
    logger.info("Database initialized successfully!")
    
    # Process files in both raw and processed directories
    with get_session() as session:
        # First, process any unprocessed files from the raw directory
        raw_files = get_files_to_process()
        files_processed = ingest_new_files(session)
        if files_processed > 0:
            logger.info(f"Processed {files_processed} new files from raw directory")
        
        # Then process any files in the processed directory that aren't in the database
        processed_files = list(PROCESSED_DIR.glob('*.json'))
        for file in processed_files:
            if not session.query(TargetList).filter_by(filename=file.name).first():
                try:
                    success, error = process_single_file(session, file)
                    if success:
                        session.commit()
                        logger.info(f"Processed file from processed directory: {file.name}")
                    else:
                        session.rollback()
                        logger.error(f"Failed to process {file.name} from processed directory: {error}")
                except Exception as e:
                    session.rollback()
                    logger.error(f"Error processing {file.name} from processed directory: {e}")
        
        # Keep only the latest file in the processed directory
        processed_files = sorted(PROCESSED_DIR.glob('*.json'), key=lambda x: x.stat().st_mtime)
        for file in processed_files[:-1]:
            try:
                file.unlink()
                logger.info(f"Deleted old processed file: {file.name}")
            except Exception as e:
                logger.error(f"Failed to delete old processed file {file.name}: {e}")
    
    return engine

def run_api():
    """Run the FastAPI server"""
    from config import API_PORT, API_HOST
    uvicorn.run(
        "api.app:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
        workers=1
    )

async def main():
    # Initialize system first
    engine = initialize_system()
    if not engine:
        logger.error("Database initialization failed.")
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