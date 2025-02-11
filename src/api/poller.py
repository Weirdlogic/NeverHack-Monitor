import asyncio
import aiohttp
import re
from datetime import datetime
from pathlib import Path
import logging
from typing import List, Optional
import sys
from bs4 import BeautifulSoup

sys.path.append(str(Path(__file__).parent.parent))

from config import BASE_URL, CHECK_INTERVAL, DOWNLOAD_DIR, FILE_PATTERN, PROCESSED_DIR
from utils.logging_config import setup_logger
from utils.validators import validate_json_file

LOGS_DIR = Path(__file__).parent.parent.parent / 'logs'
logger = setup_logger('poller', LOGS_DIR / 'poller.log')

def get_latest_processed_file() -> Optional[str]:
    """Get the name of the most recently processed file."""
    processed_files = list(PROCESSED_DIR.glob('*.json'))
    if not processed_files:
        return None
    return sorted(processed_files)[-1].name

class WebsitePoller:
    def __init__(self):
        self.base_url = BASE_URL
        self.pattern = re.compile(FILE_PATTERN)
        self.session: Optional[aiohttp.ClientSession] = None
        self.target_file = get_latest_processed_file()
        if not self.target_file:
            raise RuntimeError("No processed files found. Cannot proceed.")
        self._initialize_latest_file()
        logger.info(f"Initialized WebsitePoller with target file: {self.target_file}")

    def _check_target_file(self) -> bool:
        """Check if our target file exists."""
        target_path = PROCESSED_DIR / self.target_file
        exists = target_path.exists()
        if not exists:
            logger.error(
                f"SECURITY CHECK FAILED: Target file {self.target_file} not found. "
                "Cannot proceed with downloads to prevent abuse of the source website."
            )
        return exists

    def _initialize_latest_file(self):
        """Initialize the latest processed file datetime."""
        try:
            self.latest_datetime = datetime.strptime(
                self.target_file.split('_DDoSia')[0],
                "%Y-%m-%d_%H-%M-%S"
            )
            logger.info(f"Using reference datetime: {self.latest_datetime}")
        except Exception as e:
            logger.error(f"Failed to initialize reference datetime: {e}")
            raise

    async def init_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close_session(self):
        if self.session:
            await self.session.close()
            self.session = None

    def _parse_file_datetime(self, filename: str) -> Optional[datetime]:
        """Parse datetime from filename with multiple format support."""
        try:
            date_part = filename.split('_DDoSia')[0]
            formats = [
                ("%Y-%m-%d_%H-%M-%S", r"^\d{4}-\d{2}-\d{2}"),
                ("%d-%m-%Y_%H-%M-%S", r"^\d{2}-\d{2}-\d{4}")
            ]
            
            for date_format, pattern in formats:
                if re.match(pattern, date_part):
                    try:
                        return datetime.strptime(date_part, date_format)
                    except ValueError:
                        continue
            return None
        except Exception:
            return None

    async def get_available_files(self) -> List[str]:
        """Get list of available files from website, filtering out old ones."""
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
                    
                    # Parse HTML to find links
                    for link in soup.find_all('a'):
                        filename = link.get('href')
                        if not filename or not self.pattern.match(filename):
                            continue
                            
                        file_date = self._parse_file_datetime(filename)
                        if not file_date:
                            continue
                            
                        if file_date <= self.latest_datetime:
                            skipped += 1
                            logger.debug(f"Skipping older file: {filename} ({file_date})")
                            continue
                            
                        files.append(filename)
                    
                    logger.info(f"Found {len(files)} new files, skipped {skipped} older files")
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

    async def poll(self):
        """Main polling loop with security checks."""
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
                
                for file in files:
                    await self.download_file(file)
                
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