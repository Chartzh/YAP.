FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Cloud Run injects PORT env variable (default 8080)
ENV PORT=8080

# Run with Gunicorn: 1 worker, 8 threads (optimal for Cloud Run)
CMD exec gunicorn --bind :$PORT \
    --workers 1 \
    --threads 8 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    app:app
