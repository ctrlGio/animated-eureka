(function () {
  const userRole    = localStorage.getItem('userRole')
  const currentPath = window.location.pathname

  // ── Route protection ──────────────────────────────
  if (!userRole) {
    window.location.replace('/System/homepage/loginpage.html')
    return
  }

  if (currentPath.includes('/instructorview/') && userRole !== 'instructor') {
    window.location.replace('/System/homepage/loginpage.html')
    return
  }

  // ── Sidebar name + welcome ────────────────────────
  const name = localStorage.getItem('username') || 'Instructor'

  document.addEventListener('DOMContentLoaded', () => {
    const nameEl    = document.getElementById('sidebarName')
    const welcomeEl = document.getElementById('sidebarWelcome')

    if (nameEl)    nameEl.textContent    = name
    if (welcomeEl) welcomeEl.textContent = 'Welcome, ' + name
  })
})()