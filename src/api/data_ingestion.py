import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import sys
from pathlib import Path
import logging
import re

# Add parent directory to Python path
parent_dir = str(Path(__file__).parent.parent)
if (parent_dir not in sys.path):
    sys.path.append(parent_dir)

from data_manager import DataManager
from data_model import Target, TargetList

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
        return datetime.strptime(match.group(1), '%Y-%m-%d_%H-%M-%S').replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)

def ingest_new_files(session: Session) -> int:
    """Process any new files and add them to the database"""
    dm = DataManager()
    processed_count = 0
    
    for filepath in dm.get_unprocessed_files():
        if dm.validate_json_file(filepath):
            data = dm.prepare_for_ingestion(filepath)
            
            # Create target list entry
            target_list = TargetList(filename=filepath.name)
            session.add(target_list)
            session.flush()  # Get the ID
            ingestion_logger.info(f"Ingesting file: {filepath.name}")
            
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
            
            session.commit()
            dm.mark_as_processed(filepath)
            processed_count += 1
            ingestion_logger.info(f"Successfully ingested file: {filepath.name}")
        else:
            ingestion_logger.error(f"Failed to validate {filepath}")
    
    ingestion_logger.info(f"Processed {processed_count} new files")
    dm.delete_raw_files()
    return processed_count
