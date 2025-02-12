from pathlib import Path
import json
import shutil
from datetime import datetime
import logging
from typing import List, Optional
import re
from sqlalchemy.orm import Session

from config import DOWNLOAD_DIR, PROCESSED_DIR, FILE_PATTERN, LATEST_FILE
from api.database import get_session
from api.models import TargetList

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataManager:
    def __init__(self):
        self.download_dir = DOWNLOAD_DIR
        self.processed_dir = PROCESSED_DIR
        self.latest_file = LATEST_FILE
        self.file_pattern = re.compile(FILE_PATTERN)
        logger.info("DataManager initialized")

    def get_available_files(self) -> List[Path]:
        """Get list of available JSON files in download directory"""
        files = sorted([
            f for f in self.download_dir.glob("*.json")
            if self.file_pattern.match(f.name)
        ], key=lambda x: x.stat().st_mtime)
        logger.info(f"Found {len(files)} available files")
        return files

    def get_unprocessed_files(self) -> List[Path]:
        """Get files that haven't been processed yet by checking both processed dir and database"""
        with get_session() as session:
            processed_files = {f.filename for f in session.query(TargetList.filename).all()}
            unprocessed_files = [
                f for f in self.get_available_files()
                if f.name not in processed_files
            ]
        logger.info(f"Found {len(unprocessed_files)} unprocessed files")
        return unprocessed_files

    def get_latest_local_file(self) -> Optional[Path]:
        """Get the most recent file from local storage and database"""
        with get_session() as session:
            # Get latest from database
            latest_db = session.query(TargetList).order_by(TargetList.ingested_at.desc()).first()
            latest_db_name = latest_db.filename if latest_db else None

            # Get latest from files
            files = self.get_available_files()
            latest_file = files[-1] if files else None

            if latest_db_name and latest_file:
                # Return the most recent of the two
                if latest_file.name > latest_db_name:
                    logger.info(f"Latest local file: {latest_file.name}")
                    return latest_file
                else:
                    logger.info(f"Latest DB file: {latest_db_name}")
                    return self.download_dir / latest_db_name
            
            return latest_file

    def mark_as_processed(self, filepath: Path) -> None:
        """Copy file to processed directory after successful processing"""
        dest = self.processed_dir / filepath.name
        shutil.copy2(str(filepath), str(dest))
        logger.info(f"Marked {filepath.name} as processed")

        # Keep only the latest file in processed directory
        processed_files = sorted(self.processed_dir.glob('*.json'), key=lambda x: x.stat().st_mtime)
        for file in processed_files[:-1]:
            try:
                file.unlink()
                logger.info(f"Removed old processed file: {file.name}")
            except Exception as e:
                logger.error(f"Failed to remove old processed file {file.name}: {e}")

    def validate_json_file(self, filepath: Path) -> bool:
        """Basic validation of JSON file structure"""
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            # Basic structure validation
            if not isinstance(data, dict):
                logger.error(f"File {filepath.name} is not a valid JSON object")
                return False
            if 'targets' not in data or 'randoms' not in data:
                logger.error(f"File {filepath.name} is missing required keys")
                return False
            if not isinstance(data['targets'], list):
                logger.error(f"File {filepath.name} has invalid 'targets' key")
                return False

            # Check if file is already in database
            with get_session() as session:
                if session.query(TargetList).filter_by(filename=filepath.name).first():
                    logger.info(f"File {filepath.name} already exists in database")
                    return False

            logger.info(f"File {filepath.name} is valid")
            return True
        except Exception as e:
            logger.error(f"Error validating {filepath}: {e}")
            return False

    def prepare_for_ingestion(self, filepath: Path) -> dict:
        """Read and prepare JSON file for ingestion"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        logger.info(f"Prepared {filepath.name} for ingestion")
        return data

    def process_new_files(self) -> int:
        """Process any new files in the download directory"""
        processed_count = 0
        for filepath in self.get_unprocessed_files():
            if self.validate_json_file(filepath):
                self.mark_as_processed(filepath)
                processed_count += 1

        logger.info(f"Processed {processed_count} new files")
        return processed_count

if __name__ == "__main__":
    # Example usage
    dm = DataManager()
    print(f"Found {len(dm.get_available_files())} total files")
    print(f"Found {len(dm.get_unprocessed_files())} unprocessed files")
    if dm.get_latest_local_file():
        print(f"Latest file: {dm.get_latest_local_file().name}")
