let map;
let esp32Marker;
let userMarker;
let routeLine;
let accuracyCircle;

let recyclingModalShown = false;
let selectedCategory = null;

function initMap() {
    if (!ESP32_LAT || !ESP32_LON || ESP32_STATUS !== 'ok') {
        console.warn('⚠️ ESP32 no encontrado o sin coordenadas válidas');
        showError('ESP32 no encontrado. Verifica que esté conectado a la red.');
        map = L.map('map').setView([11.247537, -74.176757], 13);
    } else {
        console.log('✅ Coordenadas ESP32 cargadas:', ESP32_LAT, ESP32_LON);
        map = L.map('map').setView([ESP32_LAT, ESP32_LON], 16);
    }
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    if (ESP32_STATUS === 'ok') {
        createESP32Marker();
    }
}

function createESP32Marker() {
    const esp32Icon = L.divIcon({
        html: '<div class="custom-marker marker-esp32"><span class="marker-icon">🎯</span></div>',
        className: '',
        iconSize: [35, 35],
        iconAnchor: [17, 35]
    });

    esp32Marker = L.marker([ESP32_LAT, ESP32_LON], { icon: esp32Icon })
        .addTo(map)
        .bindPopup(`
            <strong>🎯 Caneca EcoGame</strong><br>
            <small>Lat: ${ESP32_LAT.toFixed(6)}</small><br>
            <small>Lon: ${ESP32_LON.toFixed(6)}</small><br>
            <em>¡Encuéntrame!</em>
        `);
}

function showError(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.style.background = '#ef4444';
        statusDiv.style.color = 'white';
        statusDiv.textContent = '⚠️ ' + message;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    
    const bearing = (θ * 180 / Math.PI + 360) % 360;
    const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
    const directionIndex = Math.round(bearing / 45) % 8;
    
    return directions[directionIndex];
}

function updatePosition(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    document.getElementById('user-lat').textContent = userLat.toFixed(6);
    document.getElementById('user-lon').textContent = userLon.toFixed(6);
    if (ESP32_STATUS === 'ok') {
        const distance = calculateDistance(userLat, userLon, ESP32_LAT, ESP32_LON);
        document.getElementById('distance').textContent = Math.round(distance);
        const direction = calculateBearing(userLat, userLon, ESP32_LAT, ESP32_LON);
        updateUserMarker(userLat, userLon, accuracy);
        updateRouteLine(userLat, userLon);
        updateStatus(distance, direction);
    } else {
        updateUserMarker(userLat, userLon, accuracy);
        document.getElementById('distance').textContent = '--';
    }
    if (!window.mapCentered) {
        centerOnBoth();
        window.mapCentered = true;
    }
}

function updateUserMarker(lat, lon, accuracy) {
    if (!userMarker) {
        const userIcon = L.divIcon({
            html: '<div class="custom-marker marker-user"><span class="marker-icon">📍</span></div>',
            className: '',
            iconSize: [35, 35],
            iconAnchor: [17, 35]
        });

        userMarker = L.marker([lat, lon], { icon: userIcon })
            .addTo(map)
            .bindPopup(getUserPopupContent(lat, lon, accuracy));
    } else {
        userMarker.setLatLng([lat, lon]);
        userMarker.setPopupContent(getUserPopupContent(lat, lon, accuracy));
    }

    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
    }
    accuracyCircle = L.circle([lat, lon], {
        radius: accuracy,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.1,
        weight: 2
    }).addTo(map);
}

function getUserPopupContent(lat, lon, accuracy) {
    return `
        <strong>📍 Tu Ubicación</strong><br>
        <small>Lat: ${lat.toFixed(6)}</small><br>
        <small>Lon: ${lon.toFixed(6)}</small><br>
        <small>Precisión: ±${Math.round(accuracy)}m</small>
    `;
}

