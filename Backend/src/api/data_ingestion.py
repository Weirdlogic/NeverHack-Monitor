import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import sys
from pathlib import Path
import logging
import re
import shutil
from typing import List, Tuple

# Add parent directory to Python path
parent_dir = str(Path(__file__).parent.parent)
if (parent_dir not in sys.path):
    sys.path.append(parent_dir)

from data_manager import DataManager
from data_model import Target, TargetList
from config import PROCESSED_DIR, DOWNLOAD_DIR

logger = logging.getLogger(__name__)

LOGS_DIR = Path(__file__).parent.parent.parent / 'logs'
ingestion_logger = logging.getLogger('ingestion')
ingestion_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(LOGS_DIR / 'ingestion.log')
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
ingestion_logger.addHandler(file_handler)

def extract_date_from_filename(filename: str) -> datetime:
    """Extract date from filename in the format YYYY-MM-DD_HH-MM-SS"""
    match = re.search(r'(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})', filename)
    if match:
        # Parse as naive datetime for consistent comparison
        dt = datetime.strptime(match.group(1), '%Y-%m-%d_%H-%M-%S')
        ingestion_logger.debug(f"Extracted datetime {dt} from {filename}")
        return dt
    ingestion_logger.warning(f"Could not extract date from {filename}, using current time")
    return datetime.now()

def process_single_file(session: Session, filepath: Path) -> Tuple[bool, str]:
    """Process a single file and return success status and message"""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Check if file has already been processed
        existing_target_list = session.query(TargetList).filter_by(filename=filepath.name).first()
        if existing_target_list:
            return False, "File already processed"
        
        # Create target list entry
        target_list = TargetList(filename=filepath.name)
        session.add(target_list)
        session.flush()
        
        # Extract date from filename
        first_seen_date = extract_date_from_filename(filepath.name)
        
        # Process targets
        for target_data in data['targets']:
            target = Target(
                target_list_id=target_list.id,
                target_id=target_data.get('target_id'),
                request_id=target_data.get('request_id'),
                host=target_data.get('host'),
                ip=target_data.get('ip'),
                type=target_data.get('type'),
                method=target_data.get('method'),
                port=target_data.get('port'),
                use_ssl=target_data.get('use_ssl', False),
                path=target_data.get('path'),
                body=target_data.get('body'),
                headers=target_data.get('headers'),
                first_seen=first_seen_date,
                last_seen=datetime.now(timezone.utc)
            )
            session.add(target)
        
        return True, ""
    except Exception as e:
        return False, str(e)

def copy_to_processed(filepath: Path) -> bool:
    """Copy a file to the processed directory, preserving the original"""
    try:
        dest_path = PROCESSED_DIR / filepath.name
        shutil.copy2(str(filepath), str(dest_path))
        ingestion_logger.info(f"Copied {filepath.name} to processed directory")
        return True
    except Exception as e:
        ingestion_logger.error(f"Failed to copy {filepath.name}: {e}")
        return False

def get_files_to_process() -> List[Path]:
    """Get list of files to process, sorted by date"""
    files = list(DOWNLOAD_DIR.glob('*.json'))
    return sorted(files, key=lambda x: extract_date_from_filename(x.name))

def ingest_new_files(session: Session) -> int:
    """Process any new files and add them to the database"""
    dm = DataManager()
    processed_count = 0
    
    # Ensure processed directory exists
    PROCESSED_DIR.mkdir(exist_ok=True, parents=True)
    
    # Get all files to process, sorted by date
    files_to_process = get_files_to_process()
    ingestion_logger.info(f"Found {len(files_to_process)} files to process")
    
    for filepath in files_to_process:
        if not filepath.exists():
            ingestion_logger.warning(f"File not found: {filepath}")
            continue
            
        if dm.validate_json_file(filepath):
            ingestion_logger.info(f"Processing file: {filepath.name}")
            success, error = process_single_file(session, filepath)
            
            if success:
                try:
                    # Try to commit the changes for this file
                    session.commit()
                    
                    # Copy file to processed directory after successful ingestion
                    if copy_to_processed(filepath):
                        processed_count += 1
                        ingestion_logger.info(f"Successfully ingested file: {filepath.name}")
                    else:
                        ingestion_logger.error(f"Failed to copy processed file: {filepath.name}")
                        
                except Exception as e:
                    session.rollback()
                    ingestion_logger.error(f"Failed to commit changes for {filepath.name}: {e}")
            else:
                if "already processed" in error:
                    ingestion_logger.info(f"File {filepath.name} already processed")
                else:
                    ingestion_logger.error(f"Failed to process {filepath.name}: {error}")
        else:
            ingestion_logger.error(f"Failed to validate {filepath}")
    
    # Delete all files in the processed directory except the latest one
    processed_files = sorted(PROCESSED_DIR.glob('*.json'), key=lambda x: x.stat().st_mtime)
    for file in processed_files[:-1]:
        try:
            file.unlink()
            ingestion_logger.info(f"Deleted old processed file: {file.name}")
        except Exception as e:
            ingestion_logger.error(f"Failed to delete old processed file {file.name}: {e}")
    
    return processed_count
