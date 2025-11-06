from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
import requests
import socket
import threading
import time
import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import bcrypt

app = Flask(__name__)
app.secret_key = "your_secret_key"

db = None

def inicializar_firebase():
    global db
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_dir)
        
        if not os.path.exists(cred_path):
            print("ERROR: No se encontro el archivo de credenciales")
            return None

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)

        db = firestore.client()
        print("Conexion exitosa a Firestore")
        return db
        
    except Exception as e:
        print(f"Error al conectar con Firebase: {e}")
        return None

inicializar_firebase()

def registrar_usuario_db(nombre, correo, password):
    global db
    if db is None:
        return False

    try:
        q = db.collection('Usuarios').where('correo', '==', correo).limit(1).get()
        if q:
            return False

        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

        doc_ref = db.collection('Usuarios').document()
        doc_ref.set({
            'nombre': nombre,
            'correo': correo,
            'password_hash': hashed,
            'estadisticas': {
                'total_reciclado': 0,
                'papel': 0,
                'plastico': 0,
                'metal': 0
            },
            'fecha_registro': firestore.SERVER_TIMESTAMP
        })
        return True
        
    except Exception as ex:
        print(f"Error al agregar usuario: {ex}")
        return False

def verificar_usuario_db(correo, password):
    global db
    if db is None:
        return None

    try:
        q = db.collection('Usuarios').where('correo', '==', correo).limit(1).get()
        
        if not q:
            return None

        doc = q[0]
        data = doc.to_dict()
        password_hash = data.get('password_hash')

        if not password_hash:
            return None

        if bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            return {
                'id': doc.id,
                'nombre': data.get('nombre'),
                'correo': data.get('correo'),
                'estadisticas': data.get('estadisticas', {
                    'total_reciclado': 0,
                    'papel': 0,
                    'plastico': 0,
                    'metal': 0
                })
            }
        else:
            return None
            
    except Exception as ex:
        print(f"Error en verificacion: {ex}")
        return None

def guardar_material_reciclado(user_id, material):
    global db
    if db is None or user_id is None:
        return False
    
    try:
        material = material.upper()
        
        if material not in ['PAPEL', 'PLASTICO', 'METAL']:
            return False
        
        user_ref = db.collection('Usuarios').document(user_id)
        
        updates = {
            'estadisticas.total_reciclado': firestore.Increment(1),
            f'estadisticas.{material.lower()}': firestore.Increment(1)
        }
        
        user_ref.update(updates)
        
        print(f"Material {material} guardado para usuario {user_id}")
        return True
        
    except Exception as e:
        print(f"Error al guardar material: {e}")
        return False

esp32_ip = None
esp32_data = {
    'coordinates': {
        'latitude': None,
        'longitude': None,
        'status': 'searching'
    },
    'sensors': {
        'distancia': 0.0,
        'valorIR': 0,
        'material': 'NINGUNO',
        'estadoProceso': 'ESPERANDO',
        'timestamp': 0
    },
    'stats': {
        'total': 0,
        'papel': 0,
        'plastico': 0,
        'metal': 0
    },
    'last_update': None,
    'arduino_connected': False
}

ultimo_material_guardado = {'material': None, 'timestamp': 0}

def scan_local_network():
    global esp32_ip
    
    print("Escaneando red local...")
    
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        network_prefix = '.'.join(local_ip.split('.')[:-1])
        
        print(f"Red detectada: {network_prefix}.x")
        
        found = False
        for i in range(1, 255):
            if found:
                break
                
            ip = f"{network_prefix}.{i}"
            
            if ip == local_ip:
                continue
            
            try:
                response = requests.get(f"http://{ip}/api/health", timeout=0.3)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'ESP32' in str(data):
                        esp32_ip = ip
                        print(f"ESP32 encontrado en: {esp32_ip}")
                        fetch_esp32_data()
                        found = True
                        return True
                        
            except:
                pass
        
        if not found:
            print("ESP32 no encontrado")
            return False
        
    except Exception as e:
        print(f"Error al escanear red: {e}")
        return False

