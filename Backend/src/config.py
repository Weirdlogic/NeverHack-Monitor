import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the Backend directory (two levels up from config.py)
BACKEND_DIR = Path(__file__).parent.parent.absolute()

# Base directories - resolve relative to BACKEND_DIR
DATA_DIR = BACKEND_DIR / os.getenv('DATA_DIR', 'data')
DOWNLOAD_DIR = BACKEND_DIR / os.getenv('DOWNLOAD_DIR', 'data/raw')
PROCESSED_DIR = BACKEND_DIR / os.getenv('PROCESSED_DIR', 'data/processed')
DB_DIR = BACKEND_DIR / os.getenv('DB_DIR', 'data/db')

# Create all required directories
for directory in [DATA_DIR, DOWNLOAD_DIR, PROCESSED_DIR, DB_DIR]:
    directory.mkdir(exist_ok=True, parents=True)

# File settings
FILE_PATTERN = os.getenv('FILE_PATTERN', r'\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_DDoSia-target-list-full\.json')
LATEST_FILE = None  # Will be set dynamically based on processed directory contents

# Database settings
DB_PATH = os.path.join(DB_DIR, os.getenv('DB_NAME', 'neverhack.db'))

# API settings
BASE_URL = os.getenv('BASE_URL', 'https://witha.name/data/')
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', 120))  # Check every 2 minutes for testing

# API Configuration
API_HOST = os.getenv('API_HOST', 'localhost')
API_PORT = int(os.getenv('API_PORT', 3000))  # Use API_PORT env var but default to 300
