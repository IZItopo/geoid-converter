# Utiliser une image Python officielle
FROM python:3.11-slim

# Installer les dépendances système pour PROJ
RUN apt-get update && apt-get install -y \
    proj-bin \
    libproj-dev \
    proj-data \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier tout le projet
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p uploads grids

# Exposer le port
EXPOSE 8080

# Variable d'environnement pour le port
ENV PORT=8080

# Commande de démarrage
CMD gunicorn app:app --bind 0.0.0.0:$PORT --workers 2
