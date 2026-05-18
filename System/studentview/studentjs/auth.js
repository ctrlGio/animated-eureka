(function () {
  const userRole    = localStorage.getItem('userRole')
  const currentPath = window.location.pathname

  if (!userRole) {
    window.location.replace('/System/homepage/loginpage.html')
    return
  }

  if (currentPath.includes('/studentview/') && userRole !== 'student') {
    window.location.replace('/System/homepage/loginpage.html')
    return
  }

  const name = localStorage.getItem('username') || 'Student'

  document.addEventListener('DOMContentLoaded', () => {
    const nameEl    = document.getElementById('sidebarName')
    const welcomeEl = document.getElementById('sidebarWelcome')

    if (nameEl)    nameEl.textContent    = name
    if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + name
  })
})()