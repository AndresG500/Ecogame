#include <CheapStepper.h>
#include <Servo.h>

#define TRIG_PIN 12
#define ECHO_PIN 13
#define IR_PIN A0
#define SERVO_PIN 6
#define STEPPER_PIN1 2
#define STEPPER_PIN2 3
#define STEPPER_PIN3 4
#define STEPPER_PIN4 5

Servo servoTapa;
CheapStepper stepper(STEPPER_PIN1, STEPPER_PIN2, STEPPER_PIN3, STEPPER_PIN4);

const float DISTANCIA_DETECCION = 8.0;
const int LECTURAS_PROMEDIO = 8;
const int STEPPER_RPM = 15;
const int SERVO_CERRADO = 20;
const int SERVO_ABIERTO = 180;
const int GRADOS_PAPEL = 240;
const int GRADOS_PLASTICO = 115;
const int GRADOS_METAL = 4;
const int UMBRAL_METAL = 700;
const int UMBRAL_PLASTICO = 400;

enum Material {
    NINGUNO,
    PAPEL,
    PLASTICO,
    METAL
};

unsigned long ultimaDeteccion = 0;
const unsigned long TIEMPO_ESPERA = 3000;

void enviarDatoESP32(String clave, String valor) {
    Serial.print(clave);
    Serial.print(":");
    Serial.println(valor);
    Serial.flush();
    delay(10);
}

void enviarDatoESP32(String clave, float valor) {
    Serial.print(clave);
    Serial.print(":");
    Serial.println(valor, 2);
    Serial.flush();
    delay(10);
}

void enviarDatoESP32(String clave, int valor) {
    Serial.print(clave);
    Serial.print(":");
    Serial.println(valor);
    Serial.flush();
    delay(10);
}

void setup() {
    Serial.begin(9600);

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(IR_PIN, INPUT);

    servoTapa.attach(SERVO_PIN);
    servoTapa.write(SERVO_CERRADO);

    stepper.setRpm(STEPPER_RPM);

    Serial.println("SISTEMA DE CLASIFICACION DE RESIDUOS");
    Serial.println("Sistema listo. Esperando objetos...");

    enviarDatoESP32("SISTEMA", "INICIADO");
    enviarDatoESP32("ESTADO", "ESPERANDO");

    delay(1000);
}

float obtenerDistancia() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duracion = pulseIn(ECHO_PIN, HIGH, 30000);

    if (duracion == 0) {
        return -1;
    }

    return duracion * 0.0343 / 2;
}

Material clasificarMaterial() {
    Serial.println("Analizando material...");

    enviarDatoESP32("ESTADO", "ANALIZANDO");

    long sumaLecturas = 0;
    int lecturasValidas = 0;

    for (int i = 0; i < LECTURAS_PROMEDIO; i++) {
        int valorIR = analogRead(IR_PIN);

        if (valorIR > 0) {
            sumaLecturas += valorIR;
            lecturasValidas++;
        }

        delay(50);
    }

    if (lecturasValidas < LECTURAS_PROMEDIO / 2) {
        Serial.println("ERROR: Lecturas insuficientes");
        enviarDatoESP32("ERROR", "LECTURAS_INSUFICIENTES");
        return NINGUNO;
    }

    int promedioIR = sumaLecturas / lecturasValidas;

    Serial.print("Reflexion infrarroja: ");
    Serial.println(promedioIR);

    enviarDatoESP32("IR_VALOR", promedioIR);

    Material material;
    String nombreMaterial;

    if (promedioIR >= UMBRAL_METAL) {
        material = METAL;
        nombreMaterial = "METAL";
        Serial.println("Material: METAL (alta reflexion)");
    } else if (promedioIR >= UMBRAL_PLASTICO) {
        material = PLASTICO;
        nombreMaterial = "PLASTICO";
        Serial.println("Material: PLASTICO (reflexion media)");
    } else {
        material = PAPEL;
        nombreMaterial = "PAPEL";
        Serial.println("Material: PAPEL (baja reflexion)");
    }

    enviarDatoESP32("MATERIAL", nombreMaterial);

    return material;
}

void posicionarContenedor(Material material) {
    int grados = 0;
    String nombreContenedor = "";

    switch (material) {
        case PAPEL:
            grados = GRADOS_PAPEL;
            nombreContenedor = "PAPEL";
            break;
        case PLASTICO:
            grados = GRADOS_PLASTICO;
            nombreContenedor = "PLASTICO";
            break;
        case METAL:
            grados = GRADOS_METAL;
            nombreContenedor = "METAL";
            break;
        default:
            return;
    }

    if (grados > 0) {
        Serial.print("Rotando hacia contenedor de ");
        Serial.print(nombreContenedor);
        Serial.print(" (");
        Serial.print(grados);
        Serial.println(" degrees)");

        enviarDatoESP32("STEPPER", "ROTANDO_" + nombreContenedor);
        enviarDatoESP32("GRADOS", grados);

        stepper.moveDegreesCW(grados);
        delay(500);
    } else {
        Serial.print("Contenedor de ");
        Serial.print(nombreContenedor);
        Serial.println(" ya esta en posicion");
        enviarDatoESP32("STEPPER", "POSICION_" + nombreContenedor);
    }
}

void abrirTapa() {
    Serial.println("Abriendo tapa...");
    enviarDatoESP32("SERVO", "ABRIENDO");
    servoTapa.write(SERVO_ABIERTO);
    delay(1500);
}

void cerrarTapa() {
    Serial.println("Cerrando tapa...");
    enviarDatoESP32("SERVO", "CERRANDO");
    servoTapa.write(SERVO_CERRADO);
    delay(1000);
    enviarDatoESP32("SERVO", "CERRADO");
}

void regresarPosicionInicial(Material material) {
    int grados = 0;

    switch (material) {
        case PAPEL:
            grados = GRADOS_PAPEL;
            break;
        case PLASTICO:
            grados = GRADOS_PLASTICO;
            break;
        case METAL:
            grados = 0;
            break;
        default:
            return;
    }

    if (grados > 0) {
        Serial.println("Regresando a posicion inicial...");
        enviarDatoESP32("STEPPER", "REGRESANDO");
        stepper.moveDegreesCCW(grados);
        delay(500);
    }

    enviarDatoESP32("STEPPER", "INICIAL");
}

void procesarDesecho(Material material) {
    Serial.println("Procesando desecho...");
    enviarDatoESP32("PROCESO", "INICIADO");

    posicionarContenedor(material);
    abrirTapa();
    cerrarTapa();
    regresarPosicionInicial(material);

    Serial.println("Proceso completado");

    enviarDatoESP32("PROCESO", "COMPLETADO");
    enviarDatoESP32("ESTADO", "ESPERANDO");
}

void loop() {
    if (millis() - ultimaDeteccion < TIEMPO_ESPERA) {
        return;
    }

    float distancia = obtenerDistancia();

    if (distancia > 0 && distancia <= DISTANCIA_DETECCION) {
        Serial.println("Objeto detectado");
        Serial.print("Distancia: ");
        Serial.print(distancia);
        Serial.println(" cm");

        enviarDatoESP32("DISTANCIA", distancia);
        enviarDatoESP32("ESTADO", "DETECTADO");

        delay(500);

        Material materialDetectado = clasificarMaterial();

        if (materialDetectado != NINGUNO) {
            procesarDesecho(materialDetectado);
            ultimaDeteccion = millis();
        }

        Serial.println();
    }

    delay(200);
}