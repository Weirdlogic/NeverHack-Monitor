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

# Add the src directory to the Python path
sys.path.append(str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_system():
    """Initialize the database and process initial JSON files"""
    logger.info("Initializing system...")
    
    # Initialize database
    engine = init_database()
    logger.info("Database initialized successfully!")
    
    # Process any existing JSON files in the raw directory
    with Session(engine) as session:
        files_processed = ingest_new_files(session)
        session.commit()
        logger.info(f"Processed {files_processed} initial JSON files")
    
    return engine

def run_api():
    """Run the FastAPI server"""
    uvicorn.run("api.app:app", host="0.0.0.0", port=8000, reload=True)

def main():
    # Initialize system first
    engine = initialize_system()
    
    # Start API server in a separate process
    api_process = Process(target=run_api)
    api_process.start()

    # Run the poller in the main process
    try:
        asyncio.run(start_polling())
    except KeyboardInterrupt:
        logger.info("\nShutting down...")
        api_process.terminate()
        api_process.join()

if __name__ == "__main__":
    main()