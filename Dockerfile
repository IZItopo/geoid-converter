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

# Définir explicitement le port
ENV PORT=8080
EXPOSE 8080

# Utiliser directement 8080 (pas de variable)
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]