# 🌍 Convertisseur de Coordonnées GNSS RTK

Application web pour la conversion de coordonnées GNSS entre différents systèmes de référence (EPSG) avec support des géoïdes.

---

## 📋 Prérequis

- **Python 3.8 ou supérieur** (vous l'avez déjà ✅)
- Un navigateur web moderne

---

## 🚀 Installation et Lancement

### Étape 1 : Créer la structure des dossiers

Créez un dossier pour le projet, par exemple `geoid-converter`, et créez la structure suivante :

```
geoid-converter/
│
├── app.py
├── requirements.txt
├── README.md
│
├── templates/
│   └── index.html
│
├── static/
│   ├── style.css
│   └── script.js
│
├── grids/           (créez ce dossier vide)
└── uploads/         (sera créé automatiquement)
```

### Étape 2 : Installer les dépendances

Ouvrez un terminal (cmd ou PowerShell sur Windows) dans le dossier du projet, puis :

```bash
pip install -r requirements.txt
```

⏱️ Cela prend environ 1-2 minutes.

### Étape 3 : Lancer l'application

```bash
python app.py
```

Vous devriez voir :

```
============================================================
🚀 Convertisseur de Coordonnées GNSS RTK
============================================================
✅ Application démarrée avec succès!
🌐 Ouvrez votre navigateur sur: http://localhost:5000
============================================================
```

### Étape 4 : Utiliser l'application

1. Ouvrez votre navigateur
2. Allez sur `http://localhost:5000`
3. L'interface devrait s'afficher ! 🎉

---

## 📊 Utilisation

### Format du fichier CSV d'entrée

Votre fichier CSV doit contenir au minimum :
- **Colonne 1** : Matricule (identifiant du point)
- **Colonne 2** : Latitude ou X
- **Colonne 3** : Longitude ou Y
- **Colonne 4** : Hauteur ellipsoïdale (h) ou Z

**Exemples de formats acceptés :**

```csv
Matricule,Latitude,Longitude,h
P001,45.7640,4.8357,245.123
P002,45.7650,4.8360,248.456
```

ou

```csv
M,Long,Lat,h
P001,4.8357,45.7640,245.123
P002,4.8360,45.7650,248.456
```

### Workflow

1. **Importez votre CSV** - Glissez-déposez ou parcourez
2. **Vérifiez l'aperçu** - Les 5 premières lignes s'affichent
3. **Choisissez le format** - L'application détecte automatiquement, mais vous pouvez corriger
4. **Sélectionnez l'EPSG source** - Détection automatique proposée
5. **Sélectionnez l'EPSG cible** - Suggestions basées sur votre zone
6. **Choisissez le géoïde** - Pour convertir h → H (altitude NGF)
7. **Lancez la conversion** - Bouton vert
8. **Téléchargez le résultat** - Format : M, X, Y, Z

---

## 🌐 Géoïdes

### Géoïdes disponibles (à télécharger)

Pour utiliser les géoïdes, vous devez télécharger les fichiers depuis le CDN PROJ :

**France métropole :**
- **RAF20** (recommandé) : https://cdn.proj.org/fr_ign_RAF20.tif
- **RAF18b** : https://cdn.proj.org/fr_ign_RAF18b.tif
- **RAF18** : https://cdn.proj.org/fr_ign_RAF18.tif
- **RAF09** : https://cdn.proj.org/fr_ign_RAF09.tif

**Corse :**
- **RAC23** : https://cdn.proj.org/fr_ign_RAC23.tif

### Installation des géoïdes

1. Téléchargez le fichier `.tif` souhaité
2. Placez-le dans le dossier `grids/` de votre projet
3. Relancez l'application
4. Le géoïde sera automatiquement détecté ✅

**Note :** Pour l'instant, les géoïdes ne sont pas encore complètement intégrés dans le code de conversion (fonctionnalité à venir). Mais l'interface les détecte déjà !

---

## 🎨 Systèmes EPSG supportés

### Géographiques
- **EPSG:4326** - WGS 84 (GPS)
- **EPSG:4171** - RGF93 géographique
- **EPSG:4275** - NTF (Paris)

### Lambert
- **EPSG:2154** - Lambert 93 (RGF93)
- **EPSG:27571-27574** - Lambert I à IV (NTF)

### Coniques Conformes (CC)
- **EPSG:3942-3950** - CC42 à CC50 (zones 1 à 9)

### UTM
- **EPSG:32630-32632** - UTM 30N, 31N, 32N

---

## 🔧 Dépannage

### "Module not found: Flask"
→ Relancez `pip install -r requirements.txt`

### "Port 5000 already in use"
→ Changez le port dans `app.py` : ligne `app.run(port=5001)`

### L'interface ne s'affiche pas
→ Vérifiez que les dossiers `templates/` et `static/` existent bien

### Erreur de conversion
→ Vérifiez le format de votre CSV et les EPSG sélectionnés

---

## 📝 TODO / Améliorations futures

- [x] Interface utilisateur complète
- [x] Détection automatique du format
- [x] Suggestions EPSG intelligentes
- [ ] Intégration complète des géoïdes dans la conversion
- [ ] Téléchargement automatique des géoïdes depuis l'interface
- [ ] Support de fichiers plus volumineux (> 1000 points)
- [ ] Export en différents formats (GeoJSON, KML, etc.)

---

## 📧 Support

En cas de problème, vérifiez :
1. La version de Python : `python --version` (doit être ≥ 3.8)
2. Les dépendances installées : `pip list`
3. Les messages d'erreur dans le terminal

---

## 📜 Licence

Application développée avec Claude (Anthropic) pour la conversion de coordonnées GNSS.

---

**Bon courage ! 🚀**