document.addEventListener("DOMContentLoaded", () => {
    const userButton = document.getElementById("userButton")
    const dropdownMenu = document.getElementById("dropdownMenu")

    userButton.addEventListener("click", (e) => {
        e.stopPropagation()
        dropdownMenu.classList.toggle("ocultar")
    })

    document.addEventListener("click", (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== userButton) {
        dropdownMenu.classList.add("ocultar")
        }
    })

    dropdownMenu.addEventListener("click", (e) => {
        e.stopPropagation()
    })

    const playButton = document.getElementById("playButton")
    playButton.addEventListener("click", () => {
        console.log("¡Iniciando juego!")
    })
})
