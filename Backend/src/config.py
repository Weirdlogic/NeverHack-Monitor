import os
from pathlib import Path

# Get the project root directory
ROOT_DIR = Path(__file__).parent.parent

# Base directories
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DOWNLOAD_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
DB_DIR = DATA_DIR / "db"

# Create all required directories
for directory in [DATA_DIR, DOWNLOAD_DIR, PROCESSED_DIR, DB_DIR]:
    directory.mkdir(exist_ok=True, parents=True)

# File settings
FILE_PATTERN = r"\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_DDoSia-target-list-full\.json"
LATEST_FILE = None  # Will be set dynamically based on processed directory contents

# Database settings
DB_PATH = os.path.join(DB_DIR, 'neverhack.db')

# API settings
BASE_URL = "https://witha.name/data/"
CHECK_INTERVAL = 120  # Check every 2 minutes for testing

# API Configuration
API_HOST = "localhost"
API_PORT = 8000