function updateRouteLine(userLat, userLon) {
    if (ESP32_STATUS !== 'ok') return;

    if (routeLine) {
        map.removeLayer(routeLine);
    }

    routeLine = L.polyline([
        [userLat, userLon],
        [ESP32_LAT, ESP32_LON]
    ], {
        color: '#667eea',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);
}

function updateStatus(distance, direction) {
    const statusDiv = document.getElementById('status');

    if (distance < 10) {
        statusDiv.style.background = '#10b981';
        statusDiv.style.color = 'white';
        statusDiv.textContent = '🎉 ¡ENCONTRADO! ¡Felicidades!';

        if (!recyclingModalShown && ESP32_STATUS === 'ok') {
            recyclingModalShown = true;
            setTimeout(() => {
                showRecyclingModal();
            }, 1000);
        }
    } else if (distance < 50) {
        statusDiv.style.background = '#f59e0b';
        statusDiv.style.color = 'white';
        statusDiv.textContent = `🔥 ¡Muy cerca! (${direction})`;
    } else if (distance < 200) {
        statusDiv.style.background = '#ffd93d';
        statusDiv.style.color = '#333';
        statusDiv.textContent = `🚶 Estás cerca - Ve hacia el ${direction}`;
    } else {
        statusDiv.style.background = '#6b7280';
        statusDiv.style.color = 'white';
        statusDiv.textContent = `🧭 Sigue buscando hacia el ${direction}`;
    }
}

function centerOnBoth() {
    if (userMarker && esp32Marker) {
        const bounds = L.latLngBounds([
            [ESP32_LAT, ESP32_LON],
            userMarker.getLatLng()
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
    } else if (esp32Marker) {
        map.setView([ESP32_LAT, ESP32_LON], 16);
    } else if (userMarker) {
        map.setView(userMarker.getLatLng(), 16);
    }
}

function centerOnESP32() {
    if (esp32Marker) {
        map.setView([ESP32_LAT, ESP32_LON], 18);
        esp32Marker.openPopup();
    } else {
        alert('ESP32 no encontrado');
    }
}

function centerOnUser() {
    if (userMarker) {
        map.setView(userMarker.getLatLng(), 18);
        userMarker.openPopup();
    } else {
        alert('Esperando tu ubicación...');
    }
}

// Función para refrescar coordenadas del ESP32
function refreshESP32() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';

    fetch('/api/esp32/rediscover')
        .then(response => response.json())
        .then(data => {
            console.log('🔄 Buscando ESP32...', data);
            setTimeout(() => {
                location.reload(); 
            }, 3000);
        })
        .catch(error => {
            console.error('❌ Error al actualizar ESP32:', error);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-refresh"></i> Actualizar ESP32';
            alert('Error al actualizar. Intenta de nuevo.');
        });
}


function handleError(error) {
    let msg = '';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            msg = 'Permiso denegado. Por favor permite el acceso a tu ubicación.';
            break;
        case error.POSITION_UNAVAILABLE:
            msg = 'Ubicación no disponible. Verifica tu GPS.';
            break;
        case error.TIMEOUT:
            msg = 'Tiempo de espera agotado. Intenta nuevamente.';
            break;
        default:
            msg = 'Error desconocido al obtener ubicación.';
    }
    
    const statusDiv = document.getElementById('status');
    statusDiv.style.background = '#ef4444';
    statusDiv.style.color = 'white';
    statusDiv.textContent = '❌ ' + msg;
    
    console.error('Error de geolocalización:', error);
}

window.onload = function() {
    console.log('🎯 Iniciando Juego de Búsqueda EcoGame...');

    console.log('Coordenadas ESP32:', ESP32_LAT, ESP32_LON);
    console.log('Estado ESP32:', ESP32_STATUS);

    initMap();
    console.log('✓ Mapa inicializado');

    if ("geolocation" in navigator) {
        console.log('✓ Geolocalización soportada');

        const watchId = navigator.geolocation.watchPosition(
            updatePosition,
            handleError,
            {
                enableHighAccuracy: true, 
                timeout: 10000,         
                maximumAge: 1000         
            }
        );
        
        console.log('✓ Seguimiento de ubicación iniciado (ID:', watchId, ')');

        window.geolocationWatchId = watchId;
    } else {
        console.error('❌ Geolocalización no soportada');
        const statusDiv = document.getElementById('status');
        statusDiv.style.background = '#ef4444';
        statusDiv.style.color = 'white';
        statusDiv.textContent = 'Tu navegador no soporta geolocalización';
    }
};

window.onbeforeunload = function() {
    if (window.geolocationWatchId) {
        navigator.geolocation.clearWatch(window.geolocationWatchId);
        console.log('✓ Seguimiento de ubicación detenido');
    }
};

let pollingInterval = null;
let analysisStartTime = null;

const materialPoints = {
    'PAPEL': 50,
    'PLASTICO': 50,
    'METAL': 50
};

const materialIcons = {
    'PAPEL': '📄',
    'PLASTICO': '♻️',
    'METAL': '🥫'
};

function showRecyclingModal() {
    const modal = document.getElementById('recyclingModal');
    if (!modal) {
        createRecyclingModal();
    }
    
    const recyclingModal = document.getElementById('recyclingModal');
    recyclingModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    showPhase1();
}

function createRecyclingModal() {
    const modal = document.createElement('div');
    modal.id = 'recyclingModal';
    modal.className = 'recycling-modal';
    
    modal.innerHTML = `
        <div class="recycling-modal-content">
            <button class="recycling-close" onclick="closeRecyclingModal()">
                <i class="fa-solid fa-xmark"></i>
            </button>
            
            <!-- FASE 1: INSTRUCCIÓN -->
            <div class="recycling-instruction" id="phase1">
                <div class="instruction-icon">🎯</div>
                <div class="instruction-message">
                    <h3>¡Caneca Localizada!</h3>
                    <p>Por favor, deposita tu material reciclable en la caneca</p>
                    <button class="btn-ready" onclick="startAnalysis()">
                        <i class="fa-solid fa-check"></i>
                        Ya deposité el material
                    </button>
                </div>
            </div>
            
            <!-- FASE 2: ANÁLISIS -->
            <div class="recycling-analyzing" id="phase2">
                <div class="analyzing-spinner"></div>
                <div class="analyzing-message">
                    <h3>Analizando material...</h3>
                    <p>Los sensores están identificando el tipo de desecho</p>
                    <div class="analyzing-status">
                        <p>Estado: <span class="status-value" id="sensorStatus">Esperando...</span></p>
                        <p>Material detectado: <span class="status-value" id="detectedMaterial">---</span></p>
                    </div>
                </div>
            </div>
            
            <!-- FASE 3: ÉXITO -->
            <div class="recycling-success" id="phase3">
                <div class="success-icon">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <div class="success-message">
                    <h3>¡Excelente!</h3>
                    <div class="success-material" id="materialType">
                        <span id="materialIcon">♻️</span>
                        <span id="materialName">Material</span>
                    </div>
                    <div class="success-points" id="earnedPoints">+0</div>
                    <p>Has contribuido al cuidado del medio ambiente</p>
                    <button class="btn-continue" onclick="finishRecycling()">
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === modal && !pollingInterval) {
            closeRecyclingModal();
        }
    });
}

function showPhase1() {
    document.getElementById('phase1').classList.add('show');
    document.getElementById('phase2').classList.remove('show');
    document.getElementById('phase3').classList.remove('show');
}

function showPhase2() {
    document.getElementById('phase1').classList.remove('show');
    document.getElementById('phase2').classList.add('show');
    document.getElementById('phase3').classList.remove('show');
}

function showPhase3() {
    document.getElementById('phase1').classList.remove('show');
    document.getElementById('phase2').classList.remove('show');
    document.getElementById('phase3').classList.add('show');
}

function startAnalysis() {
    showPhase2();
    analysisStartTime = Date.now();
    pollingInterval = setInterval(checkSensorData, 2000);
    checkSensorData();
}

function checkSensorData() {
    fetch('/api/esp32/sensors')
        .then(response => response.json())
        .then(data => {
            console.log('Datos de sensores:', data);
            
            const sensorData = data.sensors;
            const estado = sensorData.estadoProceso;
            const material = sensorData.material;

            document.getElementById('sensorStatus').textContent = estado;
            document.getElementById('detectedMaterial').textContent = material;
            
            if (estado === 'COMPLETADO' && material !== 'NINGUNO') {
                clearInterval(pollingInterval);
                pollingInterval = null;
                
                setTimeout(() => {
                    showResult(material);
                }, 1000);
            } else if (Date.now() - analysisStartTime > 30000) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                showTimeout();
            }
        })
        .catch(error => {
            console.error('Error al obtener datos de sensores:', error);
        });
}

function showResult(material) {
    const points = materialPoints[material] || 0;
    const icon = materialIcons[material] || '0';
    const materialName = getMaterialName(material);
    
    document.getElementById('materialIcon').textContent = icon;
    document.getElementById('materialName').textContent = materialName;
    document.getElementById('earnedPoints').textContent = `+${points}`;
    
    showPhase3();
    
    addRecyclingPoints(points);
    
    saveRecyclingHistory(material, points);
}

function getMaterialName(material) {
    const names = {
        'PAPEL': 'Papel/Cartón',
        'PLASTICO': 'Plástico',
        'METAL': 'Metal'
    };
    return names[material] || material;
}

function showTimeout() {
    alert('Tiempo de espera agotado. Por favor, intenta nuevamente.');
    closeRecyclingModal();
}

function addRecyclingPoints(points) {
    const pointsCounter = document.getElementById('pointsCounter');
    const currentPoints = parseInt(pointsCounter.textContent) || 0;
    
    let counter = currentPoints;
    const target = currentPoints + points;
    const increment = points / 20;
    
    const interval = setInterval(() => {
        counter += increment;
        if (counter >= target) {
            counter = target;
            clearInterval(interval);
        }
        pointsCounter.textContent = Math.round(counter);
    }, 30);
}

function saveRecyclingHistory(material, points) {
    const history = JSON.parse(localStorage.getItem('recyclingHistory')) || [];
    
    history.push({
        material: getMaterialName(material),
        points: points,
        date: new Date().toISOString(),
        location: {
            lat: ESP32_LAT,
            lon: ESP32_LON
        }
    });
    
    localStorage.setItem('recyclingHistory', JSON.stringify(history));
    console.log('Material registrado:', material, `+${points} puntos`);
}

function finishRecycling() {
    closeRecyclingModal();
    
    setTimeout(() => {
        window.location.href = '/ecogame';
    }, 500);
}

function closeRecyclingModal() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    
    const modal = document.getElementById('recyclingModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        document.getElementById('phase1').classList.remove('show');
        document.getElementById('phase2').classList.remove('show');
        document.getElementById('phase3').classList.remove('show');
    }
}