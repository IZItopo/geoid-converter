from flask import Flask, render_template, request, jsonify, send_file
from pyproj import Transformer, CRS
import csv
import io
import os
from pathlib import Path

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
GRIDS_FOLDER = 'grids'
Path(UPLOAD_FOLDER).mkdir(exist_ok=True)
Path(GRIDS_FOLDER).mkdir(exist_ok=True)

# Base de données EPSG organisée par région
EPSG_DATABASE = {
    "France métropolitaine": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4171": "RGF93 géographique",
            "4275": "NTF (Paris) - ancien système",
            "4807": "NTF (Greenwich)",
        },
        "Lambert": {
            "2154": "Lambert 93 (RGF93)",
            "27571": "Lambert I Nord (NTF)",
            "27572": "Lambert II Centre (NTF)",
            "27573": "Lambert III Sud (NTF)",
            "27561": "Lambert I Carto (NTF)",
            "27562": "Lambert II Carto (NTF)",
            "27563": "Lambert III Carto (NTF)",
        },
        "Coniques Conformes (CC)": {
            "3942": "CC42 (zone 1) - Corse du Sud",
            "3943": "CC43 (zone 2) - Sud-Est",
            "3944": "CC44 (zone 3) - Sud-Ouest & Centre-Sud",
            "3945": "CC45 (zone 4) - Centre-Est",
            "3946": "CC46 (zone 5) - Lyon/Rhône-Alpes",
            "3947": "CC47 (zone 6) - Centre-Ouest",
            "3948": "CC48 (zone 7) - Nord-Ouest",
            "3949": "CC49 (zone 8) - Nord-Est",
            "3950": "CC50 (zone 9) - Grand Nord",
        },
        "UTM": {
            "32630": "UTM 30N (WGS84) - Ouest France",
            "32631": "UTM 31N (WGS84) - Centre/Est France",
            "32632": "UTM 32N (WGS84) - Est France",
        },
    },
    "Corse": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4171": "RGF93 géographique",
        },
        "Lambert": {
            "27574": "Lambert IV Corse (NTF)",
            "27564": "Lambert IV Carto Corse (NTF)",
        },
        "Coniques Conformes": {
            "3942": "CC42 (zone 1) - Corse du Sud",
            "3950": "CC50 (zone 9) - Haute-Corse",
        },
    },
    "Guadeloupe": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4559": "RRAF 1991 géographique",
            "4558": "RGAF09 géographique",
        },
        "Projetés": {
            "2969": "RGAF09 / UTM zone 20N",
            "2970": "RGAF09 / UTM zone 20N + Guadeloupe 1988",
            "2989": "RGAF09 / UTM zone 20N + NGG1977",
        },
    },
    "Martinique": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4559": "RRAF 1991 géographique",
            "4558": "RGAF09 géographique",
        },
        "Projetés": {
            "2973": "RGAF09 / UTM zone 20N",
            "2987": "RGAF09 / UTM zone 20N + Martinique 1987",
        },
    },
    "Guyane": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4624": "RGFG95 géographique",
        },
        "Projetés": {
            "2972": "RGFG95 / UTM zone 22N",
            "3312": "CSG67 / UTM zone 22N",
        },
    },
    "Réunion": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4627": "RGR92 géographique",
        },
        "Projetés": {
            "2975": "RGR92 / UTM zone 40S",
            "2990": "RGR92 / UTM zone 40S + Réunion 1989",
        },
    },
    "Mayotte": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4470": "RGM04 géographique",
        },
        "Projetés": {
            "4471": "RGM04 / UTM zone 38S",
        },
    },
    "Saint-Pierre-et-Miquelon": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4467": "RGSPM06 géographique",
        },
        "Projetés": {
            "4467": "RGSPM06 / UTM zone 21N",
        },
    },
    "Suisse": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4149": "CH1903 géographique",
        },
        "Projetés": {
            "2056": "CH1903+ / LV95 (officiel)",
            "21781": "CH1903 / LV03 (ancien)",
        },
    },
    "Belgique": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
            "4313": "BD72 géographique",
        },
        "Projetés": {
            "31370": "BD72 / Lambert 72",
            "3812": "ETRS89 / Belgian Lambert 2008",
        },
    },
    "Luxembourg": {
        "Géographiques": {
            "4326": "WGS 84 (GPS mondial)",
        },
        "Projetés": {
            "2169": "LUREF / Luxembourg TM",
        },
    },
    "International": {
        "Géographiques": {
            "4326": "WGS 84 (GPS)",
            "4979": "WGS 84 (3D)",
            "4258": "ETRS89 (Europe)",
        },
        "Web / Cartographie": {
            "3857": "Web Mercator (Google Maps, OSM)",
            "3395": "World Mercator (WGS 84)",
        },
        "UTM Nord (exemples)": {
            "32628": "UTM 28N (Açores, Madère)",
            "32629": "UTM 29N (Portugal, Espagne Ouest)",
            "32630": "UTM 30N (Espagne, France Ouest)",
            "32631": "UTM 31N (France, Italie Nord)",
            "32632": "UTM 32N (Italie, Allemagne)",
            "32633": "UTM 33N (Europe Est)",
        },
    },
}

