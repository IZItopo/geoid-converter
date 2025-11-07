// Variables globales
let uploadedFile = null;
let fileAnalysis = null;
let convertedResults = null;

// Éléments DOM
const fileInput = document.getElementById('fileInput');
const fileUploadZone = document.getElementById('fileUploadZone');
const filePreview = document.getElementById('filePreview');
const previewContent = document.getElementById('previewContent');
const fileInfo = document.getElementById('fileInfo');
const formatSelector = document.getElementById('formatSelector');

const regionSource = document.getElementById('regionSource');
const sourceEpsg = document.getElementById('sourceEpsg');

const regionTarget = document.getElementById('regionTarget');
const targetEpsg = document.getElementById('targetEpsg');

const geoidSelect = document.getElementById('geoidSelect');
const btnConvert = document.getElementById('btnConvert');
const btnExport = document.getElementById('btnExport');
const btnReset = document.getElementById('btnReset');
const btnValidateSource = document.getElementById('btnValidateSource');
const btnAutoDetect = document.getElementById('btnAutoDetect');

// Variable pour traquer la validation
let isSourceValidated = false;
let validatedSourceEpsg = null;

// Gestion du drag & drop
fileUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadZone.classList.add('dragover');
});

fileUploadZone.addEventListener('dragleave', () => {
    fileUploadZone.classList.remove('dragover');
});

fileUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

// 🆕 ÉCOUTEUR sur changement de format - UTILISER DELEGATION D'ÉVÉNEMENTS
document.addEventListener('change', (e) => {
    if (e.target && e.target.name === 'coordFormat' && fileAnalysis) {
        console.log('🔄 Changement de format détecté');
        recalculateFromFormatChange();
    }
});

