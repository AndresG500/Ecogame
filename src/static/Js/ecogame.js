document.addEventListener("DOMContentLoaded", function() {
    const toggleBtn = document.querySelector(".toggle-btn");
    const sidebar = document.querySelector(".sidebar");

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", function() {
          
            const isCollapsed = sidebar.classList.toggle("collapsed");
            toggleBtn.setAttribute("aria-expanded", !isCollapsed);
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
  const openModalButtons = document.querySelectorAll(".open-modal")

  const modalCloseButtons = document.querySelectorAll(".modal-close")

  const openModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.add("is-open")
      modal.setAttribute("aria-hidden", "false")
      document.body.style.overflow = "hidden"
    }
  }

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.remove("is-open") 
      modal.setAttribute("aria-hidden", "true") 
      document.body.style.overflow = "" 
    }
  }

  openModalButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault() 
      const modalId = button.getAttribute("data-modal") 
      if (modalId) {
        openModal(modalId) 
      }
    })
  })

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-modal") 
      if (modalId) {
        closeModal(modalId)
      }
    })
  })

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        const modalId = overlay.id 
        closeModal(modalId)
      }
    })
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.is-open").forEach((modal) => {
        closeModal(modal.id)
      })
    }
  })
})
