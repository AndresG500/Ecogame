function toggleForms(event) {
  event.preventDefault()

  const loginForm = document.getElementById("loginForm")
  const registerForm = document.getElementById("registerForm")

  loginForm.classList.toggle("esconder")
  registerForm.classList.toggle("esconder")
}

function Mostrar_Contraseña() {
  const passwordInput = document.getElementById("Mostrar")
  const icon = document.getElementById("Icon")

  if (passwordInput.type === "password") {
    passwordInput.type = "text"
    icon.classList.remove("fa-lock")
    icon.classList.add("fa-lock-open")
  } else {
    passwordInput.type = "password"
    icon.classList.remove("fa-lock-open")
    icon.classList.add("fa-lock")
  }
}

function Mostrar_Contraseña1() {
  const passwordInput = document.getElementById("Mostrar1")
  const icon = document.getElementById("Icon1")

  if (passwordInput.type === "password") {
    passwordInput.type = "text"
    icon.classList.remove("fa-lock")
    icon.classList.add("fa-lock-open")
  } else {
    passwordInput.type = "password"
    icon.classList.remove("fa-lock-open")
    icon.classList.add("fa-lock")
  }
}