# Liste des géoïdes disponibles
GEOID_LIST = {
    "none": "Aucun (conserver h ellipsoïdale)",
    "RAF20": "RAF20 - France métropole (2022)",
    "RAF18b": "RAF18b - France métropole (2021)",
    "RAF18": "RAF18 - France métropole (2020)",
    "RAF09": "RAF09 - France métropole (2009)",
    "RAC23": "RAC23 - Corse (2023)",
}


def get_all_epsg_flat():
    """Retourne tous les EPSG dans une liste plate pour les suggestions"""
    all_epsg = {}
    for region, categories in EPSG_DATABASE.items():
        for category, systems in categories.items():
            all_epsg.update(systems)
    return all_epsg


def detect_region_from_coords(lat, lon):
    """Détecte la région basée sur les coordonnées"""
    # France métropolitaine
    if 41 <= lat <= 51 and -5 <= lon <= 10:
        # Corse
        if 41 <= lat <= 43 and 8 <= lon <= 10:
            return "Corse"
        return "France métropolitaine"
    
    # Guadeloupe
    if 15.8 <= lat <= 16.5 and -61.9 <= lon <= -61.0:
        return "Guadeloupe"
    
    # Martinique
    if 14.3 <= lat <= 14.9 and -61.3 <= lon <= -60.7:
        return "Martinique"
    
    # Guyane
    if 2.1 <= lat <= 5.8 and -54.6 <= lon <= -51.6:
        return "Guyane"
    
    # Réunion
    if -21.4 <= lat <= -20.9 and 55.2 <= lon <= 55.8:
        return "Réunion"
    
    # Mayotte
    if -13.0 <= lat <= -12.6 and 45.0 <= lon <= 45.3:
        return "Mayotte"
    
    # Suisse
    if 45.8 <= lat <= 47.8 and 5.9 <= lon <= 10.5:
        return "Suisse"
    
    # Belgique
    if 49.5 <= lat <= 51.5 and 2.5 <= lon <= 6.4:
        return "Belgique"
    
    return "International"


def check_geoid_availability(geoid_name):
    """Vérifie si un géoïde est installé"""
    if geoid_name == "none":
        return True
    
    geoid_filename = f"fr_ign_{geoid_name}.tif"
    geoid_path = Path(GRIDS_FOLDER) / geoid_filename
    return geoid_path.exists()


def detect_coordinate_format(first_row):
    """Détecte le format des coordonnées (Lat/Long ou Long/Lat)"""
    try:
        values = [float(v) for v in first_row[1:4] if v]
        
        if -90 <= values[0] <= 90 and -180 <= values[1] <= 180:
            return "lat_long_h"
        elif -180 <= values[0] <= 180 and -90 <= values[1] <= 90:
            return "long_lat_h"
        else:
            return "x_y_z"
    except:
        return "unknown"


def suggest_source_epsg(coordinates):
    """Suggère l'EPSG source basé sur les coordonnées"""
    try:
        lat_or_y = float(coordinates[0])
        lon_or_x = float(coordinates[1])
        
        if -90 <= lat_or_y <= 90 and -180 <= lon_or_x <= 180:
            return "4326"
        
        if -90 <= lon_or_x <= 90 and -180 <= lat_or_y <= 180:
            return "4326"
        
        if 100000 <= lon_or_x <= 1300000 and 6000000 <= lat_or_y <= 7200000:
            return "2154"
        
        return "4326"
    except:
        return "4326"


