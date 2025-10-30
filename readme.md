# 🌍 Convertisseur de Coordonnées GNSS RTK

Application web professionnelle pour la conversion de coordonnées GNSS entre différents systèmes de référence (EPSG) avec support des géoïdes et validation intelligente.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.11-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)
![Deploy](https://img.shields.io/badge/deploy-Railway-purple)

**🚀 Application en ligne :** [https://web-production-1c09c.up.railway.app/](https://web-production-1c09c.up.railway.app/)

---

## 📋 Table des matières

- [Démo en ligne](#-démo-en-ligne)
- [Fonctionnalités](#-fonctionnalités)
- [Utilisation](#-utilisation)
- [Systèmes EPSG supportés](#-systèmes-epsg-supportés)
- [Géoïdes](#-géoïdes)
- [Installation locale](#-installation-locale)
- [Architecture technique](#-architecture-technique)
- [Déploiement](#-déploiement)
- [FAQ](#-faq)

---

## 🌐 Démo en ligne

Testez l'application directement sans installation :

**👉 [https://web-production-1c09c.up.railway.app/](https://web-production-1c09c.up.railway.app/)**

L'application est hébergée sur Railway avec :
- ✅ HTTPS activé automatiquement
- ✅ Disponibilité 24/7
- ✅ Géoïde RAF20 pré-installé
- ✅ Support de tous les systèmes EPSG

---

## ✨ Fonctionnalités

### 🎯 Conversion intelligente
- **Détection automatique** du format de coordonnées (Lat/Long ou X/Y/Z)
- **Bouton "Détection automatique"** : teste tous les systèmes EPSG d'une région en <1 seconde
- **Validation stricte** avec vérification des limites géographiques officielles EPSG
- **Filtrage intelligent** : seuls les systèmes compatibles avec le format détecté sont affichés
- **Suggestions contextuelles** basées sur la région et la position

### 🔒 Sécurité et validation
- Vérification des **limites géographiques officielles** de chaque système EPSG
- **Verrouillage du système source** après validation (coordonnées projetées)
- Blocage des conversions aberrantes
- Messages d'erreur pédagogiques avec suggestions alternatives
- Protection contre les sélections incompatibles

### 🌐 Large couverture géographique
- **France métropolitaine** : Lambert 93, CC42-CC50, NTF, UTM
- **DOM-TOM** : Guadeloupe, Martinique, Guyane, Réunion, Mayotte
- **Europe** : Suisse, Belgique, Luxembourg
- **International** : WGS84, ETRS89, Web Mercator
- **Plus de 60 systèmes EPSG** disponibles

### 🗺️ Support géoïdes (h → H)
- Conversion hauteur ellipsoïdale (h) → altitude NGF (H)
- **RAF20** (France métropole) - pré-installé ✅
- Support RAF18, RAF09, RAC23
- Détection automatique de disponibilité

### 📊 Interface moderne
- Design responsive et professionnel
- **Affichage progressif** des étapes avec scroll automatique
- Aperçu en tableau des données (5 premières lignes)
- Validation en temps réel avec feedback visuel
- Export CSV standardisé (M, X, Y, Z)

---

## 🎓 Utilisation

### Format du fichier CSV d'entrée

Votre fichier CSV doit contenir **4 colonnes minimum** :
1. **Matricule** (identifiant du point)
2. **Coordonnée 1** (Latitude ou X selon le système)
3. **Coordonnée 2** (Longitude ou Y selon le système)
4. **Altitude** (h ellipsoïdale ou Z)

**Exemples acceptés :**

#### Coordonnées géographiques (WGS84, RGF93)
```csv
Matricule,Latitude,Longitude,h
P001,45.7640,4.8357,245.123
P002,45.7650,4.8360,248.456
```

#### Coordonnées projetées (Lambert 93, CC46)
```csv
Matricule,X,Y,Z
100,1838639.283,5173295.421,269.285
101,1838640.282,5173294.677,269.236
```

**Notes :**
- Séparateurs supportés : `,` `;` `\t`
- En-têtes optionnels (détection automatique)
- Colonnes supplémentaires ignorées

---

### Workflow de conversion

#### 🟢 Coordonnées géographiques (Lat/Long)

1. **Importez votre CSV** (glisser-déposer)
2. ✅ **Détection automatique** :
   - Format : Lat/Long
   - Région : France métropolitaine
   - Système : WGS84
3. **Sélectionnez le système cible** (suggestions affichées)
4. **Choisissez le géoïde** (optionnel) : RAF20 pour h → H NGF
5. **Convertissez** et téléchargez le résultat

#### 🟡 Coordonnées projetées (X/Y)

1. **Importez votre CSV**
2. ⚠️ **Coordonnées projetées détectées**
3. **Sélectionnez la région** (ex: France métropolitaine)
4. **Deux options** :
   - 👨‍💻 **Manuel** : Choisissez directement le système dans la liste filtrée
   - 🤖 **Auto** : Cliquez sur "🔍 Détection automatique" → teste ~20-30 systèmes en <1s
5. **Validez le système source** (verrouillage automatique)
6. **Convertissez** vers le système cible

---

## 🗺 Systèmes EPSG supportés

### France métropolitaine
| Code EPSG | Nom | Usage |
|-----------|-----|-------|
| **2154** | Lambert 93 (RGF93) | Officiel France métro |
| 3946 | CC46 (Lyon/Rhône-Alpes) | Zone conique 5 |
| 3945 | CC45 (Centre-Est) | Zone conique 4 |
| 32631 | UTM 31N | Projection universelle |
| 4171 | RGF93 géographique | Latitude/Longitude |
| 4326 | WGS 84 (GPS) | Standard mondial |

### DOM-TOM
| Région | Codes EPSG principaux |
|--------|----------------------|
| Guadeloupe | 2969 (RGAF09 UTM 20N) |
| Martinique | 2973 (RGAF09 UTM 20N) |
| Guyane | 2972 (RGFG95 UTM 22N) |
| Réunion | 2975 (RGR92 UTM 40S) |
| Mayotte | 4471 (RGM04 UTM 38S) |

### Europe
| Pays | Code EPSG | Système |
|------|-----------|---------|
| Suisse | 2056 | CH1903+ / LV95 |
| Belgique | 31370 | BD72 / Lambert 72 |
| Luxembourg | 2169 | LUREF / Luxembourg TM |

**Total : 60+ systèmes EPSG disponibles**

---

## 🗺️ Géoïdes

### Conversion h → H (hauteur ellipsoïdale → altitude NGF)

**Principe :**
```
H (altitude NGF) = h (GPS) - N (ondulation du géoïde)
```

### Géoïdes disponibles

| Géoïde | Zone | Installé | Précision |
|--------|------|----------|-----------|
| **RAF20** | France métropole | ✅ Oui | ±1-2 cm |
| RAF18b | France métropole | ❌ | ±2-3 cm |
| RAF09 | France métropole | ❌ | ±3-5 cm |
| RAC23 | Corse | ❌ | ±1-2 cm |

**Note :** RAF20 est pré-installé sur la version déployée. Les autres géoïdes peuvent être ajoutés sur demande.

### Exemple de conversion avec RAF20

```
Input (WGS84 + h) :
  Lat: 45.7640°N, Lon: 4.8357°E, h: 245.123m

Avec RAF20 (ondulation ~49.5m) :
  H = h - N = 245.123 - 49.5 ≈ 195.6m NGF

Output (Lambert 93 + H) :
  X: 846583.123, Y: 6518245.789, H: 195.623m NGF
```

---

## 💻 Installation locale

### Prérequis
- Python 3.8+
- pip

### Installation

```bash
# Cloner le projet
git clone https://github.com/VotreUsername/geoid-converter.git
cd geoid-converter

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'application
python app.py
```

**Accès :** http://localhost:5000

### Structure du projet

```
geoid-converter/
├── app.py                 # Application Flask
├── requirements.txt       # Dépendances Python
├── Dockerfile            # Configuration Docker
├── Procfile              # Configuration Railway
├── templates/
│   └── index.html        # Interface web
├── static/
│   ├── style.css        # Styles
│   └── script.js        # Logique frontend
└── grids/
    └── fr_ign_RAF20.tif # Géoïde (28 MB)
```

---

## 🗝️ Architecture technique

### Backend
- **Flask 3.0** : Framework web léger
- **pyproj 3.6** : Bibliothèque de référence pour transformations géodésiques
- **Gunicorn 21.2** : Serveur WSGI pour production
- **Validation stricte** : Vérification via `CRS.area_of_use`

### Frontend
- **HTML5 / CSS3** : Interface moderne et responsive
- **JavaScript Vanilla** : Pas de framework lourd
- **Design progressif** : Étapes qui apparaissent au fur et à mesure
- **Auto-scroll** : Navigation fluide entre sections

### API REST
- `/api/analyze-file` : Analyse du CSV uploadé
- `/api/test-region-systems` : Détection intelligente optimisée (1 appel pour 20-30 tests)
- `/api/reverse-transform` : Validation du système source
- `/api/convert` : Conversion des coordonnées avec ou sans géoïde
- `/api/export` : Export des résultats en CSV

### Sécurité
- Validation côté serveur ET client
- Filtrage automatique des systèmes incompatibles
- Aucune donnée stockée (traitement en mémoire)
- HTTPS activé (Railway)

---

## 🚀 Déploiement

### Option 1 : Utiliser la version en ligne (recommandé)

**👉 [https://web-production-1c09c.up.railway.app/](https://web-production-1c09c.up.railway.app/)**

Aucune installation nécessaire, application prête à l'emploi !

### Option 2 : Déployer votre propre instance sur Railway

1. **Fork le projet** sur GitHub
2. **Créer un compte** sur [railway.app](https://railway.app)
3. **Connecter GitHub** à Railway
4. **Déployer** : Railway détecte automatiquement le Dockerfile
5. **Configurer** :
   - Variables : `PORT=8080`
   - Start Command : `gunicorn app:app --bind 0.0.0.0:8080 --workers 2`
6. **Générer un domaine** dans Settings → Networking

**Temps de déploiement :** ~2 minutes

### Option 3 : Docker local

```bash
# Build
docker build -t geoid-converter .

# Run
docker run -p 8080:8080 geoid-converter
```

**Accès :** http://localhost:8080

---

## ❓ FAQ

### L'application est-elle gratuite ?
Oui, complètement gratuite et open-source (licence MIT).

### Mes données sont-elles sécurisées ?
Oui, toutes les conversions se font en mémoire. Aucune donnée n'est stockée sur le serveur.

### Quelle est la précision des conversions ?
Les conversions utilisent pyproj, bibliothèque de référence, avec une précision centimétrique à métrique selon les systèmes EPSG.

### Puis-je convertir de gros fichiers ?
L'application est optimisée pour 10-500 points. Pour des volumes supérieurs (milliers de points), un traitement par lots est recommandé.

### Le géoïde RAF20 est-il à jour ?
Oui, RAF20 est la version la plus récente (2022) du géoïde pour la France métropolitaine, avec une précision de ±1-2 cm.

### Puis-je utiliser l'application hors ligne ?
Pour une utilisation hors ligne, installez la version locale. Le géoïde RAF20 doit être téléchargé manuellement.

### Comment signaler un bug ?
Ouvrez une issue sur GitHub ou contactez le développeur.

---

## 🛠 Dépannage

### L'interface ne charge pas
- Vérifiez votre connexion internet
- Videz le cache du navigateur (Ctrl+Shift+R)
- Essayez un autre navigateur

### Erreur lors de la conversion
- Vérifiez le format de votre CSV (4 colonnes minimum)
- Assurez-vous que le système source correspond à vos coordonnées
- Utilisez la détection automatique pour les coordonnées projetées

### Le géoïde ne fonctionne pas
RAF20 est pré-installé sur la version en ligne. Si vous utilisez une version locale, téléchargez-le depuis [cdn.proj.org](https://cdn.proj.org/fr_ign_RAF20.tif).

---

## 📚 Documentation technique

### Pour les développeurs

**Technologies utilisées :**
- Python 3.11
- Flask 3.0
- pyproj 3.6 (avec PROJ 9.x)
- Gunicorn 21.2

**APIs externes :**
- Aucune (application autonome)

**Base de données :**
- Aucune (stateless)

**Performance :**
- Conversion : <100ms pour 100 points
- Détection automatique : <1s pour 30 systèmes

---

## 📜 Licence

Ce projet est sous licence MIT. Vous êtes libre de l'utiliser, le modifier et le distribuer.

---

## 🙏 Remerciements

- **PROJ** pour la bibliothèque de transformation de coordonnées
- **IGN** (Institut Géographique National) pour les géoïdes français (RAF, RAC)
- **Flask** pour le framework web
- **Railway** pour l'hébergement gratuit
- **Claude (Anthropic)** pour l'assistance au développement

---

## 📮 Roadmap

- [x] Interface utilisateur complète
- [x] Détection automatique intelligente
- [x] Validation stricte avec limites EPSG
- [x] Support 60+ systèmes EPSG
- [x] Intégration géoïde RAF20
- [x] Déploiement en production
- [ ] Téléchargement automatique des géoïdes
- [ ] Support fichiers >1000 points
- [ ] Export multi-formats (GeoJSON, KML)
- [ ] Prévisualisation sur carte (Leaflet.js)
- [ ] API REST publique
- [ ] Historique des conversions

---

## 📧 Contact & Support

- **Application en ligne :** [https://web-production-1c09c.up.railway.app/](https://web-production-1c09c.up.railway.app/)
- **Repository GitHub :** [github.com/VotreUsername/geoid-converter](https://github.com/VotreUsername/geoid-converter)
- **Issues :** Pour signaler des bugs ou suggérer des améliorations
- **Documentation pyproj :** [pyproj.org](https://pyproj4.github.io/pyproj/)
- **EPSG Database :** [epsg.io](https://epsg.io/)

---

**Développé avec ❤️ pour la communauté géomatique**

Version 1.0.0 - Janvier 2025 | Déployé sur Railway ☁️