// 🆕 FONCTION : Recalculer quand l'utilisateur change le format manuellement
async function recalculateFromFormatChange() {
    const selectedFormat = document.querySelector('input[name="coordFormat"]:checked').value;
    
    console.log('🔄 Recalcul après changement de format:', selectedFormat);
    console.log('📊 Données preview disponibles:', fileAnalysis.preview);
    
    // Mettre à jour le format dans fileAnalysis
    fileAnalysis.format_detected = selectedFormat;
    
    // 🆕 RAFRAÎCHIR L'APERÇU avec les nouveaux en-têtes
    updatePreviewHeaders(selectedFormat);
    
    // Recalculer les coordonnées selon le nouveau format
    if (fileAnalysis.preview && fileAnalysis.preview.length > 0) {
        try {
            let lat, lon;
            
            if (selectedFormat === 'lat_long_h') {
                lat = parseFloat(fileAnalysis.preview[0][1]);
                lon = parseFloat(fileAnalysis.preview[0][2]);
                console.log(`➡️ Format Lat/Long: lat=${lat}, lon=${lon}`);
            } else if (selectedFormat === 'long_lat_h') {
                lon = parseFloat(fileAnalysis.preview[0][1]);
                lat = parseFloat(fileAnalysis.preview[0][2]);
                console.log(`➡️ Format Long/Lat: lon=${lon}, lat=${lat}`);
            } else {
                // Format projeté - on ne peut pas recalculer automatiquement
                console.log('⚠️ Format projeté - pas de recalcul automatique');
                
                // Réinitialiser la validation si elle était faite
                if (isSourceValidated) {
                    resetSourceValidation();
                    document.getElementById('detectionInfoSource').innerHTML = `
                        <div class="info-badge warning" style="margin-bottom: 15px;">
                            ⚠️ Format changé en coordonnées projetées - Veuillez valider à nouveau le système source
                        </div>
                    `;
                }
                
                // Masquer les étapes suivantes si validation était active
                document.getElementById('step3').style.display = 'none';
                document.getElementById('step4').style.display = 'none';
                document.getElementById('step5').style.display = 'none';
                
                // Afficher les contrôles pour coordonnées projetées
                document.getElementById('validateSourceContainer').style.display = 'block';
                document.getElementById('autoDetectContainer').style.display = regionSource.value ? 'block' : 'none';
                
                // Déverrouiller région et changer les options
                regionSource.disabled = false;
                const currentRegion = regionSource.value;
                if (currentRegion) {
                    populateEpsgForRegion(sourceEpsg, currentRegion, [], 'projected');
                }
                
                return;
            }
            
            // Vérifier que lat/lon sont valides
            if (isNaN(lat) || isNaN(lon)) {
                console.error('❌ Coordonnées invalides:', lat, lon);
                showError('Impossible de recalculer : coordonnées invalides');
                return;
            }
            
            // Mettre à jour les coordonnées
            fileAnalysis.coordinates = { lat, lon };
            
            // Recalculer la région
            const detectedRegion = detectRegionFromCoords(lat, lon);
            fileAnalysis.detected_region = detectedRegion;
            
            console.log(`✅ Nouvelles coordonnées: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            console.log(`✅ Région recalculée: ${detectedRegion}`);
            
            // Réinitialiser la validation
            if (isSourceValidated) {
                isSourceValidated = false;
                validatedSourceEpsg = null;
            }
            
            // Mettre à jour l'interface
            populateRegionSelect(regionSource, detectedRegion);
            populateRegionSelect(regionTarget, detectedRegion);
            
            // Verrouiller la région et auto-sélectionner le système source
            regionSource.disabled = true;
            
            if (detectedRegion) {
                // 🆕 Forcer le rechargement du système source
                populateEpsgForRegion(sourceEpsg, detectedRegion, [], 'geographic');
                
                // Auto-sélectionner WGS84
                sourceEpsg.value = '4326';
                
                document.getElementById('detectionInfoSource').innerHTML = `
                    <div class="info-badge detected" style="margin-bottom: 15px;">
                        📍 Région recalculée : ${detectedRegion} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)
                    </div>
                `;
                
                document.getElementById('regionInfoSource').innerHTML = `
                    <span class="info-badge detected" style="margin-top: 15px; display: inline-block;">
                        ✨ Système détecté automatiquement après changement de format
                    </span>
                `;
                
                // Masquer les contrôles de validation pour coordonnées géographiques
                document.getElementById('validateSourceContainer').style.display = 'none';
                document.getElementById('autoDetectContainer').style.display = 'none';
                
                // Validation automatique pour coordonnées géographiques
                isSourceValidated = true;
                validatedSourceEpsg = '4326';
                
                // Afficher les étapes suivantes
                setTimeout(() => {
                    document.getElementById('step3').style.display = 'block';
                    document.getElementById('step4').style.display = 'block';
                    document.getElementById('step5').style.display = 'block';
                }, 100);
                
                // 🆕 FORCER la mise à jour complète du système cible
                // D'abord vider complètement
                document.getElementById('suggestionInfoTarget').innerHTML = '';
                document.getElementById('detectionInfoTarget').innerHTML = '';
                targetEpsg.value = ''; // Réinitialiser la sélection
                
                // Puis repeupler la région target
                populateRegionSelect(regionTarget, detectedRegion);
                
                // Repeupler les systèmes EPSG cibles
                const compatibleSystems = getCompatibleSystemsForRegion(detectedRegion, lat, lon);
                populateEpsgForRegion(targetEpsg, detectedRegion, compatibleSystems);
                
                // 🆕 TOUJOURS mettre à jour l'info de détection target
                document.getElementById('detectionInfoTarget').innerHTML = `
                    <div class="info-badge detected" style="margin-bottom: 15px;">
                        📍 Région détectée : ${detectedRegion} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)
                    </div>
                `;
                
                // 🆕 TOUJOURS recréer les suggestions pour le système cible
                const suggestions = getSuggestedTargetEpsg(lat, lon);
                console.log('📊 Suggestions générées:', suggestions);
                
                if (suggestions.length > 0) {
                    let suggestionsHtml = '<div class="suggestion-box">';
                    suggestionsHtml += '<div class="suggestion-title">Systèmes recommandés pour votre zone</div>';
                    suggestionsHtml += '<div class="suggestion-buttons">';
                    suggestions.forEach(([code, name, tag]) => {
                        const isRecommended = tag === 'recommandé';
                        suggestionsHtml += `<button class="btn-suggestion ${isRecommended ? 'recommended' : ''}" onclick="selectTargetEpsg('${code}')">EPSG:${code} - ${name}</button>`;
                    });
                    suggestionsHtml += '</div></div>';
                    document.getElementById('suggestionInfoTarget').innerHTML = suggestionsHtml;
                    console.log('✅ Suggestions injectées dans le DOM');
                } else {
                    // Vider les suggestions si aucune
                    document.getElementById('suggestionInfoTarget').innerHTML = '';
                    console.log('⚠️ Aucune suggestion disponible');
                }
                
                console.log('✅ Système cible complètement réinitialisé et mis à jour');
            }
            
        } catch (error) {
            console.error('❌ Erreur recalcul:', error);
            showError('Erreur lors du recalcul des coordonnées: ' + error.message);
        }
    }
}

// 🆕 FONCTION : Mettre à jour uniquement les en-têtes du tableau d'aperçu
function updatePreviewHeaders(format) {
    console.log('🔄 Mise à jour des en-têtes du tableau:', format);
    
    // Trouver le tableau dans previewContent
    const table = document.querySelector('#previewContent .preview-table');
    if (!table) {
        console.warn('⚠️ Tableau d\'aperçu non trouvé');
        return;
    }
    
    // Mettre à jour les en-têtes
    const thead = table.querySelector('thead tr');
    if (thead) {
        if (format === 'lat_long_h') {
            thead.innerHTML = '<th>Matricule</th><th>Latitude</th><th>Longitude</th><th>h</th>';
            console.log('✅ En-têtes mis à jour: Matricule | Latitude | Longitude | h');
        } else if (format === 'long_lat_h') {
            thead.innerHTML = '<th>Matricule</th><th>Longitude</th><th>Latitude</th><th>h</th>';
            console.log('✅ En-têtes mis à jour: Matricule | Longitude | Latitude | h');
        } else {
            thead.innerHTML = '<th>Matricule</th><th>X</th><th>Y</th><th>Z</th>';
            console.log('✅ En-têtes mis à jour: Matricule | X | Y | Z');
        }
    }
}

// 🆕 FONCTION : Obtenir systèmes compatibles pour une région (simplifié côté client)
function getCompatibleSystemsForRegion(region, lat, lon) {
    // Pour l'instant, retourner une liste vide pour afficher tous les systèmes
    // Le filtrage détaillé se fait côté serveur avec la validation
    return [];
}

// 🆕 FONCTION : Obtenir suggestions de systèmes cibles (logique côté client)
function getSuggestedTargetEpsg(lat, lon) {
    const suggestions = [];
    
    // France métropolitaine
    if (lat >= 41 && lat <= 51 && lon >= -5 && lon <= 10) {
        suggestions.push(['2154', 'Lambert 93', 'recommandé']);
        suggestions.push(['3946', 'CC46 (Lyon/Rhône-Alpes)', '']);
        suggestions.push(['3945', 'CC45 (Centre-Est)', '']);
    }
    
    // Corse
    if (lat >= 41 && lat <= 43 && lon >= 8 && lon <= 10) {
        suggestions.push(['3950', 'CC50 (Corse)', 'recommandé']);
    }
    
    // Guadeloupe
    if (lat >= 15.8 && lat <= 16.5 && lon >= -61.9 && lon <= -61.0) {
        suggestions.push(['2969', 'RGAF09 / UTM zone 20N', 'recommandé']);
    }
    
    // Martinique
    if (lat >= 14.3 && lat <= 14.9 && lon >= -61.3 && lon <= -60.7) {
        suggestions.push(['2973', 'RGAF09 / UTM zone 20N', 'recommandé']);
    }
    
    // Guyane
    if (lat >= 2.1 && lat <= 5.8 && lon >= -54.6 && lon <= -51.6) {
        suggestions.push(['2972', 'RGFG95 / UTM zone 22N', 'recommandé']);
    }
    
    // Réunion
    if (lat >= -21.4 && lat <= -20.9 && lon >= 55.2 && lon <= 55.8) {
        suggestions.push(['2975', 'RGR92 / UTM zone 40S', 'recommandé']);
    }
    
    return suggestions;
}

// 🆕 FONCTION : Détecter la région (côté client - approximatif)
function detectRegionFromCoords(lat, lon) {
    // France métropolitaine
    if (lat >= 41 && lat <= 51 && lon >= -5 && lon <= 10) {
        // Corse
        if (lat >= 41 && lat <= 43 && lon >= 8 && lon <= 10) {
            return "Corse";
        }
        return "France métropolitaine";
    }
    
    // Guadeloupe
    if (lat >= 15.8 && lat <= 16.5 && lon >= -61.9 && lon <= -61.0) {
        return "Guadeloupe";
    }
    
    // Martinique
    if (lat >= 14.3 && lat <= 14.9 && lon >= -61.3 && lon <= -60.7) {
        return "Martinique";
    }
    
    // Guyane
    if (lat >= 2.1 && lat <= 5.8 && lon >= -54.6 && lon <= -51.6) {
        return "Guyane";
    }
    
    // Réunion
    if (lat >= -21.4 && lat <= -20.9 && lon >= 55.2 && lon <= 55.8) {
        return "Réunion";
    }
    
    // Mayotte
    if (lat >= -13.0 && lat <= -12.6 && lon >= 45.0 && lon <= 45.3) {
        return "Mayotte";
    }
    
    // Suisse
    if (lat >= 45.8 && lat <= 47.8 && lon >= 5.9 && lon <= 10.5) {
        return "Suisse";
    }
    
    // Belgique
    if (lat >= 49.5 && lat <= 51.5 && lon >= 2.5 && lon <= 6.4) {
        return "Belgique";
    }
    
    return "International";
}

// Fonction pour peupler le sélecteur de région
function populateRegionSelect(selectElement, detectedRegion = null) {
    selectElement.innerHTML = '<option value="">-- Sélectionner une région --</option>';
    
    if (detectedRegion && window.EPSG_DATABASE[detectedRegion]) {
        const option = document.createElement('option');
        option.value = detectedRegion;
        option.textContent = `📍 ${detectedRegion} (détecté)`;
        option.selected = true;
        selectElement.appendChild(option);
    }
    
    for (const region of Object.keys(window.EPSG_DATABASE)) {
        if (region === detectedRegion) continue;
        
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        selectElement.appendChild(option);
    }
}

// Fonction pour peupler le menu EPSG selon la région (TOUS les systèmes par défaut)
function populateEpsgForRegion(selectElement, region, compatibleSystems = [], filterByFormat = null) {
    selectElement.innerHTML = '<option value="">-- Sélectionner un système --</option>';
    
    if (!region || !window.EPSG_DATABASE[region]) {
        return;
    }
    
    const regionData = window.EPSG_DATABASE[region];
    
    // Si aucun filtre, afficher TOUS les systèmes
    const showAll = compatibleSystems.length === 0;
    
    // 🆕 Déterminer les catégories à afficher selon le format
    let allowedCategories = [];
    if (filterByFormat === 'geographic') {
        // Pour coordonnées géographiques : seulement "Géographiques"
        allowedCategories = ['Géographiques'];
    } else if (filterByFormat === 'projected') {
        // Pour coordonnées projetées : tout SAUF "Géographiques"
        allowedCategories = Object.keys(regionData).filter(cat => cat !== 'Géographiques');
    } else {
        // Pas de filtre : toutes les catégories
        allowedCategories = Object.keys(regionData);
    }
    
    for (const [category, systems] of Object.entries(regionData)) {
        // 🆕 Filtrer par catégorie selon le format
        if (!allowedCategories.includes(category)) {
            continue;
        }
        
        const categoryGroup = document.createElement('optgroup');
        categoryGroup.label = category;
        let categoryHasSystems = false;
        
        for (const [code, name] of Object.entries(systems)) {
            if (showAll || compatibleSystems.includes(code)) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `EPSG:${code} - ${name}`;
                categoryGroup.appendChild(option);
                categoryHasSystems = true;
            }
        }
        
        if (categoryHasSystems) {
            selectElement.appendChild(categoryGroup);
        }
    }
}

// 🆕 Changement de région SOURCE : afficher TOUS les systèmes + montrer bouton détection
regionSource.addEventListener('change', () => {
    const region = regionSource.value;
    
    if (!region) {
        sourceEpsg.innerHTML = '<option value="">-- Sélectionner d\'abord une région --</option>';
        document.getElementById('autoDetectContainer').style.display = 'none';
        document.getElementById('regionInfoSource').innerHTML = '';
        return;
    }
    
    // Afficher TOUS les systèmes de la région (pas de filtre)
    populateEpsgForRegion(sourceEpsg, region, []);
    
    // Afficher le bouton de détection si coordonnées projetées
    if (fileAnalysis && fileAnalysis.format_detected === 'x_y_z') {
        document.getElementById('autoDetectContainer').style.display = 'block';
    }
    
    document.getElementById('regionInfoSource').innerHTML = '';
});

// 🆕 Changement du système source EPSG
sourceEpsg.addEventListener('change', () => {
    // Pour coordonnées géographiques, on ne bloque pas si le système change
    const isProjected = fileAnalysis && fileAnalysis.format_detected === 'x_y_z';
    
    // 🔒 Si déjà validé et qu'on change le système (SEULEMENT pour coords projetées)
    if (isProjected && isSourceValidated && sourceEpsg.value !== validatedSourceEpsg) {
        // Masquer les étapes suivantes
        document.getElementById('step3').style.display = 'none';
        document.getElementById('step4').style.display = 'none';
        document.getElementById('step5').style.display = 'none';
        
        // Afficher message d'avertissement
        document.getElementById('regionInfoSource').innerHTML = `
            <div class="info-badge warning" style="margin-top: 15px; display: inline-block;">
                ⚠️ Système modifié - Veuillez re-valider pour continuer
            </div>
        `;
        
        // Réinitialiser le statut de validation
        isSourceValidated = false;
        validatedSourceEpsg = null;
    }
    
    // Pour coordonnées géographiques : mise à jour automatique
    if (!isProjected && sourceEpsg.value) {
        validatedSourceEpsg = sourceEpsg.value;
        
        const selectedSystemName = sourceEpsg.options[sourceEpsg.selectedIndex].text;
        
        document.getElementById('regionInfoSource').innerHTML = `
            <span class="info-badge detected" style="margin-top: 15px; display: inline-block;">
                ✨ ${selectedSystemName}
            </span>
        `;
        
        // S'assurer que les étapes suivantes sont visibles
        if (isSourceValidated) {
            document.getElementById('step3').style.display = 'block';
            document.getElementById('step4').style.display = 'block';
            document.getElementById('step5').style.display = 'block';
        }
    }
});

// Changement de région CIBLE
regionTarget.addEventListener('change', () => {
    const region = regionTarget.value;
    const compatibleSystems = fileAnalysis?.compatible_systems || [];
    populateEpsgForRegion(targetEpsg, region, compatibleSystems);
});

// 🆕 BOUTON DÉTECTION AUTOMATIQUE
btnAutoDetect.addEventListener('click', async () => {
    const region = regionSource.value;
    
    if (!region) {
        showError('Veuillez d\'abord sélectionner une région');
        return;
    }
    
    if (!fileAnalysis || !fileAnalysis.preview || fileAnalysis.preview.length === 0) {
        showError('Données du fichier non disponibles');
        return;
    }
    
    const x = parseFloat(fileAnalysis.preview[0][1]);
    const y = parseFloat(fileAnalysis.preview[0][2]);
    
    // Désactiver le bouton et afficher loader
    btnAutoDetect.disabled = true;
    btnAutoDetect.textContent = '🔄 Test en cours...';
    
    document.getElementById('regionInfoSource').innerHTML = `
        <div class="info-badge" style="margin-top: 15px; display: inline-block;">
            ⏳ Test de tous les systèmes de la région ${region}...
        </div>
    `;
    
    try {
        const response = await fetch('/api/test-region-systems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                x: x,
                y: y,
                region: region
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
            btnAutoDetect.disabled = false;
            btnAutoDetect.textContent = '🔍 Détection automatique des systèmes compatibles';
            document.getElementById('regionInfoSource').innerHTML = '';
            return;
        }
        
        // Succès : afficher les résultats
        const compatibleSystems = data.compatible_systems;
        
        if (compatibleSystems.length > 0) {
            // Mettre à jour le menu déroulant avec SEULEMENT les systèmes compatibles
            const codes = compatibleSystems.map(sys => sys.code);
            populateEpsgForRegion(sourceEpsg, region, codes);
            
            document.getElementById('regionInfoSource').innerHTML = `
                <div class="info-badge detected" style="margin-top: 15px; display: inline-block;">
                    ✅ ${compatibleSystems.length} système(s) compatible(s) trouvé(s) sur ${data.total_tested} testés
                </div>
            `;
            
            // Auto-sélectionner le premier si un seul résultat
            if (compatibleSystems.length === 1) {
                sourceEpsg.value = compatibleSystems[0].code;
            }
        } else {
            document.getElementById('regionInfoSource').innerHTML = `
                <div class="info-badge error" style="margin-top: 15px; display: inline-block;">
                    ❌ Aucun système compatible trouvé dans cette région (${data.total_tested} testés)
                </div>
            `;
        }
        
        btnAutoDetect.disabled = false;
        btnAutoDetect.textContent = '🔍 Détection automatique des systèmes compatibles';
        
    } catch (error) {
        showError('Erreur lors de la détection: ' + error.message);
        btnAutoDetect.disabled = false;
        btnAutoDetect.textContent = '🔍 Détection automatique des systèmes compatibles';
        document.getElementById('regionInfoSource').innerHTML = '';
    }
});

// Gestion de l'upload de fichier
async function handleFileUpload(file) {
    uploadedFile = file;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/analyze-file', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        console.log('📊 Données d\'analyse reçues:', data);
        console.log('✅ Systèmes compatibles:', data.compatible_systems);
        console.log('📍 Coordonnées:', data.coordinates);
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        fileAnalysis = data;
        displayFilePreview(data);
        
        // Afficher étape 2 SANS scroll (scroll manuel vers aperçu)
        document.getElementById('step2').style.display = 'block';
        
        // Scroll vers le tableau d'aperçu au lieu de l'étape 2
        setTimeout(() => {
            document.getElementById('filePreview').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
        
    } catch (error) {
        showError('Erreur lors de l\'analyse du fichier: ' + error.message);
    }
}

// Nouvelle fonction : afficher étape + scroll automatique
function showStepWithScroll(stepId) {
    const step = document.getElementById(stepId);
    if (step) {
        step.style.display = 'block';
        
        // Scroll automatique avec animation fluide
        setTimeout(() => {
            step.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }
}

function displayFilePreview(data) {
    filePreview.classList.add('show');
    formatSelector.style.display = 'block';
    
    // Créer un tableau HTML
    let preview = '';
    
    if (data.header) {
        preview += '<div class="preview-header-info">';
        preview += '<strong>📋 En-tête détecté :</strong><br>';
        preview += data.header.join(' | ');
        preview += '</div>';
        preview += '<div class="info-badge" style="margin-bottom: 15px;">';
        preview += 'ℹ️ Seules les 4 premières colonnes seront utilisées pour la conversion';
        preview += '</div>';
    }
    
    preview += '<table class="preview-table"><thead><tr>';
    preview += '<th>Matricule</th>';
    
    if (data.format_detected === 'lat_long_h') {
        preview += '<th>Latitude</th><th>Longitude</th><th>h</th>';
    } else if (data.format_detected === 'long_lat_h') {
        preview += '<th>Longitude</th><th>Latitude</th><th>h</th>';
    } else {
        preview += '<th>X</th><th>Y</th><th>Z</th>';
    }
    
    preview += '</tr></thead><tbody>';
    
    if (data.preview && data.preview.length > 0) {
        data.preview.forEach(row => {
            preview += '<tr>';
            preview += `<td>${row[0] || '-'}</td>`;
            preview += `<td>${row[1] || '-'}</td>`;
            preview += `<td>${row[2] || '-'}</td>`;
            preview += `<td>${row[3] || '-'}</td>`;
            preview += '</tr>';
        });
    }
    
    preview += '</tbody></table>';
    
    // 🆕 BOUTON SUPPRIMER L'IMPORT
    preview += `
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn-reset" onclick="resetFileUpload()" type="button">
                🗑️ Supprimer ce fichier et en charger un autre
            </button>
        </div>
    `;
    
    previewContent.innerHTML = preview;
    
    fileInfo.innerHTML = `
        <span class="info-badge detected">
            ✓ ${data.row_count} points détectés
        </span>
        <span class="info-badge detected">
            Séparateur: ${data.delimiter === ',' ? 'Virgule' : data.delimiter === ';' ? 'Point-virgule' : 'Tabulation'}
        </span>
    `;
    
    if (data.format_detected) {
        const formatRadio = document.querySelector(`input[value="${data.format_detected}"]`);
        if (formatRadio) formatRadio.checked = true;
    }
    
    const detectedRegion = data.detected_region || null;
    const compatibleSystems = data.compatible_systems || [];
    const isProjected = data.format_detected === 'x_y_z';
    
    populateRegionSelect(regionSource, detectedRegion);
    populateRegionSelect(regionTarget, detectedRegion);
    
    if (detectedRegion) {
        // 🆕 Pour source : afficher selon le format détecté
        if (isProjected) {
            // Coordonnées projetées : tous les systèmes projetés (pas de géographiques)
            populateEpsgForRegion(sourceEpsg, detectedRegion, [], 'projected');
        } else {
            // Coordonnées géographiques : seulement les systèmes géographiques
            populateEpsgForRegion(sourceEpsg, detectedRegion, [], 'geographic');
        }
        
        // Pour cible : afficher seulement les compatibles
        populateEpsgForRegion(targetEpsg, detectedRegion, compatibleSystems);
    }
    
    if (isProjected) {
        document.getElementById('detectionInfoSource').innerHTML = `
            <div class="info-badge warning" style="margin-bottom: 15px;">
                ⚠️ Coordonnées projetées détectées (X=${data.preview[0][1]}, Y=${data.preview[0][2]})
            </div>
            <div class="info-badge" style="margin-bottom: 15px;">
                💡 Sélectionnez une région puis utilisez la détection automatique ou choisissez manuellement le système
            </div>
        `;
        document.getElementById('validateSourceContainer').style.display = 'block';
        
        // Afficher le bouton de détection si une région est déjà sélectionnée
        if (detectedRegion) {
            document.getElementById('autoDetectContainer').style.display = 'block';
        }
    } else if (detectedRegion && data.coordinates) {
        let detectionHtml = `
            <div class="info-badge detected" style="margin-bottom: 15px;">
                📍 Région détectée : ${detectedRegion} (${data.coordinates.lat.toFixed(4)}°N, ${data.coordinates.lon.toFixed(4)}°E)
            </div>
        `;
        document.getElementById('detectionInfoSource').innerHTML = detectionHtml;
        document.getElementById('detectionInfoTarget').innerHTML = detectionHtml;
        document.getElementById('validateSourceContainer').style.display = 'none';
        document.getElementById('autoDetectContainer').style.display = 'none';
    }
    
    if (data.suggested_source_epsg && !isProjected) {
        sourceEpsg.value = data.suggested_source_epsg;
        
        // 🔒 Verrouiller le sélecteur de région pour coordonnées géographiques
        regionSource.disabled = true;
        
        document.getElementById('regionInfoSource').innerHTML = `
            <span class="info-badge detected" style="margin-top: 15px; display: inline-block;">
                ✨ Système détecté automatiquement - Changement limité aux systèmes géographiques
            </span>
        `;
        
        // 🆕 Pour coordonnées géographiques : validation automatique + affichage étapes
        isSourceValidated = true;
        validatedSourceEpsg = data.suggested_source_epsg;
        
        // Afficher les étapes suivantes automatiquement
        setTimeout(() => {
            document.getElementById('step3').style.display = 'block';
            document.getElementById('step4').style.display = 'block';
            document.getElementById('step5').style.display = 'block';
        }, 300);
    }
    
    if (data.suggested_target_epsg && data.suggested_target_epsg.length > 0 && !isProjected) {
        let suggestions = '<div class="suggestion-box">';
        suggestions += '<div class="suggestion-title">Systèmes recommandés pour votre zone</div>';
        suggestions += '<div class="suggestion-buttons">';
        data.suggested_target_epsg.forEach(([code, name, tag]) => {
            const isRecommended = tag === 'recommandé';
            suggestions += `<button class="btn-suggestion ${isRecommended ? 'recommended' : ''}" onclick="selectTargetEpsg('${code}')">EPSG:${code} - ${name}</button>`;
        });
        suggestions += '</div></div>';
        document.getElementById('suggestionInfoTarget').innerHTML = suggestions;
    }
}

// 🆕 FONCTION : Réinitialiser complètement l'upload
function resetFileUpload() {
    console.log('🗑️ Demande de suppression du fichier...');
    
    const confirmDelete = window.confirm(
        '🗑️ Supprimer le fichier chargé ?\n\n' +
        'Cela va réinitialiser toute la conversion.\n\n' +
        'Voulez-vous continuer ?'
    );
    
    if (!confirmDelete) {
        console.log('❌ Suppression annulée');
        return;
    }
    
    console.log('✅ Suppression confirmée - Réinitialisation...');
    
    // Réinitialiser variables
    uploadedFile = null;
    fileAnalysis = null;
    convertedResults = null;
    isSourceValidated = false;
    validatedSourceEpsg = null;
    
    // Réinitialiser input file
    fileInput.value = '';
    
    // 🆕 MASQUER COMPLÈTEMENT la preview box
    const previewBox = document.getElementById('filePreview');
    previewBox.classList.remove('show');
    previewBox.style.display = 'none';
    
    // Vider le contenu
    previewContent.innerHTML = '';
    fileInfo.innerHTML = '';
    formatSelector.style.display = 'none';
    
    // Masquer toutes les étapes
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step4').style.display = 'none';
    document.getElementById('step5').style.display = 'none';
    document.getElementById('stepResults').style.display = 'none';
    
    // Réinitialiser les contenus des étapes
    document.getElementById('detectionInfoSource').innerHTML = '';
    document.getElementById('regionInfoSource').innerHTML = '';
    document.getElementById('detectionInfoTarget').innerHTML = '';
    document.getElementById('regionInfoTarget').innerHTML = '';
    document.getElementById('suggestionInfoTarget').innerHTML = '';
    document.getElementById('geoidInfo').innerHTML = '';
    document.getElementById('autoDetectContainer').style.display = 'none';
    document.getElementById('validateSourceContainer').style.display = 'none';
    
    // Réinitialiser les sélecteurs
    regionSource.disabled = false;
    sourceEpsg.disabled = false;
    regionSource.value = '';
    sourceEpsg.innerHTML = '<option value="">-- Sélectionner d\'abord une région --</option>';
    regionTarget.value = '';
    targetEpsg.innerHTML = '<option value="">-- Sélectionner d\'abord une région --</option>';
    geoidSelect.value = 'none';
    
    // Réinitialiser les boutons
    btnConvert.disabled = false;
    document.getElementById('progressBar').style.display = 'none';
    
    // Décocher tous les radios et recocher le premier
    document.querySelectorAll('input[name="coordFormat"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('formatLatLong').checked = true;
    
    // Scroll vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Réinitialisation complète terminée');
}

function selectTargetEpsg(code) {
    targetEpsg.value = code;
    document.getElementById('regionInfoTarget').innerHTML = `
        <span class="info-badge detected" style="margin-top: 15px; display: inline-block;">
            ✓ Système sélectionné depuis les recommandations
        </span>
    `;
}

// Validation du système source avec AUTO-SCROLL
btnValidateSource.addEventListener('click', async () => {
    if (!sourceEpsg.value) {
        showError('Veuillez sélectionner un système source');
        return;
    }
    
    btnValidateSource.disabled = true;
    btnValidateSource.textContent = '🔄 Calcul en cours...';
    
    try {
        const response = await fetch('/api/reverse-transform', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                x: parseFloat(fileAnalysis.preview[0][1]),
                y: parseFloat(fileAnalysis.preview[0][2]),
                source_epsg: sourceEpsg.value,
                selected_region: regionSource.value
            })
        });
        
        const data = await response.json();
        
        // Vérifier si c'est une erreur de validation
        if (data.validation_failed) {
            // Afficher l'erreur formatée
            showErrorFormatted(data.error);
            
            // Réactiver le bouton
            btnValidateSource.disabled = false;
            btnValidateSource.textContent = '✓ Valider le système source';
            
            return;
        }
        
        if (data.error) {
            showError(data.error);
            btnValidateSource.disabled = false;
            btnValidateSource.textContent = '✓ Valider le système source';
            return;
        }
        
        // ✅ Validation OK - Mise à jour de l'interface
        fileAnalysis.coordinates = data.coordinates;
        fileAnalysis.compatible_systems = data.compatible_systems;
        fileAnalysis.detected_region = data.detected_region;
        fileAnalysis.suggested_target_epsg = data.suggested_target_epsg;
        
        // 🔒 Marquer comme validé
        isSourceValidated = true;
        validatedSourceEpsg = sourceEpsg.value;
        
        // 🔒 Verrouiller les champs
        regionSource.disabled = true;
        sourceEpsg.disabled = true;
        
        let systemInfoText = sourceEpsg.options[sourceEpsg.selectedIndex].text;
        if (data.system_info && data.system_info.area) {
            systemInfoText += ` (${data.system_info.area})`;
        }
        
        document.getElementById('detectionInfoSource').innerHTML = `
            <div class="info-badge detected" style="margin-bottom: 15px;">
                ✅ Système source validé et verrouillé : ${systemInfoText}
            </div>
            <div class="info-badge detected" style="margin-bottom: 15px;">
                📍 Position calculée : ${data.detected_region} (${data.coordinates.lat.toFixed(4)}°N, ${data.coordinates.lon.toFixed(4)}°E)
            </div>
        `;
        
        // 🔒 Remplacer le bouton "Valider" par "Déverrouiller"
        document.getElementById('validateSourceContainer').innerHTML = `
            <button class="btn-unlock" id="btnUnlockSource">
                🔓 Déverrouiller le système source
            </button>
        `;
        
        // Ajouter l'événement de déverrouillage
        document.getElementById('btnUnlockSource').addEventListener('click', () => {
            unlockSourceSystem();
        });
        
        document.getElementById('validateSourceContainer').style.display = 'none';
        document.getElementById('autoDetectContainer').style.display = 'none';
        
        populateRegionSelect(regionTarget, data.detected_region);
        if (data.detected_region) {
            populateEpsgForRegion(targetEpsg, data.detected_region, data.compatible_systems);
        }
        
        document.getElementById('detectionInfoTarget').innerHTML = `
            <div class="info-badge detected" style="margin-bottom: 15px;">
                📍 Région détectée : ${data.detected_region} (${data.coordinates.lat.toFixed(4)}°N, ${data.coordinates.lon.toFixed(4)}°E)
            </div>
        `;
        
        if (data.suggested_target_epsg && data.suggested_target_epsg.length > 0) {
            let suggestions = '<div class="suggestion-box">';
            suggestions += '<div class="suggestion-title">Systèmes recommandés pour votre zone</div>';
            suggestions += '<div class="suggestion-buttons">';
            data.suggested_target_epsg.forEach(([code, name, tag]) => {
                const isRecommended = tag === 'recommandé';
                suggestions += `<button class="btn-suggestion ${isRecommended ? 'recommended' : ''}" onclick="selectTargetEpsg('${code}')">EPSG:${code} - ${name}</button>`;
            });
            suggestions += '</div></div>';
            document.getElementById('suggestionInfoTarget').innerHTML = suggestions;
        }
        
        // 🆕 AUTO-SCROLL vers les étapes suivantes
        showStepWithScroll('step3');
        
        // Afficher aussi step4 et step5
        setTimeout(() => {
            document.getElementById('step4').style.display = 'block';
            document.getElementById('step5').style.display = 'block';
        }, 300);
        
    } catch (error) {
        showError('Erreur lors de la validation: ' + error.message);
        btnValidateSource.disabled = false;
        btnValidateSource.textContent = '✓ Valider le système source';
    }
});

geoidSelect.addEventListener('change', async () => {
    const geoid = geoidSelect.value;
    
    if (geoid === 'none') {
        document.getElementById('geoidInfo').innerHTML = `
            <span class="info-badge">
                ℹ️ La hauteur ellipsoïdale (h) sera conservée
            </span>
        `;
        return;
    }
    
    try {
        const response = await fetch(`/api/check-geoid/${geoid}`);
        const data = await response.json();
        
        if (data.available) {
            document.getElementById('geoidInfo').innerHTML = `
                <span class="info-badge detected">
                    ✓ Géoïde ${geoid} installé et prêt
                </span>
            `;
        } else {
            document.getElementById('geoidInfo').innerHTML = `
                <span class="info-badge error">
                    ⚠️ Géoïde ${geoid} non installé - La conversion sera bloquée
                </span>
            `;
        }
    } catch (error) {
        console.error('Erreur vérification géoïde:', error);
    }
});

btnConvert.addEventListener('click', async () => {
    if (!uploadedFile || !fileAnalysis) {
        showError('Veuillez d\'abord charger un fichier');
        return;
    }
    
    if (!sourceEpsg.value || !targetEpsg.value) {
        showError('Veuillez sélectionner les systèmes source et cible');
        return;
    }
    
    btnConvert.disabled = true;
    document.getElementById('progressBar').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvContent = e.target.result;
        const coordFormat = document.querySelector('input[name="coordFormat"]:checked').value;
        
        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    csv_content: csvContent,
                    source_epsg: sourceEpsg.value,
                    target_epsg: targetEpsg.value,
                    geoid: geoidSelect.value,
                    has_header: fileAnalysis.has_header,
                    delimiter: fileAnalysis.delimiter,
                    coord_format: coordFormat,
                    coordinates: fileAnalysis.coordinates
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                showErrorFormatted(data.error);
                btnConvert.disabled = false;
                document.getElementById('progressBar').style.display = 'none';
                return;
            }
            
            convertedResults = data.results;
            displayResults(data.results);
            
            document.getElementById('progressBar').style.display = 'none';
            btnConvert.disabled = false;
            
            showStep('stepResults');
            document.getElementById('stepResults').scrollIntoView({ 
                behavior: 'smooth' 
            });
            
        } catch (error) {
            showError('Erreur lors de la conversion: ' + error.message);
            btnConvert.disabled = false;
            document.getElementById('progressBar').style.display = 'none';
        }
    };
    
    reader.readAsText(uploadedFile);
});

function displayResults(results) {
    let preview = '<table class="preview-table">';
    preview += '<thead><tr>';
    preview += '<th>Matricule</th><th>X</th><th>Y</th><th>Z</th>';
    preview += '</tr></thead><tbody>';
    
    results.slice(0, 5).forEach(row => {
        preview += '<tr>';
        if (row.error) {
            preview += `<td>${row.M}</td>`;
            preview += `<td colspan="3" style="color: #e53e3e;">ERROR: ${row.error}</td>`;
        } else {
            preview += `<td>${row.M}</td>`;
            preview += `<td>${row.X}</td>`;
            preview += `<td>${row.Y}</td>`;
            preview += `<td>${row.Z}</td>`;
        }
        preview += '</tr>';
    });
    
    preview += '</tbody></table>';
    
    if (results.length > 5) {
        preview += `<div style="margin-top: 15px; text-align: center; color: #718096;">... et ${results.length - 5} autres lignes</div>`;
    }
    
    document.getElementById('resultsPreview').innerHTML = preview;
}

btnExport.addEventListener('click', async () => {
    if (!convertedResults) {
        showError('Aucun résultat à exporter');
        return;
    }
    
    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                results: convertedResults
            })
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de l\'export');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'coordonnees_converties.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        showError('Erreur lors de l\'export: ' + error.message);
    }
});

btnReset.addEventListener('click', () => {
    location.reload();
});

function showStep(stepId) {
    document.getElementById(stepId).style.display = 'block';
}

function showError(message) {
    alert('❌ Erreur: ' + message);
}

function showErrorFormatted(message) {
    alert(message);
}

function showLoader(message) {
    console.log(message);
}

function hideLoader() {
}

// 🔒 Fonction pour réinitialiser la validation du système source
function resetSourceValidation() {
    isSourceValidated = false;
    validatedSourceEpsg = null;
    
    // Masquer les étapes suivantes
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step4').style.display = 'none';
    document.getElementById('step5').style.display = 'none';
    
    // Restaurer le bouton de validation
    document.getElementById('validateSourceContainer').innerHTML = `
        <button class="validate-button" id="btnValidateSource">
            ✓ Valider le système source
        </button>
    `;
    
    // Réattacher l'événement de validation
    const newBtnValidate = document.getElementById('btnValidateSource');
    newBtnValidate.addEventListener('click', async () => {
        // Copier le code de validation ici (voir fonction principale)
        location.reload(); // Solution temporaire - forcer rechargement
    });
}

// 🔒 Fonction pour déverrouiller le système source
function unlockSourceSystem() {
    const confirm = window.confirm(
        '🔓 Déverrouiller le système source ?\n\n' +
        'Cela va réinitialiser votre sélection et vous devrez re-valider.\n\n' +
        'Les étapes 3, 4 et 5 seront masquées.\n\n' +
        'Voulez-vous continuer ?'
    );
    
    if (!confirm) return;
    
    // Déverrouiller les champs
    regionSource.disabled = false;
    sourceEpsg.disabled = false;
    
    // Réinitialiser la validation
    resetSourceValidation();
    
    // Afficher message
    document.getElementById('detectionInfoSource').innerHTML = `
        <div class="info-badge warning" style="margin-bottom: 15px;">
            🔓 Système source déverrouillé - Veuillez re-sélectionner et valider
        </div>
    `;
    
    document.getElementById('regionInfoSource').innerHTML = '';
}