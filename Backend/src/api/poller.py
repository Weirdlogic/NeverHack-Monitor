import asyncio
import aiohttp
import re
from datetime import datetime
from pathlib import Path
import logging
from typing import List, Optional
import sys
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from api.database import get_session
from api.data_ingestion import ingest_new_files
from api.models import TargetList

sys.path.append(str(Path(__file__).parent.parent))

from config import BASE_URL, CHECK_INTERVAL, DOWNLOAD_DIR, FILE_PATTERN, PROCESSED_DIR
from utils.logging_config import setup_logger
from utils.validators import validate_json_file

LOGS_DIR = Path(__file__).parent.parent.parent / 'logs'
logger = setup_logger('poller', LOGS_DIR / 'poller.log')

def get_latest_processed_file() -> Optional[str]:
    """Get the name of the most recently processed file from raw directory."""
    try:
        # Get latest from raw directory - our source of truth
        raw_files = list(DOWNLOAD_DIR.glob('*.json'))
        if not raw_files:
            logger.warning("No files found in raw directory")
            return None
            
        latest_file = sorted(raw_files, key=lambda x: x.stat().st_mtime)[-1].name
        logger.info(f"Found latest file in raw directory: {latest_file}")
        return latest_file
    except Exception as e:
        logger.error(f"Error getting latest processed file: {e}")
        return None

class WebsitePoller:
    def __init__(self):
        self.base_url = BASE_URL
        self.pattern = re.compile(FILE_PATTERN)
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Initialize with latest processed file
        self.target_file = get_latest_processed_file()
        self.latest_datetime = datetime.min
        
        if self.target_file:
            self._initialize_latest_file()
            logger.info(f"Initialized WebsitePoller with target file: {self.target_file}")
        else:
            logger.info("First-time initialization - no existing files")

    def _check_target_file(self) -> bool:
        """Check if file exists in either raw directory or database."""
        if not self.target_file:
            return True  # Allow first-time initialization
            
        with get_session() as session:
            db_exists = session.query(TargetList).filter_by(filename=self.target_file).first() is not None
            file_exists = (DOWNLOAD_DIR / self.target_file).exists()  # Check raw directory instead of processed
            
            if not (db_exists or file_exists):
                logger.warning(f"Target file {self.target_file} not found in DB or raw directory")
                self.target_file = None
                self.latest_datetime = datetime.min
                return True
            return True

    def _initialize_latest_file(self):
        """Initialize the latest processed file datetime."""
        try:
            dt = self._parse_file_datetime(self.target_file)
            if dt is not None:
                self.latest_datetime = dt
                logger.info(f"Using reference datetime: {self.latest_datetime}")
            else:
                self.latest_datetime = datetime.min
                logger.warning("Could not parse datetime from file, using minimum date")
        except Exception as e:
            logger.error(f"Failed to initialize reference datetime: {e}")
            self.latest_datetime = datetime.min

    async def init_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close_session(self):
        if self.session:
            await self.session.close()
            self.session = None

    def _parse_file_datetime(self, filename: str) -> Optional[datetime]:
        """Parse datetime from filename."""
        try:
            match = re.search(r'(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})', filename)
            if match:
                # Parse datetime but don't attach timezone - we'll compare naive datetimes
                dt = datetime.strptime(match.group(1), '%Y-%m-%d_%H-%M-%S')
                logger.debug(f"Parsed datetime {dt} from filename {filename}")
                return dt
            return None
        except Exception as e:
            logger.error(f"Error parsing datetime from filename {filename}: {e}")
            return None

    async def get_available_files(self) -> List[str]:
        """Get list of available files from website, filtering out processed ones."""
        if not self._check_target_file():
            logger.error("Security check failed - stopping file fetch")
            return []

        try:
            async with self.session.get(self.base_url) as response:
                if response.status == 200:
                    content = await response.text()
                    soup = BeautifulSoup(content, 'html.parser')
                    files = []
                    skipped = 0
                    skipped_reasons = {"exists": 0, "older": 0, "invalid": 0}
                    
                    with get_session() as session:
                        for link in soup.find_all('a'):
                            filename = link.get('href')
                            if not filename or not self.pattern.match(filename):
                                continue
                                
                            file_date = self._parse_file_datetime(filename)
                            if not file_date:
                                skipped_reasons["invalid"] += 1
                                continue

                            # Skip if file exists in raw directory (our source of truth)
                            if (DOWNLOAD_DIR / filename).exists():
                                skipped_reasons["exists"] += 1
                                logger.debug(f"Skipping existing file in raw directory: {filename}")
                                continue
                                
                            # Skip if older than latest processed (compare naive datetimes)
                            if file_date <= self.latest_datetime:
                                skipped_reasons["older"] += 1
                                logger.debug(f"Skipping file {filename} - older than {self.latest_datetime}")
                                continue
                                
                            files.append(filename)
                    
                    logger.info(f"Found {len(files)} new files to download")
                    logger.info(f"Skipped files: {skipped_reasons}")
                    return sorted(files, key=self._parse_file_datetime)
                else:
                    logger.error(f"Failed to get file list: {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching file list: {e}")
            return []

    async def download_file(self, filename: str) -> bool:
        """Download a single file with security checks."""
        if not self._check_target_file():
            logger.error("Security check failed - stopping download")
            return False

        try:
            filepath = DOWNLOAD_DIR / filename
            if filepath.exists():
                logger.debug(f"File {filename} already exists")
                return False

            url = f"{self.base_url}{filename}"
            logger.debug(f"Downloading from: {url}")
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.read()
                    filepath.write_bytes(content)
                    
                    is_valid, error_msg = validate_json_file(str(filepath))
                    if not is_valid:
                        logger.error(f"Invalid file {filename}: {error_msg}")
                        filepath.unlink()
                        return False
                    
                    logger.info(f"Successfully downloaded and validated {filename}")
                    return True
                else:
                    logger.error(f"Failed to download {filename}: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Error downloading {filename}: {e}")
            return False

    async def process_downloaded_files(self):
        """Process downloaded files and update latest file tracking"""
        try:
            with get_session() as session:
                files_processed = ingest_new_files(session)
                if files_processed > 0:
                    logger.info(f"Successfully ingested {files_processed} files")
                    # Update latest file after successful ingestion
                    new_latest = get_latest_processed_file()
                    if new_latest:
                        self.target_file = new_latest
                        self._initialize_latest_file()
        except Exception as e:
            logger.error(f"Error processing downloaded files: {e}")

    async def poll(self):
        """Main polling loop with security checks and immediate processing."""
        if not self._check_target_file():
            logger.error("Security check failed - cannot start polling")
            return

        await self.init_session()
        try:
            while True:
                if not self._check_target_file():
                    logger.error("Security check failed - stopping polling")
                    break
                    
                logger.info("Checking for new files...")
                files = await self.get_available_files()
                
                if files:
                    downloaded = False
                    for file in files:
                        if await self.download_file(file):
                            downloaded = True
                    
                    if downloaded:
                        # Immediately process downloaded files
                        await self.process_downloaded_files()
                
                logger.info(f"Waiting {CHECK_INTERVAL} seconds before next check...")
                await asyncio.sleep(CHECK_INTERVAL)
        except asyncio.CancelledError:
            logger.info("Polling cancelled")
        finally:
            await self.close_session()

async def start_polling():
    """Start the polling process with security checks."""
    try:
        poller = WebsitePoller()
        await poller.poll()
    except Exception as e:
        logger.error(f"Failed to start polling: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(start_polling())