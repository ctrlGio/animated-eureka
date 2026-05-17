document.addEventListener('DOMContentLoaded', function () {
  const logoutBtn = document.getElementById('logoutBtn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault()
      localStorage.clear()
      window.location.replace('/System/homepage/loginpage.html')
    })
  }
})