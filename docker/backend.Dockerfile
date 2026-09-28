FROM python:3.10-slim

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and machine learning libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies list
COPY backend/requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend app source code
COPY backend/app ./backend/app

# Copy ML pipeline models
COPY ml/models ./ml/models

# Expose FastAPI port
EXPOSE 8000

ENV PYTHONPATH=/app

# Command to run uvicorn server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
