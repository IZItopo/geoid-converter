FROM python:3.11-slim

# Installer les dépendances système pour PROJ
RUN apt-get update && apt-get install -y \
    proj-bin \
    libproj-dev \
    proj-data \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p uploads grids

EXPOSE 8080

# Port fixe 8080
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120"]