document.addEventListener('DOMContentLoaded', function () {
  const logoutBtn = document.getElementById('logoutBtn')

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault()
      localStorage.removeItem('userRole')
      localStorage.removeItem('username')
      window.location.href = '/System/homepage/loginpage.html'
    })
  }
})