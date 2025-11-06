document.addEventListener('DOMContentLoaded', function() {
    const inventoryButton = document.getElementById('armario');

    const inventoryModal = createInventoryModal();
    document.body.appendChild(inventoryModal);

    inventoryButton.addEventListener('click', function() {
        updateInventoryDisplay();
        inventoryModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    const closeBtn = inventoryModal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        inventoryModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    inventoryModal.addEventListener('click', function(e) {
        if (e.target === inventoryModal) {
            inventoryModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});


const AllItems = [
    {   
        id: 1,
        name: 'Personaje con gafas',
        img: '../static/Img/PersonajeGafas.png',
        precio: 500
    },
    {   
        id: 2,
        name: 'Personaje con flores',
        img: '../static/Img/PersonajeFlores.png',
        precio: 250
    },
    {   
        id: 3,
        name: 'Pirata',
        img: '../static/Img/pirata.png',
        precio: 300
    },
    {
        id: 4,
        name: 'Policia',
        img: '../static/Img/policia.png',
        precio: 400
    },
    {
        id: 5,
        name: 'Perro',
        img: '../static/Img/perro.png',
        precio: 200
    },
    {
        id: 6,
        name: 'Gato',
        img: '../static/Img/gato.png',
        precio: 150
    }
];

function obtenerDatosUsuario() {
    const datos = localStorage.getItem('ecoGameUser');
    if (datos) {
        return JSON.parse(datos);
    }
    return {
        puntos: 1250,
        inventario: [],
        skinEquipada: null
    };
}

function guardarDatosUsuario(datos) {
    localStorage.setItem('ecoGameUser', JSON.stringify(datos));
}

function obtenerItemsComprados() {
    const datos = obtenerDatosUsuario();
    return AllItems.filter(item => datos.inventario.includes(item.id));
}

function equiparSkin(itemId) {
    const datos = obtenerDatosUsuario();

    if (!datos.inventario.includes(itemId)) {
        showInventoryNotification('No tienes este item', 'error');
        return false;
    }

    datos.skinEquipada = itemId;
    guardarDatosUsuario(datos);

    cambiarPersonajePrincipal(itemId);

    updateInventoryDisplay();
    
    showInventoryNotification('¡Skin equipada exitosamente!', 'success');
    return true;
}

function cambiarPersonajePrincipal(itemId) {
    const personajeImg = document.querySelector('.figuraone');
    if (!personajeImg) return;
    
    const item = AllItems.find(i => i.id === itemId);
    if (item) {
        personajeImg.src = item.img;
        personajeImg.alt = item.name;
    }
}

function desequiparSkin() {
    const datos = obtenerDatosUsuario();
    datos.skinEquipada = null;
    guardarDatosUsuario(datos);
    
    // Volver al personaje por defecto
    const personajeImg = document.querySelector('.figuraone');
    if (personajeImg) {
        personajeImg.src = '../static/Img/figura.png';
        personajeImg.alt = 'figura';
    }
    
    updateInventoryDisplay();
    showInventoryNotification('Skin desequipada', 'success');
}

function createInventoryModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'inventoryModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">
                <i class="fa-solid fa-xmark"></i>
            </button>
            
            <div class="container-clothe">
                <h2>Mi Inventario</h2>
                
                <div id="inventoryContainer" class="container-image">
                    <!-- Se genera dinámicamente -->
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function updateInventoryDisplay() {
    const container = document.getElementById('inventoryContainer');
    if (!container) return;
    
    const itemsComprados = obtenerItemsComprados();
    const datos = obtenerDatosUsuario();

    if (itemsComprados.length === 0) {
        container.innerHTML = `
            <div class="empty-inventory">
                <i class="fa-solid fa-box-open"></i>
                <p>No tienes items aún</p>
                <p class="empty-text">¡Visita la tienda para comprar skins!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = itemsComprados.map(item => {
        const isEquipped = datos.skinEquipada === item.id;
        
        return `
            <div class="item-clothe">
                <img src="${item.img}" alt="${item.name}" class="Ropa">
                
                ${isEquipped ? '<div class="equipped-badge"><i class="fa-solid fa-check"></i> Equipada</div>' : ''}
                
                <span class="item-name">${item.name}</span>
                
                ${isEquipped 
                    ? `<button class="btn-unequip" data-item-id="${item.id}">Desequipar</button>`
                    : `<button class="btn-equip" data-item-id="${item.id}">Equipar</button>`
                }
            </div>
        `;
    }).join('');
}

function showInventoryNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-equip')) {
        e.preventDefault();
        const itemId = parseInt(e.target.getAttribute('data-item-id'));
        equiparSkin(itemId);
    }
    if (e.target.classList.contains('btn-unequip')) {
        e.preventDefault();
        desequiparSkin();
    }
});

window.addEventListener('DOMContentLoaded', function() {
    const datos = obtenerDatosUsuario();
    if (datos.skinEquipada) {
        cambiarPersonajePrincipal(datos.skinEquipada);
    }
});