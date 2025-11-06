#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>

const char* ssid = "AndresG";
const char* password = "12345678";

const float ESP32_LAT = 11.224008;
const float ESP32_LON = -74.170546;

#define RXD2 16
#define TXD2 17

WebServer server(80);
const char* mdnsName = "ecogame-esp32";

struct DatosSensores {
    float distancia;
    bool objetoDetectado;
    int valorIR;
    int promedioIR;
    String material;
    String estadoProceso;
    String estadoServo;
    String estadoStepper;
    int gradosRotacion;
    unsigned long timestamp;
    unsigned long tiempoUltimaDeteccion;
} sensores;

struct Estadisticas {
    int totalProcesado;
    int papel;
    int plastico;
    int metal;
    unsigned long tiempoOperacion;
} stats;

String bufferSerial = "";

void handleRoot() {
    unsigned long tiempoSinDatos = millis() - sensores.timestamp;
    bool arduinoActivo = (tiempoSinDatos < 10000);

    String json = "{";
    json += "\"device\":\"ESP32-EcoGame\",";
    json += "\"status\":\"online\",";
    json += "\"message\":\"API funcionando correctamente\",";
    json += "\"arduino_connected\":" + String(arduinoActivo ? "true" : "false") + ",";
    json += "\"uptime\":" + String(millis() / 1000);
    json += "}";

    server.send(200, "application/json", json);
}

void handleCoordinatesAPI() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    if (server.method() == HTTP_OPTIONS) {
        server.send(200);
        return;
    }

    String json = "{";
    json += "\"latitude\":" + String(ESP32_LAT, 6) + ",";
    json += "\"longitude\":" + String(ESP32_LON, 6) + ",";
    json += "\"status\":\"ok\",";
    json += "\"device\":\"ESP32-EcoGame\"";
    json += "}";

    server.send(200, "application/json", json);

    Serial.println("Coordenadas enviadas a Flask");
}

void handleSensorsAPI() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    if (server.method() == HTTP_OPTIONS) {
        server.send(200);
        return;
    }

    unsigned long tiempoSinDatos = millis() - sensores.timestamp;
    bool arduinoActivo = (tiempoSinDatos < 10000);

    String json = "{";
    json += "\"arduino_connected\":" + String(arduinoActivo ? "true" : "false") + ",";
    json += "\"objeto_detectado\":" + String(sensores.objetoDetectado ? "true" : "false") + ",";
    json += "\"distancia\":" + String(sensores.distancia, 2) + ",";
    json += "\"sensor_ir\":" + String(sensores.valorIR) + ",";
    json += "\"promedio_ir\":" + String(sensores.promedioIR) + ",";
    json += "\"material\":\"" + sensores.material + "\",";
    json += "\"estado_proceso\":\"" + sensores.estadoProceso + "\",";
    json += "\"servo\":\"" + sensores.estadoServo + "\",";
    json += "\"stepper\":\"" + sensores.estadoStepper + "\",";
    json += "\"grados_rotacion\":" + String(sensores.gradosRotacion) + ",";
    json += "\"timestamp\":" + String(sensores.timestamp);
    json += "}";

    server.send(200, "application/json", json);

    Serial.println("Datos de sensores enviados");
}

void handleStatsAPI() {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    String json = "{";
    json += "\"total_procesado\":" + String(stats.totalProcesado) + ",";
    json += "\"papel\":" + String(stats.papel) + ",";
    json += "\"plastico\":" + String(stats.plastico) + ",";
    json += "\"metal\":" + String(stats.metal) + ",";
    json += "\"tiempo_operacion_segundos\":" + String(stats.tiempoOperacion / 1000);
    json += "}";

    server.send(200, "application/json", json);

    Serial.println("Estadisticas enviadas");
}

void handleFullDataAPI() {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    unsigned long tiempoSinDatos = millis() - sensores.timestamp;
    bool arduinoActivo = (tiempoSinDatos < 10000);

    String json = "{";
    json += "\"device\":\"ESP32-EcoGame\",";
    json += "\"location\":{";
    json += "\"latitude\":" + String(ESP32_LAT, 6) + ",";
    json += "\"longitude\":" + String(ESP32_LON, 6);
    json += "},";
    json += "\"arduino\":{";
    json += "\"connected\":" + String(arduinoActivo ? "true" : "false") + ",";
    json += "\"objeto_detectado\":" + String(sensores.objetoDetectado ? "true" : "false") + ",";
    json += "\"distancia\":" + String(sensores.distancia, 2) + ",";
    json += "\"sensor_ir\":" + String(sensores.valorIR) + ",";
    json += "\"material\":\"" + sensores.material + "\",";
    json += "\"estado\":\"" + sensores.estadoProceso + "\"";
    json += "},";
    json += "\"statistics\":{";
    json += "\"total\":" + String(stats.totalProcesado) + ",";
    json += "\"papel\":" + String(stats.papel) + ",";
    json += "\"plastico\":" + String(stats.plastico) + ",";
    json += "\"metal\":" + String(stats.metal);
    json += "}";
    json += "}";

    server.send(200, "application/json", json);

    Serial.println("Datos completos enviados");
}

