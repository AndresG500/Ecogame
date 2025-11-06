const HUMAN = "X";
const AI = "O";

const POINTS_PER_WIN = 50;
const MAX_LIVES = 3;

const WINNERS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let tablero = Array(9).fill(null);
let juegoTerminado = false;
let bloqueado = false;
let currentLives = MAX_LIVES;
let sessionPoints = 0;

const botones = Array.from(document.querySelectorAll(".tablero .casilla"));
const livesCounter = document.getElementById("livesCounter");
const pointsCounter = document.getElementById("pointsCounter");
const sessionPointsDisplay = document.getElementById("sessionPoints");
const gameOverModal = document.getElementById("gameOverModal");
const playAgainBtn = document.getElementById("playAgainBtn");
const finalSessionPoints = document.getElementById("finalSessionPoints");

function cargarDatos() {
  const datos = localStorage.getItem('ecoGameUser');
  if (datos) {
    return JSON.parse(datos);
  }
  return {
    puntos: 0,
    inventario: [],
    skinEquipada: null
  };
}

function guardarDatos(datos) {
  localStorage.setItem('ecoGameUser', JSON.stringify(datos));
}

function agregarPuntos(cantidad) {
  const datos = cargarDatos();
  datos.puntos += cantidad;
  guardarDatos(datos);
  actualizarPuntosDisplay();
}

function actualizarPuntosDisplay() {
  const datos = cargarDatos();
  if (pointsCounter) {
    pointsCounter.textContent = datos.puntos;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  actualizarPuntosDisplay();
  livesCounter.textContent = currentLives;
  sessionPointsDisplay.textContent = sessionPoints;
  render();
});

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    resetearTodoElJuego();
  });
}

function pintaFicha(idx, quien) {
  const btn = botones[idx];
  if (!btn) return;
  btn.innerHTML = "";
  if (quien === HUMAN) {
    btn.innerHTML = '<img src="../static/Img/fichax.png" alt="X" class="ficha-btn">';
    btn.setAttribute("aria-label", "X");
  } else if (quien === AI) {
    btn.innerHTML = '<img src="../static/Img/fichao.png" alt="O" class="ficha-btn">';
    btn.setAttribute("aria-label", "O");
  } else {
    btn.removeAttribute("aria-label");
  }
  btn.disabled = tablero[idx] !== null || juegoTerminado;
}

function render() {
  tablero.forEach((val, i) => pintaFicha(i, val));
  if (juegoTerminado) {
    botones.forEach((b) => (b.disabled = true));
  } else {
    botones.forEach((b, i) => (b.disabled = tablero[i] !== null || bloqueado));
  }
}

function hayGanador(tab) {
  for (const [a, b, c] of WINNERS) {
    if (tab[a] && tab[a] === tab[b] && tab[a] === tab[c]) {
      return tab[a];
    }
  }
  return null;
}

function tableroLleno(tab) {
  return tab.every((c) => c !== null);
}

function mostrarModal(mensaje, tipo) {
  const iconoDiv = document.getElementById("icono-resultado");
  
  if (tipo === 'win') {
    iconoDiv.innerHTML = '<i class="fa-solid fa-trophy" style="color: #4caf50;"></i>';
  } else if (tipo === 'lose') {
    iconoDiv.innerHTML = '<i class="fa-solid fa-face-sad-tear" style="color: #ff4757;"></i>';
  } else {
    iconoDiv.innerHTML = '<i class="fa-solid fa-handshake" style="color: #FFD700;"></i>';
  }
  
  document.getElementById("texto-modal").textContent = mensaje;
  document.getElementById("modal-mensaje").style.display = "block";
}

document.getElementById("cerrar-modal").onclick = () => {
  document.getElementById("modal-mensaje").style.display = "none";

  if (currentLives <= 0) {
    setTimeout(() => {
      showGameOver();
    }, 300);
  }
};

function finalizarSiCorresponde() {
  const ganador = hayGanador(tablero);
  if (ganador) {
    juegoTerminado = true;
    render();
    
    if (ganador === HUMAN) {
      sessionPoints += POINTS_PER_WIN;
      sessionPointsDisplay.textContent = sessionPoints;
      agregarPuntos(POINTS_PER_WIN);
      showPointsAnimation(POINTS_PER_WIN);
      mostrarModal("¡Ganaste! 🎉", 'win');
    } else {

      currentLives--;
      livesCounter.textContent = currentLives;
      animateLifeLoss();
      mostrarModal("La máquina gana 🤖", 'lose');
    }
    return;
  }
  
  if (tableroLleno(tablero)) {
    juegoTerminado = true;
    render();
    mostrarModal("¡Empate! 😐", 'tie');
  }
}

function turnoIA() {
  bloqueado = true;
  render();
  
  setTimeout(() => {
    const libres = tablero.map((v, i) => (v === null ? i : null)).filter((i) => i !== null);
    if (libres.length === 0 || juegoTerminado) {
      bloqueado = false;
      render();
      return;
    }
    
    let idx = buscarJugadaGanadora(AI);
    if (idx === -1) idx = buscarJugadaGanadora(HUMAN);
    if (idx === -1) {
      idx = libres[Math.floor(Math.random() * libres.length)];
    }
    
    tablero[idx] = AI;
    bloqueado = false;
    render();
    finalizarSiCorresponde();
  }, 500);
}

function buscarJugadaGanadora(jugador) {
  for (const [a, b, c] of WINNERS) {
    const linea = [tablero[a], tablero[b], tablero[c]];
    const vacias = [a, b, c].filter(i => tablero[i] === null);
    const cuenta = linea.filter(v => v === jugador).length;
    
    if (cuenta === 2 && vacias.length === 1) {
      return vacias[0];
    }
  }
  return -1;
}

window.marcarCelda = (numero) => {
  if (juegoTerminado || bloqueado || currentLives <= 0) return;
  const i = Number(numero) - 1;
  if (i < 0 || i > 8) return;
  if (tablero[i] !== null) return;
  
  tablero[i] = HUMAN;
  render();
  finalizarSiCorresponde();
  if (!juegoTerminado) turnoIA();
};

window.reiniciarJuego = () => {
  if (currentLives <= 0) return; 
  
  tablero = Array(9).fill(null);
  juegoTerminado = false;
  bloqueado = false;
  render();
};

function showPointsAnimation(points) {
  const animation = document.createElement('div');
  animation.className = 'points-animation';
  animation.innerHTML = `<i class="fa-solid fa-star"></i> +${points} puntos`;
  document.body.appendChild(animation);
  
  setTimeout(() => {
    animation.remove();
  }, 2000);
}

function animateLifeLoss() {
  const livesDisplay = document.querySelector('.lives-display');
  livesDisplay.style.animation = 'none';
  setTimeout(() => {
    livesDisplay.style.animation = '';
  }, 10);
}

function showGameOver() {
  finalSessionPoints.textContent = sessionPoints;
  gameOverModal.style.display = 'flex';
  juegoTerminado = true;
  bloqueado = true;
  render();
}

function resetearTodoElJuego() {
  currentLives = MAX_LIVES;
  sessionPoints = 0;
  tablero = Array(9).fill(null);
  juegoTerminado = false;
  bloqueado = false;

  livesCounter.textContent = currentLives;
  sessionPointsDisplay.textContent = sessionPoints;
  
  gameOverModal.style.display = 'none';

  render();
}

render();