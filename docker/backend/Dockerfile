FROM python:3.13-slim

WORKDIR /app

# Install system dependencies including PostgreSQL development files
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and ensure data directories exist
COPY src/ ./src/
RUN mkdir -p data/processed data/raw data/db logs

EXPOSE 8000

# Default command (can be overridden by docker-compose)
CMD ["python", "src/run.py"]