void handleHealth() {
    server.sendHeader("Access-Control-Allow-Origin", "*");

    unsigned long tiempoSinDatos = millis() - sensores.timestamp;
    bool arduinoActivo = (tiempoSinDatos < 10000);

    String json = "{";
    json += "\"status\":\"online\",";
    json += "\"device\":\"ESP32-EcoGame\",";
    json += "\"arduino_status\":\"" + String(arduinoActivo ? "connected" : "disconnected") + "\",";
    json += "\"uptime_seconds\":" + String(millis() / 1000) + ",";
    json += "\"wifi_rssi\":" + String(WiFi.RSSI());
    json += "}";

    server.send(200, "application/json", json);
}

void handleNotFound() {
    server.send(404, "application/json", "{\"error\":\"Endpoint no encontrado\"}");
}

void procesarLineaArduino(String linea) {
    linea.trim();

    if (linea.length() == 0) return;

    sensores.timestamp = millis();

    if (linea.indexOf("OBJETO DETECTADO") != -1) {
        sensores.objetoDetectado = true;
        sensores.estadoProceso = "DETECTADO";
        Serial.println("Arduino detecto objeto");
    } else if (linea.indexOf("Distancia:") != -1) {
        int idx = linea.indexOf(":");
        if (idx != -1) {
            String valor = linea.substring(idx + 1);
            valor.replace("cm", "");
            valor.trim();
            sensores.distancia = valor.toFloat();
            Serial.print("Distancia: ");
            Serial.print(sensores.distancia);
            Serial.println(" cm");
        }
    } else if (linea.indexOf("Analizando material") != -1) {
        sensores.estadoProceso = "ANALIZANDO";
        Serial.println("Analizando material...");
    } else if (linea.indexOf("Reflexion infrarroja:") != -1 || linea.indexOf("Reflexión infrarroja:") != -1) {
        int idx = linea.indexOf(":");
        if (idx != -1) {
            String valor = linea.substring(idx + 1);
            valor.trim();
            sensores.valorIR = valor.toInt();
            sensores.promedioIR = sensores.valorIR;
            Serial.print("IR: ");
            Serial.println(sensores.valorIR);
        }
    } else if (linea.indexOf("Material:") != -1) {
        if (linea.indexOf("METAL") != -1) {
            sensores.material = "METAL";
            stats.metal++;
            Serial.println("Material: METAL");
        } else if (linea.indexOf("PLASTICO") != -1 || linea.indexOf("PLÁSTICO") != -1) {
            sensores.material = "PLASTICO";
            stats.plastico++;
            Serial.println("Material: PLASTICO");
        } else if (linea.indexOf("PAPEL") != -1) {
            sensores.material = "PAPEL";
            stats.papel++;
            Serial.println("Material: PAPEL");
        }
        stats.totalProcesado++;
        mostrarEstadisticas();
    } else if (linea.indexOf("PROCESANDO DESECHO") != -1) {
        sensores.estadoProceso = "PROCESANDO";
        Serial.println("Procesando desecho...");
    } else if (linea.indexOf("Rotando hacia contenedor") != -1) {
        sensores.estadoStepper = "ROTANDO";
        int idxGrados = linea.indexOf("(");
        int idxFin = linea.indexOf("°");
        if (idxGrados != -1 && idxFin != -1) {
            String grados = linea.substring(idxGrados + 1, idxFin);
            grados.trim();
            sensores.gradosRotacion = grados.toInt();
        }
        Serial.println("Stepper rotando " + String(sensores.gradosRotacion) + "°");
    } else if (linea.indexOf("Abriendo tapa") != -1) {
        sensores.estadoServo = "ABRIENDO";
        Serial.println("Servo abriendo tapa");
    } else if (linea.indexOf("Cerrando tapa") != -1) {
        sensores.estadoServo = "CERRANDO";
        Serial.println("Servo cerrando tapa");
    } else if (linea.indexOf("Regresando a posicion inicial") != -1 || linea.indexOf("Regresando a posición inicial") != -1) {
        sensores.estadoStepper = "REGRESANDO";
        Serial.println("Stepper regresando");
    } else if (linea.indexOf("Proceso completado") != -1) {
        sensores.estadoProceso = "COMPLETADO";
        sensores.objetoDetectado = false;
        sensores.estadoServo = "CERRADO";
        sensores.estadoStepper = "INICIAL";
        sensores.gradosRotacion = 0;
        Serial.println("Proceso completado\n");
    }
}

