document.addEventListener('DOMContentLoaded', function () {

  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode')
  }

  const settingsBtn  = document.querySelector('.settings-btn')
  const settingsModal = document.getElementById('settingsModal')
  const closeSettings = document.getElementById('closeSettings')
  const darkModeToggle = document.getElementById('darkModeToggle')

 
  if (darkModeToggle) {
    darkModeToggle.checked = savedTheme === 'dark'
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('open')
    })
  }

  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      settingsModal.classList.remove('open')
    })
  }

  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('open')
    }
  })

  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
      if (darkModeToggle.checked) {
        document.body.classList.add('dark-mode')
        localStorage.setItem('theme', 'dark')
      } else {
        document.body.classList.remove('dark-mode')
        localStorage.setItem('theme', 'light')
      }
    })
  }

})