def suggest_target_epsg(lat, lon):
    """Suggère les EPSG cibles pertinents basés sur la position"""
    suggestions = []
    
    if 41 <= lat <= 51 and -5 <= lon <= 10:
        suggestions.extend([
            ("2154", "Lambert 93", "recommandé"),
            ("3946", "CC46 (Lyon/Rhône-Alpes)", ""),
            ("3945", "CC45 (Centre-Est)", ""),
            ("3947", "CC47 (Sud-Est)", ""),
        ])
    
    if 41 <= lat <= 43 and 8 <= lon <= 10:
        suggestions.append(("3950", "CC50 (Corse)", ""))
    
    if lon < 0:
        suggestions.append(("32630", "UTM 30N", ""))
    elif lon < 6:
        suggestions.append(("32631", "UTM 31N", ""))
    else:
        suggestions.append(("32632", "UTM 32N", ""))
    
    return suggestions if suggestions else [("2154", "Lambert 93", "")]


def get_compatible_epsg(lat, lon):
    """Retourne la liste des EPSG compatibles pour une position donnée"""
    compatible = []
    
    # Systèmes universels toujours compatibles
    universal_systems = ["4326", "4979", "4258", "3857", "3395"]
    
    # France métropolitaine (hors Corse)
    if 42 <= lat <= 51 and -5 <= lon <= 8:
        # Lambert France métro
        compatible.extend(["2154", "27571", "27572", "27573", "27561", "27562", "27563"])
        # RGF93 géographique
        compatible.extend(["4171", "4275", "4807"])
        
        # Coniques Conformes selon latitude
        if 42 <= lat < 43.5:  # Sud
            compatible.extend(["3943", "3944"])  # CC43, CC44
        if 43 <= lat < 45:    # Centre-Sud
            compatible.extend(["3944", "3945"])  # CC44, CC45
        if 44.5 <= lat < 46.5:  # Centre
            compatible.extend(["3945", "3946", "3947"])  # CC45, CC46, CC47
        if 46 <= lat < 48:    # Centre-Nord
            compatible.extend(["3947", "3948"])  # CC47, CC48
        if 47.5 <= lat <= 51:  # Nord
            compatible.extend(["3948", "3949", "3950"])  # CC48, CC49, CC50
        
        # UTM selon longitude
        if lon < 0:
            compatible.append("32630")  # UTM 30N
        if -1 <= lon < 6:
            compatible.append("32631")  # UTM 31N
        if lon >= 5:
            compatible.append("32632")  # UTM 32N
    
    # Corse
    elif 41 <= lat <= 43.5 and 8 <= lon <= 10:
        compatible.extend(["2154", "27574", "27564"])  # Lambert + Lambert Corse
        compatible.extend(["4171", "4326"])
        compatible.extend(["3942", "3950"])  # CC42, CC50
        compatible.append("32632")  # UTM 32N
    
    # Guadeloupe
    elif 15.8 <= lat <= 16.5 and -61.9 <= lon <= -61.0:
        compatible.extend(["4559", "4558", "2969", "2970", "2989"])
    
    # Martinique
    elif 14.3 <= lat <= 14.9 and -61.3 <= lon <= -60.7:
        compatible.extend(["4559", "4558", "2973", "2987"])
    
    # Guyane
    elif 2.1 <= lat <= 5.8 and -54.6 <= lon <= -51.6:
        compatible.extend(["4624", "2972", "3312"])
    
    # Réunion
    elif -21.4 <= lat <= -20.9 and 55.2 <= lon <= 55.8:
        compatible.extend(["4627", "2975", "2990"])
    
    # Mayotte
    elif -13.0 <= lat <= -12.6 and 45.0 <= lon <= 45.3:
        compatible.extend(["4470", "4471"])
    
    # Suisse
    elif 45.8 <= lat <= 47.8 and 5.9 <= lon <= 10.5:
        compatible.extend(["4149", "2056", "21781"])
    
    # Belgique
    elif 49.5 <= lat <= 51.5 and 2.5 <= lon <= 6.4:
        compatible.extend(["4313", "31370", "3812"])
    
    # Luxembourg
    elif 49.4 <= lat <= 50.2 and 5.7 <= lon <= 6.5:
        compatible.append("2169")
    
    # Ajouter les systèmes universels
    compatible.extend(universal_systems)
    
    # Dédupliquer
    return list(set(compatible))


