const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const BASE_URL = window.location.origin
const db       = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

emailjs.init('NtfKAiB6DFNRN9PH4')

async function hashPassword(password) {
  const encoder   = new TextEncoder()
  const data      = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray  = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function showMessage(elId, type, text) {
  const el = document.getElementById(elId)
  if (!el) return
  el.className = `form-message ${type}`
  el.innerHTML = text
  el.classList.remove('hidden')
}

function hideMessage(elId) {
  const el = document.getElementById(elId)
  if (el) el.classList.add('hidden')
}

function setLoading(btnId, loading, defaultText) {
  const btn = document.getElementById(btnId)
  if (!btn) return
  btn.disabled    = loading
  btn.textContent = loading ? 'Please wait...' : defaultText
}

function generateToken() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

const existingRole = localStorage.getItem('userRole')
if (existingRole === 'admin')           window.location.replace('/System/adminview/admin_homepage.html')
else if (existingRole === 'instructor') window.location.replace('/System/instructorview/instructor_homepage.html')
else if (existingRole === 'student')    window.location.replace('/System/studentview/student_homepage.html')

const forgotOverlay = document.getElementById('forgot-overlay')

document.getElementById('open-forgot').addEventListener('click', () => {
  forgotOverlay.classList.remove('hidden')
})

document.getElementById('close-forgot').addEventListener('click', () => {
  forgotOverlay.classList.add('hidden')
  hideMessage('forgot-message')
  document.getElementById('forgot-form').reset()
})

forgotOverlay.addEventListener('click', e => {
  if (e.target === forgotOverlay) document.getElementById('close-forgot').click()
})

document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  hideMessage('login-message')

  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value

  setLoading('login-btn', true, 'Sign In')

  if (username.toLowerCase() === 'admin' && password === 'admin123') {
    localStorage.setItem('userRole', 'admin')
    localStorage.setItem('username', 'admin')
    window.location.href = '/System/adminview/admin_homepage.html'
    return
  }

  if (username.toLowerCase() === 'instructor' && password === 'instructor123') {
    localStorage.setItem('userRole', 'instructor')
    localStorage.setItem('username', 'instructor')
    window.location.href = '/System/instructorview/instructor_homepage.html'
    return
  }

  const hashedPassword = await hashPassword(password)

  const { data } = await db
    .from('students')
    .select('*')
    .eq('student_id', username.toUpperCase())
    .eq('password_hash', hashedPassword)
    .maybeSingle()

  setLoading('login-btn', false, 'Sign In')

  if (!data) {
    showMessage('login-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> Invalid credentials. Please try again.')
    return
  }

  localStorage.setItem('userRole',  'student')
  localStorage.setItem('username',  data.student_name)
  localStorage.setItem('studentId', data.student_id)
  localStorage.setItem('yearLevel', data.year_level)
  window.location.href = '/System/studentview/student_homepage.html'
})

document.getElementById('forgot-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  hideMessage('forgot-message')

  const studentId = document.getElementById('f-student-id').value.trim().toUpperCase()
  setLoading('forgot-btn', true, 'Send Reset Link')

  const { data: student } = await db
    .from('students')
    .select('email, student_name')
    .eq('student_id', studentId)
    .maybeSingle()

  setLoading('forgot-btn', false, 'Send Reset Link')
  showMessage('forgot-message', 'success', '<i class="fa-solid fa-envelope"></i> If that Student ID exists, a reset link has been sent.')

  if (!student) return

  const token = generateToken()
  await db.from('password_reset_tokens').insert({ student_id: studentId, token })

  await sendEmail({
    to:      student.email,
    subject: 'Reset your BSHM password',
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Password Reset Request</h2>
        <p style="color:#475569;">Hi <strong>${student.student_name}</strong>,</p>
        <p style="color:#475569;margin-top:8px;">Click the button below to reset your password.</p>
        <a href="${BASE_URL}/System/homepage/reset-password.html?token=${token}"
           style="display:inline-block;margin-top:16px;padding:13px 28px;background:#2b3240;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Reset Password
        </a>
        <p style="margin-top:28px;font-size:12px;color:#94a3b8;">Expires in 1 hour. Ignore if you didn't request this.</p>
      </div>
    `
  })

  document.getElementById('forgot-form').reset()
})

async function sendEmail({ to, subject, html }) {
  try {
    const response = await emailjs.send('service_xoiiy0x', 'template_3d1hvdz', {
      to_email: to,
      subject:  subject,
      html:     html
    })
    console.log('Email sent:', response)
  } catch (err) {
    console.error('Email error:', err)
  }
}

const toggleBtn       = document.getElementById('toggle-password')
const eyeIcon         = document.getElementById('eye-icon')
const passwordInput   = document.getElementById('password')
const passwordWrapper = document.getElementById('password-wrapper')

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const hidden       = passwordInput.type === 'password'
    passwordInput.type = hidden ? 'text' : 'password'
    eyeIcon.className  = hidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'
    toggleBtn.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password')
  })

  passwordWrapper.addEventListener('focusout', e => {
    if (!passwordWrapper.contains(e.relatedTarget)) {
      passwordInput.type = 'password'
      eyeIcon.className  = 'fa-regular fa-eye'
      toggleBtn.setAttribute('aria-label', 'Show password')
    }
  })
}