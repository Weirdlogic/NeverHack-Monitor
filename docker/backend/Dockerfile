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
COPY ./Backend/requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source code from Backend/src to the container
COPY ./Backend/src ./src

# Create necessary directories inside the container
RUN mkdir -p /app/data/processed /app/data/raw /app/data/db /app/logs

# Expose the application port
EXPOSE 3000

# Default command to run the app
CMD ["python", "src/run.py"]
