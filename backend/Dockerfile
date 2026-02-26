FROM hub.hamdocker.ir/python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Install Python dependencies (make sure gunicorn is in requirements.txt)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy project source
COPY . /app

EXPOSE 8000

# Default command (can be overridden by docker-compose)
CMD ["gunicorn", "project.wsgi:application", "--bind", "0.0.0.0:8000"]
