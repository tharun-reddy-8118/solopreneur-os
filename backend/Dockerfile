FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies (e.g. for psycopg2)
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user specifically for Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Copy the rest of the application
COPY --chown=user . /app

# Expose port 7860 (required by Hugging Face)
EXPOSE 7860

# Run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
