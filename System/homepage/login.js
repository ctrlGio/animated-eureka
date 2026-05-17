const { createClient } = supabase
const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Redirect if already logged in
const existingSession = localStorage.getItem('userRole')
if (existingSession === 'admin') {
  window.location.replace('/System/adminview/admin_homepage.html')
} else if (existingSession === 'instructor') {
  window.location.replace('/System/instructorview/instructor_homepage.html')
} else if (existingSession === 'student') {
  window.location.replace('/System/studentview/student_homepage.html')
}

const loginForm     = document.querySelector('.login-form')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')

loginForm.addEventListener('submit', async function (e) {
  e.preventDefault()

  const username = usernameInput.value.trim()
  const password = passwordInput.value

  // Admin
  if (username.toLowerCase() === 'admin' && password === 'admin123') {
    localStorage.setItem('userRole', 'admin')
    localStorage.setItem('username', 'admin')
    window.location.href = '/System/adminview/admin_homepage.html'
    return
  }

  // Instructor
  if (username.toLowerCase() === 'instructor' && password === 'instructor123') {
    localStorage.setItem('userRole', 'instructor')
    localStorage.setItem('username', 'instructor')
    window.location.href = '/System/instructorview/instructor_homepage.html'
    return
  }

  // Student — query Supabase
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('student_id', username)
    .eq('password_hash', password)
    .maybeSingle()  // ✅ use maybeSingle() instead of single() to avoid 406

  if (!data) {
    alert('Invalid credentials. Please try again.')
    return
  }

  localStorage.setItem('userRole', 'student')
  localStorage.setItem('username', data.student_name)
  localStorage.setItem('studentId', data.student_id)
  localStorage.setItem('yearLevel', data.year_level)
  window.location.href = '/System/studentview/student_homepage.html'
})

// Password toggle
const toggleBtn       = document.getElementById('toggle-password')
const eyeIcon         = document.getElementById('eye-icon')
const passwordWrapper = document.getElementById('password-wrapper')

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password'
  passwordInput.type = isHidden ? 'text' : 'password'
  eyeIcon.className  = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'
  toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password')
})

passwordWrapper.addEventListener('focusout', (e) => {
  if (!passwordWrapper.contains(e.relatedTarget)) {
    passwordInput.type = 'password'
    eyeIcon.className  = 'fa-regular fa-eye'
    toggleBtn.setAttribute('aria-label', 'Show password')
  }
})