def validate_epsg_compatibility(source_epsg, target_epsg, lat, lon):
    """Valide la compatibilité des EPSG avec la position"""
    compatible_systems = get_compatible_epsg(lat, lon)
    
    errors = []
    
    if source_epsg not in compatible_systems:
        errors.append({
            'type': 'source',
            'epsg': source_epsg,
            'message': f'Le système source EPSG:{source_epsg} n\'est pas compatible avec votre zone géographique'
        })
    
    if target_epsg not in compatible_systems:
        errors.append({
            'type': 'target',
            'epsg': target_epsg,
            'message': f'Le système cible EPSG:{target_epsg} n\'est pas compatible avec votre zone géographique'
        })
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'compatible_systems': compatible_systems
    }


# 🆕 ROUTE PAGE DE PRÉSENTATION
@app.route('/')
def landing():
    """Page de présentation TCract"""
    return render_template('landing.html')


# Route principale du convertisseur
@app.route('/converter')
def index():
    """Page du convertisseur de coordonnées"""
    return render_template('index.html', epsg_database=EPSG_DATABASE, geoid_list=GEOID_LIST)


@app.route('/api/analyze-file', methods=['POST'])
def analyze_file():
    """Analyse le fichier CSV uploadé"""
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400
    
    try:
        content = file.read().decode('utf-8')
        lines = content.strip().split('\n')
        
        if len(lines) < 1:
            return jsonify({'error': 'Fichier vide'}), 400
        
        first_line = lines[0]
        delimiter = ',' if ',' in first_line else ';' if ';' in first_line else '\t'
        
        reader = csv.reader(io.StringIO(content), delimiter=delimiter)
        rows = list(reader)
        
        has_header = False
        first_row = rows[0]
        try:
            [float(v) for v in first_row[1:4]]
        except:
            has_header = True
        
        data_start = 1 if has_header else 0
        preview_rows = rows[data_start:min(data_start + 5, len(rows))]
        
        format_detected = detect_coordinate_format(preview_rows[0]) if preview_rows else "unknown"
        suggested_epsg = suggest_source_epsg(preview_rows[0][1:3]) if preview_rows else "4326"
        
        target_suggestions = []
        detected_region = "International"
        compatible_systems = []
        lat, lon = None, None
        
        # Extraire les coordonnées AVANT de les utiliser
        if preview_rows and len(preview_rows[0]) >= 3:
            try:
                if format_detected == "lat_long_h":
                    lat = float(preview_rows[0][1])
                    lon = float(preview_rows[0][2])
                elif format_detected == "long_lat_h":
                    lon = float(preview_rows[0][1])
                    lat = float(preview_rows[0][2])
                
                # Maintenant qu'on a lat/lon, calculer tout
                if lat is not None and lon is not None:
                    detected_region = detect_region_from_coords(lat, lon)
                    target_suggestions = suggest_target_epsg(lat, lon)
                    compatible_systems = get_compatible_epsg(lat, lon)
                    
                    print(f"🔍 DEBUG Server - Coordonnées: {lat}, {lon}")
                    print(f"🔍 DEBUG Server - Région: {detected_region}")
                    print(f"🔍 DEBUG Server - Systèmes compatibles: {len(compatible_systems)} trouvés")
                    print(f"🔍 DEBUG Server - Liste: {compatible_systems[:10]}...")
            except Exception as e:
                print(f"❌ Erreur extraction coordonnées: {e}")
        
        return jsonify({
            'success': True,
            'has_header': has_header,
            'delimiter': delimiter,
            'row_count': len(rows) - (1 if has_header else 0),
            'preview': preview_rows[:5],
            'header': first_row if has_header else None,
            'format_detected': format_detected,
            'suggested_source_epsg': suggested_epsg,
            'suggested_target_epsg': target_suggestions,
            'detected_region': detected_region,
            'compatible_systems': compatible_systems,
            'coordinates': {'lat': lat, 'lon': lon} if lat is not None and lon is not None else None
        })
    
    except Exception as e:
        print(f"❌ Erreur analyse fichier: {e}")
        return jsonify({'error': f'Erreur lors de l\'analyse: {str(e)}'}), 500


