// ============================================================
// reset-password.js
// Runs on reset-password.html
// 1. Validates the token from the URL
// 2. If valid, shows the new-password form
// 3. On submit, updates the student's password
// ============================================================

const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let validRecord = null

function showMessage(type, text) {
  const el = document.getElementById('reset-message')
  el.className = `form-message ${type}`
  el.innerHTML = text
  el.classList.remove('hidden')
}

async function initResetPage() {
  const params = new URLSearchParams(window.location.search)
  const token  = params.get('token')

  if (!token) {
    document.getElementById('verifying-state').innerHTML =
      '<p style="text-align:center;color:#ef4444;">No reset token found. Please request a new link.</p>'
    return
  }

  const { data: record } = await db
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    document.getElementById('verifying-state').innerHTML =
      '<p style="text-align:center;color:#ef4444;">This reset link is invalid or has expired. Please request a new one.</p>'
    return
  }

  validRecord = record

  // Show the form
  document.getElementById('verifying-state').classList.add('hidden')
  document.getElementById('reset-form').classList.remove('hidden')
}

document.getElementById('reset-form').addEventListener('submit', async function (e) {
  e.preventDefault()

  const newPass     = document.getElementById('new-password').value
  const confirmPass = document.getElementById('confirm-password').value

  if (newPass !== confirmPass) {
    showMessage('error', '<i class="fa-solid fa-circle-xmark"></i> Passwords do not match.')
    return
  }

  if (newPass.length < 8) {
    showMessage('error', '<i class="fa-solid fa-circle-xmark"></i> Password must be at least 8 characters.')
    return
  }

  const btn = document.getElementById('reset-btn')
  btn.disabled     = true
  btn.textContent  = 'Updating...'

  // Update password
  const { error } = await db
    .from('students')
    .update({ password_hash: newPass })
    .eq('student_id', validRecord.student_id)

  if (error) {
    btn.disabled    = false
    btn.textContent = 'Update Password'
    showMessage('error', '<i class="fa-solid fa-circle-xmark"></i> Failed to update password. Try again.')
    return
  }

  // Mark token as used
  await db
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('token', validRecord.token)

  showMessage('success', '<i class="fa-solid fa-circle-check"></i> Password updated successfully! Redirecting to login...')
  document.getElementById('reset-form').classList.add('hidden')

  setTimeout(() => {
    window.location.href = '/System/homepage/loginpage.html'
  }, 2500)
})

initResetPage()