void mostrarEstadisticas() {
    Serial.println("\n┌─────────── ESTADÍSTICAS ESP32 ──────────┐");
    Serial.println("│ Total procesado: " + String(stats.totalProcesado));
    Serial.println("│ Papel: " + String(stats.papel));
    Serial.println("│ Plastico: " + String(stats.plastico));
    Serial.println("│ Metal: " + String(stats.metal));
    Serial.println("└──────────────────────────────────────────┘\n");
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\nESP32 - EcoGame API + Sensores Arduino\n");

    sensores.distancia = 0.0;
    sensores.objetoDetectado = false;
    sensores.valorIR = 0;
    sensores.promedioIR = 0;
    sensores.material = "NINGUNO";
    sensores.estadoProceso = "ESPERANDO";
    sensores.estadoServo = "CERRADO";
    sensores.estadoStepper = "INICIAL";
    sensores.gradosRotacion = 0;
    sensores.timestamp = 0;

    stats.totalProcesado = 0;
    stats.papel = 0;
    stats.plastico = 0;
    stats.metal = 0;
    stats.tiempoOperacion = millis();

    Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
    Serial.println("Serial2 iniciado (Arduino UNO)");
    Serial.println("RX: GPIO16, TX: GPIO17, Baudrate: 9600\n");

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    Serial.print("Conectando a WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n");
        Serial.println("Conexion WiFi establecida");
        Serial.println("SSID: " + String(ssid));
        Serial.println("IP: " + WiFi.localIP().toString());
        Serial.println("Senal: " + String(WiFi.RSSI()) + " dBm");

        if (MDNS.begin(mdnsName)) {
            Serial.println("mDNS iniciado correctamente");
            Serial.println("Nombre: " + String(mdnsName) + ".local");
            Serial.println("Flask puede encontrarme en: http://" + String(mdnsName) + ".local");
            MDNS.addService("http", "tcp", 80);
        } else {
            Serial.println("Error al iniciar mDNS (no es critico)");
        }

        server.on("/", handleRoot);
        server.on("/api/coordinates", handleCoordinatesAPI);
        server.on("/api/sensors", handleSensorsAPI);
        server.on("/api/stats", handleStatsAPI);
        server.on("/api/fulldata", handleFullDataAPI);
        server.on("/api/health", handleHealth);
        server.onNotFound(handleNotFound);

        server.begin();
        Serial.println("Servidor web iniciado en puerto 80\n");

        Serial.println("Coordenadas GPS configuradas:");
        Serial.println("Latitud: " + String(ESP32_LAT, 6));
        Serial.println("Longitud: " + String(ESP32_LON, 6));

        Serial.println("Endpoints API disponibles:");
        Serial.println("GET  /                    -> Info general");
        Serial.println("GET  /api/coordinates     -> Coordenadas GPS (Flask)");
        Serial.println("GET  /api/sensors         -> Datos sensores tiempo real");
        Serial.println("GET  /api/stats           -> Estadisticas clasificación");
        Serial.println("GET  /api/fulldata        -> Datos completos");
        Serial.println("GET  /api/health          -> Estado del sistema");

        Serial.println("Sistema listo para recibir datos del Arduino");
        Serial.println("PRUEBAS:");
        Serial.println("http://" + WiFi.localIP().toString() + "/api/coordinates");
        Serial.println("http://" + WiFi.localIP().toString() + "/api/sensors");
        Serial.println("http://" + WiFi.localIP().toString() + "/api/fulldata\n");
    } else {
        Serial.println("\nERROR: No se pudo conectar al WiFi");
        Serial.println("Verifica SSID y contraseña\n");
    }

    Serial.println("Esperando datos del Arduino UNO...\n");
}

void loop() {
    server.handleClient();

    while (Serial2.available() > 0) {
        char c = Serial2.read();
        if (c == '\n') {
            if (bufferSerial.length() > 0) {
                procesarLineaArduino(bufferSerial);
                bufferSerial = "";
            }
        } else if (c != '\r') {
            bufferSerial += c;
        }
    }

    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 30000) {
        lastDebug = millis();

        unsigned long tiempoSinDatos = millis() - sensores.timestamp;
        String arduinoStatus = (tiempoSinDatos < 10000) ? "CONECTADO" : "DESCONECTADO";

        Serial.println("========================================");
        Serial.println("Sistema OK");
        Serial.println("IP: " + WiFi.localIP().toString());
        Serial.println("RSSI: " + String(WiFi.RSSI()) + " dBm");
        Serial.println("Arduino: " + arduinoStatus);
        Serial.println("Procesados: " + String(stats.totalProcesado));
        Serial.println("========================================\n");
    }
}