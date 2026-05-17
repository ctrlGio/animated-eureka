(function () {
  const userRole = localStorage.getItem('userRole')
  const currentPath = window.location.pathname

  if (!userRole) {
    window.location.href = '/System/homepage/loginpage.html'
    return
  }

  if (currentPath.includes('/adminview/') && userRole !== 'admin') {
    window.location.href = '/System/homepage/loginpage.html'
    return
  }

  if (currentPath.includes('/instructorview/') && userRole !== 'instructor') {
    window.location.href = '/System/homepage/loginpage.html'
    return
  }

  if (currentPath.includes('/studentview/') && userRole !== 'student') {
    window.location.href = '/System/homepage/loginpage.html'
    return
  }
})()