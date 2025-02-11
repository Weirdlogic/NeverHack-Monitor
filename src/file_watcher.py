import re
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path
import logging
from typing import Optional, List, Tuple
import tenacity
from validators import JsonValidator
from data_ingestion import DataIngestion
import sys

from config import BASE_URL, DOWNLOAD_DIR, FILE_PATTERN, CHECK_INTERVAL, PROCESSED_DIR

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def extract_datetime_from_filename(filename: str) -> datetime:
    """Extract date and time from filename and convert to datetime object."""
    try:
        date_time_part = filename.split('_DDoSia')[0]
        
        formats = [
            ("%Y-%m-%d_%H-%M-%S", r"^\d{4}-\d{2}-\d{2}"),  # 2025-02-07_12-20-02
            ("%d-%m-%Y_%H-%M-%S", r"^\d{2}-\d{2}-\d{4}")   # 05-06-2023_20-15-12
        ]
        
        for date_format, pattern in formats:
            if re.match(pattern, date_time_part):
                try:
                    dt = datetime.strptime(date_time_part, date_format)
                    return dt
                except ValueError:
                    continue
                
        raise ValueError(f"Could not parse date from filename: {filename}")
    except Exception as e:
        logger.error(f"Error parsing datetime from {filename}: {e}")
        raise

def get_latest_processed_file() -> Optional[str]:
    """Get the name of the most recently processed file."""
    processed_files = list(PROCESSED_DIR.glob('*.json'))
    if not processed_files:
        return None
    return sorted(processed_files)[-1].name

class FileWatcher:
    def __init__(self):
        self.last_check = None
        self.target_file = get_latest_processed_file()
        if not self.target_file:
            logger.error("No processed files found. Cannot proceed.")
            sys.exit(1)
        self._initialize_latest_file()
        self.validator = JsonValidator()
        self.ingestion = DataIngestion()

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
        """Initialize the latest processed file information."""
        try:
            self.latest_file = self.target_file
            self.latest_datetime = extract_datetime_from_filename(self.latest_file)
            logger.info(f"Using target file as reference: {self.latest_file} ({self.latest_datetime})")

        except Exception as e:
            logger.error(f"Error initializing latest file: {e}")
            raise

    @tenacity.retry(
        stop=tenacity.stop_after_attempt(3),
        wait=tenacity.wait_exponential(multiplier=1, min=4, max=10),
        retry=tenacity.retry_if_exception_type(
            (requests.RequestException, requests.ConnectionError)
        )
    )
    def _fetch_available_files(self) -> List[str]:
        """Fetch list of available JSON files from the website and filter them."""
        try:
            if not self._check_target_file():
                logger.error("Security check failed - stopping file fetch")
                return []

            response = requests.get(BASE_URL)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            newer_files = []
            skipped_files = []
            
            for link in soup.find_all('a'):
                href = link.get('href')
                if href and re.match(FILE_PATTERN, href):
                    try:
                        file_date = extract_datetime_from_filename(href)
                        if file_date <= self.latest_datetime:
                            skipped_files.append((href, file_date))
                            continue
                        newer_files.append((href, file_date))
                    except ValueError as e:
                        logger.warning(f"Invalid date format in file: {href}")

            logger.info(f"Found {len(newer_files)} new files, skipped {len(skipped_files)} older files")
            return [f[0] for f in sorted(newer_files, key=lambda x: x[1])]
            
        except Exception as e:
            logger.error(f"Error fetching file list: {e}")
            return []

    def _download_file(self, filename: str) -> bool:
        """Download and validate a single file."""
        if not self._check_target_file():
            logger.error("Security check failed - stopping download")
            return False

        try:
            url = f"{BASE_URL}/{filename}"
            response = requests.get(url)
            response.raise_for_status()
            
            filepath = DOWNLOAD_DIR / filename
            filepath.write_bytes(response.content)
            
            is_valid, error = self.validator.validate_file(str(filepath))
            if not is_valid:
                logger.error(f"Validation failed for {filename}: {error}")
                filepath.unlink()
                return False
            
            success = self.ingestion.ingest_file(filepath)
            if not success:
                logger.error(f"Ingestion failed for {filename}")
                return False
            
            processed_path = PROCESSED_DIR / filename
            filepath.rename(processed_path)
            
            logger.info(f"Successfully processed {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing {filename}: {e}")
            return False

    def check_and_download(self) -> List[str]:
        """Check for and download new files."""
        if not self._check_target_file():
            logger.error("Security check failed - stopping check and download")
            return []

        try:
            available_files = self._fetch_available_files()
            if not available_files:
                logger.info("No new files available")
                return []

            downloaded = []
            for filename in available_files:
                file_datetime = extract_datetime_from_filename(filename)
                logger.info(f"Processing file {filename} from {file_datetime}")
                
                if self._download_file(filename):
                    downloaded.append(filename)
                    self.latest_file = filename
                    self.latest_datetime = file_datetime

            return downloaded

        except Exception as e:
            logger.error(f"Error in check_and_download: {e}")
            return []

    def run(self):
        """Main loop for watching files."""
        try:
            while True:
                if not self._check_target_file():
                    logger.error("Security check failed - stopping watcher")
                    break
                    
                logger.info("Starting file check cycle...")
                downloaded = self.check_and_download()
                
                if downloaded:
                    logger.info(f"Successfully processed {len(downloaded)} new files")
                else:
                    logger.info("No new files to process")
                
                self.last_check = datetime.now()
                logger.info(f"Waiting {CHECK_INTERVAL} seconds before next check...")
                time.sleep(CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("File watching stopped by user")
        except Exception as e:
            logger.error(f"Fatal error in file watcher: {e}")
            raise

if __name__ == "__main__":
    try:
        watcher = FileWatcher()
        watcher.run()
    except Exception as e:
        logger.error(f"Application failed to start: {e}")