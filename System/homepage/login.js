const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const BASE_URL = window.location.origin

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

emailjs.init('NtfKAiB6DFNRN9PH4')

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

function showWaitingOverlay(email) {
  // mask email for display: j***@gmail.com
  const [user, domain] = email.split('@')
  const masked = user[0] + '***@' + domain

  const overlay = document.createElement('div')
  overlay.id = 'confirm-overlay'
  overlay.innerHTML = `
    <div class="confirm-card">
      <div class="confirm-icon">
        <i class="fa-regular fa-envelope-open"></i>
      </div>
      <h3>Check Your Email</h3>
      <p>We sent a confirmation to <strong>${masked}</strong>.<br>
         Tap <strong>"Yes, it's me"</strong> in that email to log in.</p>
      <div class="confirm-dots">
        <span></span><span></span><span></span>
      </div>
      <p class="confirm-sub">Waiting for confirmation… <span id="confirm-countdown">60</span>s</p>
      <button id="confirm-cancel">Cancel</button>
    </div>
  `
  document.body.appendChild(overlay)

  let timeLeft = 60
  const countdownEl = document.getElementById('confirm-countdown')
  const timer = setInterval(() => {
    timeLeft--
    if (countdownEl) countdownEl.textContent = timeLeft
    if (timeLeft <= 0) clearInterval(timer)
  }, 1000)

  document.getElementById('confirm-cancel').addEventListener('click', () => {
    clearInterval(timer)
    overlay.remove()
    setLoading('login-btn', false, 'Sign In')
  })

  return { overlay, stopCountdown: () => clearInterval(timer) }
}

async function pollForConfirmation(token, timeoutMs = 60000) {
  const interval = 2500
  const start    = Date.now()

  return new Promise((resolve) => {
    const check = async () => {
      if (Date.now() - start >= timeoutMs) {
        resolve('timeout')
        return
      }

      const { data } = await db
        .from('login_confirmations')
        .select('status')
        .eq('token', token)
        .maybeSingle()

      if (data?.status === 'confirmed') { resolve('confirmed'); return }
      if (data?.status === 'denied')    { resolve('denied');    return }

      setTimeout(check, interval)
    }
    check()
  })
}

const existingRole = localStorage.getItem('userRole')
if (existingRole === 'admin')           window.location.replace('/System/adminview/admin_homepage.html')
else if (existingRole === 'instructor') window.location.replace('/System/instructorview/instructor_homepage.html')
else if (existingRole === 'student')    window.location.replace('/System/studentview/student_homepage.html')

const signupOverlay = document.getElementById('signup-overlay')
const forgotOverlay = document.getElementById('forgot-overlay')

document.getElementById('open-signup').addEventListener('click', () => signupOverlay.classList.remove('hidden'))
document.getElementById('close-signup').addEventListener('click', () => {
  signupOverlay.classList.add('hidden')
  hideMessage('signup-message')
  document.getElementById('signup-form').reset()
})
document.getElementById('open-forgot').addEventListener('click', () => forgotOverlay.classList.remove('hidden'))
document.getElementById('close-forgot').addEventListener('click', () => {
  forgotOverlay.classList.add('hidden')
  hideMessage('forgot-message')
  document.getElementById('forgot-form').reset()
})

signupOverlay.addEventListener('click', e => { if (e.target === signupOverlay) document.getElementById('close-signup').click() })
forgotOverlay.addEventListener('click', e => { if (e.target === forgotOverlay) document.getElementById('close-forgot').click() })

