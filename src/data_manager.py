from pathlib import Path
import json
import shutil
from datetime import datetime
import logging
from typing import List, Optional
import re

from config import DOWNLOAD_DIR, PROCESSED_DIR, FILE_PATTERN, LATEST_FILE

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
        ])
        logger.info(f"Found {len(files)} available files")
        return files

    def get_unprocessed_files(self) -> List[Path]:
        """Get files that haven't been processed yet"""
        processed_files = {f.name for f in self.processed_dir.glob("*.json")}
        unprocessed_files = [
            f for f in self.get_available_files()
            if f.name not in processed_files
        ]
        logger.info(f"Found {len(unprocessed_files)} unprocessed files")
        return unprocessed_files

    def get_latest_local_file(self) -> Optional[Path]:
        """Get the most recent file from local storage"""
        files = self.get_available_files()
        latest_file = files[-1] if files else None
        if latest_file:
            logger.info(f"Latest local file: {latest_file.name}")
        else:
            logger.info("No local files found")
        return latest_file

    def mark_as_processed(self, filepath: Path) -> None:
        """Move file to processed directory after successful processing"""
        dest = self.processed_dir / filepath.name
        shutil.move(str(filepath), str(dest))
        logger.info(f"Moved {filepath.name} to processed directory")

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
                # Here you would call your ingestion logic
                # ingest_data(self.prepare_for_ingestion(filepath))
                self.mark_as_processed(filepath)
                processed_count += 1
            else:
                logger.error(f"Failed to validate {filepath}")

        logger.info(f"Processed {processed_count} new files")
        return processed_count

    def delete_raw_files(self) -> None:
        """Delete all files in the raw folder after processing"""
        for filepath in self.download_dir.glob("*.json"):
            filepath.unlink()
            logger.info(f"Deleted raw file: {filepath.name}")

if __name__ == "__main__":
    # Example usage
    dm = DataManager()
    print(f"Found {len(dm.get_available_files())} total files")
    print(f"Found {len(dm.get_unprocessed_files())} unprocessed files")
    if dm.get_latest_local_file():
        print(f"Latest file: {dm.get_latest_local_file().name}")