def fetch_esp32_data():
    global esp32_ip, esp32_data
    
    if not esp32_ip:
        esp32_data['coordinates']['status'] = 'not_found'
        return False
    
    try:
        response = requests.get(f"http://{esp32_ip}/api/fulldata", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            esp32_data['coordinates'] = {
                'latitude': data.get('location', {}).get('latitude'),
                'longitude': data.get('location', {}).get('longitude'),
                'status': 'ok'
            }
            
            arduino_data = data.get('arduino', {})
            esp32_data['sensors'] = {
                'distancia': arduino_data.get('distancia', 0.0),
                'valorIR': arduino_data.get('sensor_ir', 0),
                'material': arduino_data.get('material', 'NINGUNO'),
                'estadoProceso': arduino_data.get('estado', 'ESPERANDO'),
                'timestamp': time.time()
            }
            
            stats_data = data.get('statistics', {})
            esp32_data['stats'] = {
                'total': stats_data.get('total', 0),
                'papel': stats_data.get('papel', 0),
                'plastico': stats_data.get('plastico', 0),
                'metal': stats_data.get('metal', 0)
            }
            
            esp32_data['arduino_connected'] = arduino_data.get('connected', False)
            esp32_data['last_update'] = time.time()
            
            verificar_y_guardar_material()
            
            return True
            
    except requests.exceptions.Timeout:
        esp32_data['coordinates']['status'] = 'timeout'
    except requests.exceptions.ConnectionError:
        esp32_data['coordinates']['status'] = 'connection_error'
    except Exception as e:
        esp32_data['coordinates']['status'] = 'error'
    
    return False

def verificar_y_guardar_material():
    global ultimo_material_guardado, esp32_data
    
    material_actual = esp32_data['sensors']['material']
    estado_proceso = esp32_data['sensors']['estadoProceso']
    timestamp_actual = esp32_data['sensors']['timestamp']
    
    if (estado_proceso == 'COMPLETADO' and 
        material_actual in ['PAPEL', 'PLASTICO', 'METAL'] and
        (material_actual != ultimo_material_guardado['material'] or 
         timestamp_actual - ultimo_material_guardado['timestamp'] > 5)):
        
        user_id = session.get('user_id')
        
        if user_id:
            if guardar_material_reciclado(user_id, material_actual):
                ultimo_material_guardado['material'] = material_actual
                ultimo_material_guardado['timestamp'] = timestamp_actual
                print(f"Material {material_actual} guardado en Firebase")

def discover_esp32():
    print("Iniciando busqueda de ESP32")
    
    if scan_local_network():
        print("ESP32 configurado y listo")
        start_esp32_monitoring()
    else:
        print("ESP32 no encontrado")

def monitor_esp32():
    global esp32_ip
    
    while True:
        if esp32_ip:
            try:
                fetch_esp32_data()
            except Exception as e:
                print(f"Error en monitoreo: {e}")
        
        time.sleep(3)

def start_esp32_monitoring():
    monitor_thread = threading.Thread(target=monitor_esp32, daemon=True)
    monitor_thread.start()
    print("Monitoreo continuo iniciado")

def background_discovery():
    time.sleep(2)
    discover_esp32()

discovery_thread = threading.Thread(target=background_discovery, daemon=True)
discovery_thread.start()

@app.route("/")
def index():
    return render_template("home.html")

@app.route("/formlogin", methods=["GET", "POST"])
def formlogin():
    if request.method == "POST":
        correo = request.form.get("correo", "").strip()
        password = request.form.get("pasword", "").strip()

        if not correo or not password:
            flash('Por favor, completa todos los campos', 'danger')
            return redirect(url_for('formlogin'))

        usuario = verificar_usuario_db(correo, password)
        
        if usuario is not None:
            session['user_id'] = usuario['id']
            session['user_name'] = usuario['nombre']
            session['user_email'] = usuario['correo']
            session['user_stats'] = usuario['estadisticas']
            
            flash(f'Bienvenido {usuario["nombre"]}!', 'success')
            return redirect(url_for('ecogame'))
        else:
            flash('Usuario o contrasena incorrectos', 'danger')
            return redirect(url_for('formlogin'))

    return render_template("formulario.html")

@app.route("/formregister", methods=["GET", "POST"])
def formregister():
    if request.method == 'POST':
        nombre = request.form.get('nombre', '').strip()
        correo = request.form.get('correo', '').strip()
        password = request.form.get('pasword', '').strip()

        if not nombre or not correo or not password:
            flash('Por favor, completa todos los campos', 'danger')
            return redirect(url_for('formregister'))

        if registrar_usuario_db(nombre, correo, password):
            flash('Usuario registrado correctamente', 'success')
            return redirect(url_for('formlogin'))
        else:
            flash('Error al registrar el usuario', 'danger')
            return redirect(url_for('formregister'))

    return render_template('formulario.html')

@app.route("/ecogame")
def ecogame():
    if 'user_id' not in session:
        flash('Debes iniciar sesion primero', 'warning')
        return redirect(url_for('formlogin'))
    
    user_name = session.get('user_name', 'Usuario')
    return render_template("ecogame.html", user_name=user_name)

@app.route("/logout")
def logout():
    user_name = session.get('user_name', 'Usuario')
    session.clear()
    flash(f'Hasta pronto {user_name}', 'info')
    return redirect(url_for('formlogin'))

@app.route("/juego2")
def juego2():
    if 'user_id' not in session:
        flash('Debes iniciar sesion primero', 'warning')
        return redirect(url_for('formlogin'))
    user_name = session.get('user_name', 'Usuario')
    return render_template("juego2.html", user_name=user_name)

@app.route("/juego3")
def juego3():
    if 'user_id' not in session:
        flash('Debes iniciar sesion primero', 'warning')
        return redirect(url_for('formlogin'))
    user_name = session.get('user_name', 'Usuario')
    return render_template("juego3.html", user_name=user_name)

@app.route("/juego")
def juego():
    if 'user_id' not in session:
        flash('Debes iniciar sesion primero', 'warning')
        return redirect(url_for('formlogin'))
    
    if esp32_data['coordinates']['status'] != 'ok':
        if esp32_ip:
            fetch_esp32_data()
        else:
            threading.Thread(target=discover_esp32, daemon=True).start()
    
    user_name = session.get('user_name', 'Usuario')
    return render_template("juego.html", 
        user_name=user_name,
        esp32_coords=esp32_data['coordinates'],
        esp32_status=esp32_data['coordinates']['status'])

@app.route("/api/esp32/coordinates")
def api_get_coordinates():
    return jsonify(esp32_data['coordinates'])

@app.route("/api/esp32/sensors")
def api_get_sensors():
    return jsonify({
        'sensors': esp32_data['sensors'],
        'arduino_connected': esp32_data['arduino_connected'],
        'last_update': esp32_data['last_update']
    })

@app.route("/api/esp32/stats")
def api_get_stats():
    return jsonify(esp32_data['stats'])

@app.route("/api/esp32/fulldata")
def api_get_fulldata():
    return jsonify(esp32_data)

@app.route("/api/esp32/status")
def api_esp32_status():
    status = {
        'connected': esp32_ip is not None,
        'ip': esp32_ip,
        'coordinates_status': esp32_data['coordinates']['status'],
        'arduino_connected': esp32_data['arduino_connected'],
        'last_update': esp32_data['last_update']
    }
    return jsonify(status)

@app.route("/api/user/stats")
def api_user_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'No hay sesion activa'}), 401
    
    try:
        user_ref = db.collection('Usuarios').document(session['user_id'])
        user_doc = user_ref.get()
        
        if user_doc.exists:
            data = user_doc.to_dict()
            return jsonify({
                'nombre': data.get('nombre'),
                'estadisticas': data.get('estadisticas', {})
            })
        else:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/esp32/rediscover")
def api_rediscover():
    def rediscover_task():
        global esp32_ip
        esp32_ip = None
        discover_esp32()
    
    threading.Thread(target=rediscover_task, daemon=True).start()
    return jsonify({
        'status': 'searching', 
        'message': 'Buscando ESP32 en la red'
    })

@app.route("/api/esp32/manual-search")
def manual_search():
    result = scan_local_network()
    
    return jsonify({
        'success': result,
        'esp32_ip': esp32_ip,
        'esp32_data': esp32_data
    })

if __name__ == "__main__":
    print("="*60)
    print("ECOGAME - Servidor Flask con ESP32 + Arduino")
    print("="*60)
    print("Flask: http://0.0.0.0:5000")
    print("PC: http://localhost:5000")
    print("="*60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)