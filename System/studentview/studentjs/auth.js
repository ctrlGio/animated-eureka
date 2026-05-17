(function () {
  const userRole = localStorage.getItem('userRole')
  const currentPath = window.location.pathname

  if (!userRole) {
    window.location.replace('/System/homepage/loginpage.html')
    return
  }

  if (currentPath.includes('/studentview/') && userRole !== 'student') {
    window.location.replace('/System/homepage/loginpage.html')
    return
  }
})()