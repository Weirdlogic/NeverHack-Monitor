FROM python:3.13-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies including PostgreSQL development files
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy the Python dependency file from the Backend folder
COPY ../Backend/requirements.txt .

# Install system dependencies including PostgreSQL development files
RUN apt-get update && apt-get install -y curl net-tools procps
# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source code from Backend/src to the container
COPY ../Backend/src ./src

# Copy the data directory from host to container
COPY ../Backend/data ./data

# Create logs directory
RUN mkdir -p /app/logs

# Expose the application port
EXPOSE 10000

# Default command to run the app
CMD ["python", "src/run.py"]