/* ── LOGIN*/
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  hideMessage('login-message')

  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value

  setLoading('login-btn', true, 'Sign In')

  // ── Hardcoded admin / instructor (no email confirm needed)
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

  // ── Fetch student record
  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('student_id', username.toUpperCase())
    .eq('password_hash', password)
    .maybeSingle()

  if (!data) {
    setLoading('login-btn', false, 'Sign In')
    showMessage('login-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> Invalid credentials. Please try again.')
    return
  }

  if (!data.is_verified) {
    setLoading('login-btn', false, 'Sign In')
    showMessage('login-message', 'info', '<i class="fa-solid fa-envelope"></i> Please verify your email before logging in. Check your inbox.')
    return
  }

  // ── Create login confirmation token
  const token = generateToken()
  const { error: insertErr } = await db.from('login_confirmations').insert({
    student_id: data.student_id,
    token:      token,
    status:     'pending'
  })

  if (insertErr) {
    setLoading('login-btn', false, 'Sign In')
    showMessage('login-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> Could not initiate login confirmation. Please try again.')
    return
  }

  // ── Send confirmation email
  await sendEmail({
    to:      data.email,
    subject: 'Confirm your BSHM login',
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Login Attempt Detected</h2>
        <p style="color:#475569;">Hi <strong>${data.student_name}</strong>,</p>
        <p style="color:#475569;margin-top:8px;">
          Someone (hopefully you) just tried to log in to your BSHM account.
          Tap the button below to confirm it was you.
        </p>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <a href="${BASE_URL}/System/homepage/confirm-login.html?token=${token}&action=confirm"
             style="display:inline-block;padding:13px 28px;background:#2b3240;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            ✅ Yes, it's me
          </a>
          <a href="${BASE_URL}/System/homepage/confirm-login.html?token=${token}&action=deny"
             style="display:inline-block;padding:13px 28px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            ❌ Not me
          </a>
        </div>
        <p style="margin-top:28px;font-size:12px;color:#94a3b8;">
          This link expires in 60 seconds. If you did not attempt to log in, please change your password immediately.
        </p>
      </div>
    `
  })

  // ── Show waiting overlay
  const { overlay, stopCountdown } = showWaitingOverlay(data.email)

  // ── Poll for result
  const result = await pollForConfirmation(token)
  stopCountdown()
  overlay.remove()

  if (result === 'confirmed') {
    localStorage.setItem('userRole', 'student')
    localStorage.setItem('username', data.student_name)
    localStorage.setItem('studentId', data.student_id)
    localStorage.setItem('yearLevel', data.year_level)
    window.location.href = '/System/studentview/student_homepage.html'
  } else if (result === 'denied') {
    setLoading('login-btn', false, 'Sign In')
    showMessage('login-message', 'error', '<i class="fa-solid fa-shield-halved"></i> Login was denied from your email. If this wasn\'t you, change your password.')
  } else {
    setLoading('login-btn', false, 'Sign In')
    showMessage('login-message', 'info', '<i class="fa-regular fa-clock"></i> Confirmation timed out. Please try again.')
  }
})

/* ── SIGN UP*/
document.getElementById('signup-form').addEventListener('submit', async function (e) {
  e.preventDefault()
  hideMessage('signup-message')

  const name     = document.getElementById('s-name').value.trim()
  const email    = document.getElementById('s-email').value.trim().toLowerCase()
  const year     = document.getElementById('s-year').value
  const section  = document.getElementById('s-section').value.trim()
  const password = document.getElementById('s-password').value
  const confirm  = document.getElementById('s-confirm').value

  if (password !== confirm) {
    showMessage('signup-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> Passwords do not match.')
    return
  }
  if (password.length < 8) {
    showMessage('signup-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> Password must be at least 8 characters.')
    return
  }

  setLoading('signup-btn', true, 'Create Account')

  const { data: newStudent, error: insertError } = await db
    .from('students')
    .insert({
      student_id:    '',
      student_name:  name,
      email:         email,
      password_hash: password,
      year_level:    year,
      section:       section,
      is_verified:   false
    })
    .select()
    .single()

  if (insertError) {
    setLoading('signup-btn', false, 'Create Account')
    if (insertError.code === '23505' && insertError.message.toLowerCase().includes('email')) {
      showMessage('signup-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> That email is already registered.')
    } else {
      showMessage('signup-message', 'error', '<i class="fa-solid fa-circle-xmark"></i> Registration failed. Please try again.')
      console.error('Signup error:', insertError)
    }
    return
  }

  const token = generateToken()
  await db.from('email_verification_tokens').insert({ student_id: newStudent.student_id, token })

  await sendEmail({
    to:      email,
    subject: 'Verify your BSHM account',
    html: `
      <div style="font-family:Segoe UI,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Welcome, ${name}!</h2>
        <p style="color:#475569;">Your account has been created. Your <strong>Student ID</strong> is:</p>
        <p style="font-size:32px;font-weight:800;color:#2b3240;letter-spacing:3px;margin:8px 0;">${newStudent.student_id}</p>
        <a href="${BASE_URL}/System/homepage/verify-email.html?token=${token}"
           style="display:inline-block;margin-top:16px;padding:13px 28px;background:#2b3240;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Verify My Email
        </a>
        <p style="margin-top:28px;font-size:12px;color:#94a3b8;">This link expires in 24 hours.</p>
      </div>
    `
  })

  setLoading('signup-btn', false, 'Create Account')
  showMessage('signup-message', 'success',
    `<i class="fa-solid fa-circle-check"></i> Account created! Your Student ID is <strong>${newStudent.student_id}</strong>. Check your email to verify.`
  )
  document.getElementById('signup-form').reset()
})

/* ── FORGOT PASSWORD */
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

/* ── Email sender*/
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

/* ── Password visibility toggles */
const toggleBtn       = document.getElementById('toggle-password')
const eyeIcon         = document.getElementById('eye-icon')
const passwordInput   = document.getElementById('password')
const passwordWrapper = document.getElementById('password-wrapper')

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const hidden = passwordInput.type === 'password'
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

document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target')
    const input    = document.getElementById(targetId)
    const icon     = btn.querySelector('i')
    const isHidden = input.type === 'password'
    input.type     = isHidden ? 'text' : 'password'
    icon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password')
  })
})