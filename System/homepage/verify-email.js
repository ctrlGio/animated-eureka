// ============================================================
// verify-email.js
// Runs on verify-email.html — validates the token from the URL
// and marks the student's account as verified
// ============================================================

const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verifyEmail() {
  const params = new URLSearchParams(window.location.search)
  const token  = params.get('token')

  if (!token) {
    showError('No verification token found in the link.')
    return
  }

  // Look up the token
  const { data: record } = await db
    .from('email_verification_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!record) {
    showError('This verification link is invalid.')
    return
  }

  if (record.used) {
    showError('This link has already been used.')
    return
  }

  if (new Date(record.expires_at) < new Date()) {
    showError('This link has expired. Please sign up again or contact support.')
    return
  }

  // Mark token as used
  await db
    .from('email_verification_tokens')
    .update({ used: true })
    .eq('token', token)

  // Mark student as verified
  await db
    .from('students')
    .update({ is_verified: true })
    .eq('student_id', record.student_id)

  // Show success
  document.getElementById('verify-state').classList.add('hidden')
  document.getElementById('verify-success').classList.remove('hidden')
}

function showError(msg) {
  document.getElementById('verify-state').classList.add('hidden')
  document.getElementById('verify-error-msg').textContent = msg
  document.getElementById('verify-error').classList.remove('hidden')
}

verifyEmail()