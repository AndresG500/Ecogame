document.addEventListener('DOMContentLoaded', function() {
    const gamesButton = document.querySelectorAll('.container-event button')[2];
    
    const gamesModal = createGamesModal();
    document.body.appendChild(gamesModal);

    gamesButton.addEventListener('click', function() {
        gamesModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    const closeBtn = gamesModal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        gamesModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    gamesModal.addEventListener('click', function(e) {
        if (e.target === gamesModal) {
            gamesModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});

function createGamesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'gamesModal';
    
    modal.innerHTML = `
        <div class="modal-content modal-games">
            <button class="modal-close">
                <i class="fa-solid fa-xmark"></i>
            </button>
            
            <div class="container-games">
                <h2>Juegos</h2>
                
                <div class="container-games-grid">
                    ${generateGameItems()}
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function generateGameItems() {
    const games = [
        {
            name: 'Tres en Ralla',
            image: '../static/Img/3lineas.png',
            description: 'Juego clasico de 3 en raya contra la computadora',
            url: '/juego3' 
        },
        {
            name: 'Piedra, Papel o Tijera',
            image: '../static/Img/piedra.png',
            description: 'Juego clásico contra la computadora',
            url: '/juego2'
        },
    ];
    
    let items = '';
    games.forEach((game, index) => {
        items += `
            <div class="item-game" data-game="${index}">
                <div class="game-icon-container">
                    <figure>
                        <img src="${game.image}" alt="${game.name}" class="game-image">
                    </figure>
                    <div class="game-icon-overlay">
                        <i class="fa-solid ${game.icon}"></i>
                    </div>
                </div>
                
                <h3 class="game-name">${game.name}</h3>
                <p class="game-description">${game.description}</p>
                
                <button class="btn-play" data-game-url="${game.url}">
                    <i class="fa-solid fa-play"></i>
                    Jugar
                </button>
            </div>
        `;
    });
    return items;
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-play') || e.target.parentElement.classList.contains('btn-play')) {
        const button = e.target.classList.contains('btn-play') ? e.target : e.target.parentElement;
        const gameUrl = button.getAttribute('data-game-url');

        if (gameUrl) {
            window.location.href = gameUrl;
        }
    }
});