@app.route('/api/check-geoid/<geoid_name>')
def check_geoid(geoid_name):
    """Vérifie la disponibilité d'un géoïde"""
    available = check_geoid_availability(geoid_name)
    return jsonify({'available': available})


# 🆕 NOUVELLE ROUTE : Test optimisé de tous les systèmes d'une région
@app.route('/api/test-region-systems', methods=['POST'])
def test_region_systems():
    """Teste tous les systèmes EPSG d'une région pour trouver les compatibles"""
    try:
        data = request.get_json()
        
        x = data.get('x')
        y = data.get('y')
        region = data.get('region')
        
        if not x or not y or not region:
            return jsonify({'error': 'Paramètres manquants'}), 400
        
        if region not in EPSG_DATABASE:
            return jsonify({'error': f'Région inconnue: {region}'}), 400
        
        print(f"🔍 Test de tous les systèmes de la région : {region}")
        print(f"   Coordonnées : X={x}, Y={y}")
        
        compatible_systems = []
        region_data = EPSG_DATABASE[region]
        total_systems = sum(len(systems) for systems in region_data.values())
        
        print(f"   Total de systèmes à tester : {total_systems}")
        
        tested = 0
        for category, systems in region_data.items():
            for epsg_code, epsg_name in systems.items():
                tested += 1
                try:
                    # Récupérer le CRS
                    source_crs = CRS.from_epsg(int(epsg_code))
                    area_of_use = source_crs.area_of_use
                    
                    # Transformer vers WGS84
                    transformer = Transformer.from_crs(
                        f"EPSG:{epsg_code}",
                        "EPSG:4326",
                        always_xy=True
                    )
                    
                    lon, lat = transformer.transform(x, y)
                    
                    # Vérifier si la position est dans les limites
                    if area_of_use:
                        west, south, east, north = area_of_use.west, area_of_use.south, area_of_use.east, area_of_use.north
                        tolerance = 0.1
                        
                        if (west - tolerance <= lon <= east + tolerance and 
                            south - tolerance <= lat <= north + tolerance):
                            
                            compatible_systems.append({
                                'code': epsg_code,
                                'name': epsg_name,
                                'category': category,
                                'position': f"{lat:.4f}°N, {lon:.4f}°E"
                            })
                            
                            print(f"   ✅ EPSG:{epsg_code} - {epsg_name} - COMPATIBLE")
                        else:
                            print(f"   ❌ EPSG:{epsg_code} - Hors limites")
                    else:
                        print(f"   ⚠️ EPSG:{epsg_code} - Pas de zone définie")
                        
                except Exception as e:
                    print(f"   ⚠️ EPSG:{epsg_code} - Erreur: {e}")
                    continue
        
        print(f"✅ Test terminé : {len(compatible_systems)}/{total_systems} systèmes compatibles")
        
        return jsonify({
            'success': True,
            'compatible_systems': compatible_systems,
            'total_tested': total_systems,
            'total_compatible': len(compatible_systems)
        })
        
    except Exception as e:
        print(f"❌ Erreur test systèmes région: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erreur lors du test: {str(e)}'}), 500


@app.route('/api/reverse-transform', methods=['POST'])
def reverse_transform():
    """Transforme des coordonnées projetées vers WGS84 pour détection de zone"""
    try:
        data = request.get_json()
        
        x = data.get('x')
        y = data.get('y')
        source_epsg = data.get('source_epsg')
        selected_region = data.get('selected_region')
        
        if not x or not y or not source_epsg:
            return jsonify({'error': 'Paramètres manquants'}), 400
        
        # Récupérer les informations du CRS source
        try:
            source_crs = CRS.from_epsg(int(source_epsg))
        except Exception as e:
            return jsonify({'error': f'EPSG:{source_epsg} invalide'}), 400
        
        # Vérifier si le CRS a une zone d'utilisation définie
        area_of_use = source_crs.area_of_use
        
        # Transformer vers WGS84
        transformer = Transformer.from_crs(
            f"EPSG:{source_epsg}",
            "EPSG:4326",
            always_xy=True
        )
        
        lon, lat = transformer.transform(x, y)
        
        print(f"🔄 Conversion inverse: EPSG:{source_epsg} ({x}, {y}) → WGS84 ({lat}, {lon})")
        
        # Validation : vérifier si la position est dans les limites du système
        if area_of_use:
            west, south, east, north = area_of_use.west, area_of_use.south, area_of_use.east, area_of_use.north
            
            print(f"🔍 Limites EPSG:{source_epsg}: {south}°N à {north}°N, {west}°E à {east}°E")
            print(f"🔍 Position calculée: {lat}°N, {lon}°E")
            
            # Vérifier si la position est dans les limites (avec une petite marge de tolérance)
            tolerance = 0.1
            
            if not (west - tolerance <= lon <= east + tolerance and 
                    south - tolerance <= lat <= north + tolerance):
                
                print(f"❌ Position hors limites !")
                
                error_msg = f"""❌ Système incompatible avec vos coordonnées

Limites de EPSG:{source_epsg} ({source_crs.name}) :
• Latitude : {south:.2f}°N à {north:.2f}°N
• Longitude : {west:.2f}°E à {east:.2f}°E

→ Vos coordonnées sont en dehors de la zone couverte par ce système.

💡 Utilisez le bouton "Détection automatique" pour trouver les systèmes compatibles."""
                
                return jsonify({
                    'error': error_msg,
                    'validation_failed': True,
                    'calculated_position': {'lat': lat, 'lon': lon},
                    'system_bounds': {
                        'west': west,
                        'east': east,
                        'south': south,
                        'north': north
                    }
                }), 400
        
        # Si validation OK, continuer normalement
        detected_region = detect_region_from_coords(lat, lon)
        compatible_systems = get_compatible_epsg(lat, lon)
        suggested_target_epsg = suggest_target_epsg(lat, lon)
        
        print(f"✅ Validation OK - Position dans les limites")
        
        return jsonify({
            'success': True,
            'coordinates': {'lat': lat, 'lon': lon},
            'detected_region': detected_region,
            'compatible_systems': compatible_systems,
            'suggested_target_epsg': suggested_target_epsg,
            'system_info': {
                'name': source_crs.name,
                'area': area_of_use.name if area_of_use else None
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur conversion inverse: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erreur lors de la transformation: {str(e)}'}), 500


@app.route('/api/convert', methods=['POST'])
def convert_coordinates():
    """Convertit les coordonnées"""
    try:
        data = request.get_json()
        
        csv_content = data.get('csv_content')
        source_epsg = data.get('source_epsg')
        target_epsg = data.get('target_epsg')
        geoid = data.get('geoid', 'none')
        has_header = data.get('has_header', False)
        delimiter = data.get('delimiter', ',')
        coord_format = data.get('coord_format', 'lat_long_h')
        coordinates = data.get('coordinates')
        
        # Validation de compatibilité EPSG
        if coordinates and coordinates.get('lat') and coordinates.get('lon'):
            lat, lon = coordinates['lat'], coordinates['lon']
            validation = validate_epsg_compatibility(source_epsg, target_epsg, lat, lon)
            
            if not validation['valid']:
                # Construire le message d'erreur détaillé
                error_msg = "❌ Conversion impossible\n\n"
                
                if coordinates:
                    error_msg += f"Vos coordonnées sont situées à : {lat:.4f}°N, {lon:.4f}°E\n\n"
                
                for error in validation['errors']:
                    error_msg += f"• {error['message']}\n"
                
                # Suggérer des systèmes compatibles
                compatible_names = []
                all_epsg_flat = get_all_epsg_flat()
                for epsg_code in validation['compatible_systems'][:5]:
                    if epsg_code in all_epsg_flat:
                        compatible_names.append(f"EPSG:{epsg_code} - {all_epsg_flat[epsg_code]}")
                
                if compatible_names:
                    error_msg += "\n✅ Systèmes compatibles pour votre zone :\n"
                    error_msg += "\n".join([f"• {name}" for name in compatible_names])
                
                return jsonify({'error': error_msg}), 400
        
        if geoid != 'none' and not check_geoid_availability(geoid):
            return jsonify({
                'error': f'Le géoïde {geoid} n\'est pas installé. Veuillez le télécharger d\'abord.'
            }), 400
        
        reader = csv.reader(io.StringIO(csv_content), delimiter=delimiter)
        rows = list(reader)
        
        data_start = 1 if has_header else 0
        data_rows = rows[data_start:]
        
        # 🆕 Créer le transformer avec ou sans géoïde
        if geoid != 'none':
            # Conversion avec géoïde (h → H)
            geoid_filename = f"fr_ign_{geoid}.tif"
            geoid_path = Path(GRIDS_FOLDER) / geoid_filename
            
            # Vérifier que le fichier existe
            if not geoid_path.exists():
                return jsonify({
                    'error': f'Le géoïde {geoid} n\'est pas installé dans le dossier grids/. Veuillez le télécharger.'
                }), 400
            
            print(f"🗺️ Utilisation du géoïde : {geoid}")
            print(f"📁 Chemin relatif : {geoid_path}")
            print(f"📁 Chemin absolu : {geoid_path.absolute()}")
            
            # 🔧 Configuration PROJ pour trouver les grilles
            # Définir le répertoire des grilles pour PROJ
            grids_absolute_path = str(Path(GRIDS_FOLDER).absolute())
            
            # Sur serveur Unix/Linux, utiliser : au lieu de ; pour séparer les chemins
            # Ajouter le dossier grids/ au chemin de recherche PROJ
            current_proj_lib = os.environ.get('PROJ_LIB', '')
            if current_proj_lib:
                # Ajouter notre dossier au chemin existant
                separator = ':' if os.name != 'nt' else ';'
                os.environ['PROJ_LIB'] = f"{grids_absolute_path}{separator}{current_proj_lib}"
            else:
                os.environ['PROJ_LIB'] = grids_absolute_path
            
            print(f"🔧 PROJ_LIB défini sur : {os.environ['PROJ_LIB']}")
            
            # Alternative : utiliser pyproj.datadir pour ajouter le chemin
            try:
                import pyproj.datadir
                pyproj.datadir.append_data_dir(grids_absolute_path)
                print(f"🔧 Chemin ajouté à pyproj.datadir")
            except Exception as e:
                print(f"⚠️ Impossible d'ajouter à pyproj.datadir: {e}")
            
            # Créer un pipeline avec vgridshift
            try:
                # Si source n'est pas géographique, convertir d'abord en WGS84
                if source_epsg not in ['4326', '4171', '4275', '4807']:
                    # Source projeté → WGS84 → géoïde → Target
                    transformer_to_wgs84 = Transformer.from_crs(
                        f"EPSG:{source_epsg}",
                        "EPSG:4326",
                        always_xy=True
                    )
                    transformer_from_wgs84 = Transformer.from_crs(
                        "EPSG:4326",
                        f"EPSG:{target_epsg}",
                        always_xy=True
                    )
                    use_intermediate = True
                else:
                    # Source géographique → direct
                    transformer = Transformer.from_crs(
                        f"EPSG:{source_epsg}",
                        f"EPSG:{target_epsg}",
                        always_xy=True
                    )
                    use_intermediate = False
                
                # Créer le transformer pour le géoïde
                # Pipeline simplifié : utiliser juste le nom du fichier
                geoid_transformer = Transformer.from_pipeline(
                    f"+proj=pipeline "
                    f"+step +proj=axisswap +order=2,1 "
                    f"+step +proj=unitconvert +xy_in=deg +xy_out=rad "
                    f"+step +proj=vgridshift +grids={geoid_filename} +multiplier=-1 "
                    f"+step +proj=unitconvert +xy_in=rad +xy_out=deg "
                    f"+step +proj=axisswap +order=2,1"
                )
                
                print(f"✅ Pipeline géoïde créé avec succès")
                
            except Exception as e:
                print(f"❌ Erreur création pipeline géoïde: {e}")
                print(f"💡 Vérifiez que le fichier {geoid_filename} est bien dans {grids_absolute_path}")
                
                # Tenter avec le chemin absolu comme fallback
                try:
                    print(f"🔄 Tentative avec chemin absolu...")
                    geoid_transformer = Transformer.from_pipeline(
                        f"+proj=pipeline "
                        f"+step +proj=axisswap +order=2,1 "
                        f"+step +proj=unitconvert +xy_in=deg +xy_out=rad "
                        f"+step +proj=vgridshift +grids={str(geoid_path.absolute())} +multiplier=-1 "
                        f"+step +proj=unitconvert +xy_in=rad +xy_out=deg "
                        f"+step +proj=axisswap +order=2,1"
                    )
                    print(f"✅ Pipeline créé avec chemin absolu")
                except Exception as e2:
                    print(f"❌ Échec fallback: {e2}")
                    return jsonify({
                        'error': f'Impossible de charger le géoïde {geoid}.\n\n'
                                f'Erreur: {str(e)}\n\n'
                                f'Vérifiez que le fichier {geoid_filename} est bien dans le dossier grids/'
                    }), 500
        else:
            # Conversion sans géoïde (simple transformation EPSG)
            transformer = Transformer.from_crs(
                f"EPSG:{source_epsg}",
                f"EPSG:{target_epsg}",
                always_xy=True
            )
            use_intermediate = False
        
        results = []
        for row in data_rows:
            try:
                matricule = row[0]
                
                if coord_format == "lat_long_h":
                    lat, lon, h = float(row[1]), float(row[2]), float(row[3]) if len(row) > 3 else 0
                    x_in, y_in = lon, lat
                elif coord_format == "long_lat_h":
                    lon, lat, h = float(row[1]), float(row[2]), float(row[3]) if len(row) > 3 else 0
                    x_in, y_in = lon, lat
                else:
                    x_in, y_in, h = float(row[1]), float(row[2]), float(row[3]) if len(row) > 3 else 0
                
                # Transformation des coordonnées
                if geoid != 'none':
                    # Avec géoïde
                    if use_intermediate:
                        # Source projeté → WGS84
                        lon_wgs84, lat_wgs84 = transformer_to_wgs84.transform(x_in, y_in)
                    else:
                        lon_wgs84, lat_wgs84 = x_in, y_in
                    
                    # Application du géoïde sur WGS84 (lat, lon, h → lat, lon, H)
                    lat_geoid, lon_geoid, H = geoid_transformer.transform(lat_wgs84, lon_wgs84, h)
                    
                    if use_intermediate:
                        # WGS84 → Target
                        x_out, y_out = transformer_from_wgs84.transform(lon_geoid, lat_geoid)
                    else:
                        # WGS84 → Target
                        x_out, y_out = transformer.transform(lon_geoid, lat_geoid)
                    
                    z_out = H  # Altitude NGF
                else:
                    # Sans géoïde (simple transformation)
                    x_out, y_out = transformer.transform(x_in, y_in)
                    z_out = h  # Hauteur ellipsoïdale conservée
                
                results.append({
                    'M': matricule,
                    'X': round(x_out, 3),
                    'Y': round(y_out, 3),
                    'Z': round(z_out, 3)
                })
            except Exception as e:
                print(f"❌ Erreur conversion ligne {matricule}: {e}")
                results.append({
                    'M': row[0] if row else 'ERROR',
                    'X': 'ERROR',
                    'Y': 'ERROR',
                    'Z': 'ERROR',
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results
        })
    
    except Exception as e:
        print(f"❌ Erreur générale conversion: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erreur de conversion: {str(e)}'}), 500


@app.route('/api/export', methods=['POST'])
def export_results():
    """Exporte les résultats en CSV"""
    try:
        data = request.get_json()
        results = data.get('results', [])
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['M', 'X', 'Y', 'Z'])
        
        for row in results:
            writer.writerow([row['M'], row['X'], row['Y'], row['Z']])
        
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='coordonnees_converties.csv'
        )
    
    except Exception as e:
        return jsonify({'error': f'Erreur d\'export: {str(e)}'}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Convertisseur de Coordonnées GNSS RTK - TCract")
    print("=" * 60)
    print("✅ Application démarrée avec succès!")
    
    # Détection de l'environnement (local ou production)
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    if debug:
        print(f"🌐 Mode DÉVELOPPEMENT")
        print(f"🌐 Page de présentation: http://localhost:{port}")
        print(f"🌐 Convertisseur: http://localhost:{port}/converter")
    else:
        print(f"🌐 Mode PRODUCTION")
        print(f"🌐 Port: {port}")
    
    print("=" * 60)
    app.run(debug=debug, host='0.0.0.0', port=port)