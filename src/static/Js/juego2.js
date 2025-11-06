const ROCK = "rock";
const PAPER = "paper";
const SCISSOR = "scissors";

const TIE = 0;
const WIN = 1;
const LOSE = 2;

const POINTS_PER_WIN = 50;
const MAX_LIVES = 3;

let currentLives = MAX_LIVES;
let sessionPoints = 0;
let isPlaying = false;

const rockbton = document.getElementById("piedra");
const paperbton = document.getElementById("papel");
const scissorbton = document.getElementById("tijera");
const resultext = document.getElementById("start-text");
const userimg = document.getElementById("user-img");
const machineimg = document.getElementById("machine-img");
const livesCounter = document.getElementById("livesCounter");
const pointsCounter = document.getElementById("pointsCounter");
const sessionPointsDisplay = document.getElementById("sessionPoints");
const gameButtons = document.getElementById("gameButtons");
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
});

rockbton.addEventListener("click", () => {
    if (!isPlaying) play(ROCK);
});

paperbton.addEventListener("click", () => {
    if (!isPlaying) play(PAPER);
});

scissorbton.addEventListener("click", () => {
    if (!isPlaying) play(SCISSOR);
});

playAgainBtn.addEventListener("click", () => {
    resetGame();
});

function play(userOption) {
    if (currentLives <= 0) return;
    
    isPlaying = true;
    userimg.src = "static/Img/" + userOption + ".svg";
    resultext.innerText = "Pensando...";
    resultext.className = "start-text";

    disableButtons(true);

    const interval = setInterval(function() {
        const machineOption = calcMachineOption();
        machineimg.src = "static/Img/" + machineOption + ".svg";
    }, 100);

    setTimeout(function() {
        clearInterval(interval);

        const machineOption = calcMachineOption();
        const result = calcResult(userOption, machineOption);

        machineimg.src = "static/Img/" + machineOption + ".svg";

        processResult(result);
        
        isPlaying = false;
        disableButtons(false);
    }, 2000);
}

function processResult(result) {
    switch(result) {
        case TIE:
            resultext.classList.add("tie");
            resultext.innerText = "¡Empate!";
            break;
            
        case WIN:
            resultext.classList.add("win");
            resultext.innerText = "¡Ganaste!";

            sessionPoints += POINTS_PER_WIN;
            sessionPointsDisplay.textContent = sessionPoints;
            agregarPuntos(POINTS_PER_WIN);

            showPointsAnimation(POINTS_PER_WIN);
            break;
            
        case LOSE:
            resultext.classList.add("lose");
            resultext.innerText = "¡Perdiste!";

            currentLives--;
            livesCounter.textContent = currentLives;

            animateLifeLoss();
            
            // Verificar Game Over
            if (currentLives <= 0) {
                setTimeout(() => {
                    showGameOver();
                }, 1500);
            }
            break;
    }
}

function calcMachineOption() {
    const number = Math.floor(Math.random() * 3);
    switch(number) {
        case 0:
            return ROCK;
        case 1:
            return PAPER;
        case 2:
            return SCISSOR;
    }
}

function calcResult(userOption, machineOption) {
    if (userOption === machineOption) {
        return TIE;
    } else if (userOption === ROCK) {
        if (machineOption === PAPER) return LOSE;
        if (machineOption === SCISSOR) return WIN;
    } else if (userOption === PAPER) {
        if (machineOption === SCISSOR) return LOSE;
        if (machineOption === ROCK) return WIN;
    } else if (userOption === SCISSOR) {
        if (machineOption === ROCK) return LOSE;
        if (machineOption === PAPER) return WIN;
    }
}

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

function disableButtons(disable) {
    rockbton.disabled = disable;
    paperbton.disabled = disable;
    scissorbton.disabled = disable;
    
    if (disable) {
        gameButtons.style.opacity = '0.5';
        gameButtons.style.pointerEvents = 'none';
    } else {
        gameButtons.style.opacity = '1';
        gameButtons.style.pointerEvents = 'auto';
    }
}

function showGameOver() {
    finalSessionPoints.textContent = sessionPoints;
    gameOverModal.style.display = 'flex';
    disableButtons(true);
}

function resetGame() {
    currentLives = MAX_LIVES;
    sessionPoints = 0;
    isPlaying = false;

    livesCounter.textContent = currentLives;
    sessionPointsDisplay.textContent = sessionPoints;
    resultext.innerText = "Elige una opción";
    resultext.className = "start-text";

    userimg.src = "static/Img/rock.svg";
    machineimg.src = "static/Img/rock.svg";

    gameOverModal.style.display = 'none';

    disableButtons(false);
}