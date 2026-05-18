document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  /* ── Dark Mode ───────────────────────────────────────── */
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') document.body.classList.add('dark-mode')

  const settingsBtn = document.querySelector('.settings-btn')
  const settingsModal = document.getElementById('settingsModal')
  const closeSettings = document.getElementById('closeSettings')
  const darkModeToggle = document.getElementById('darkModeToggle')

  if (darkModeToggle) darkModeToggle.checked = savedTheme === 'dark'

  if (settingsBtn) settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'))
  if (closeSettings) closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'))

  window.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('open')
    if (e.target === addStudentModal) addStudentModal.classList.remove('open')
  })

  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode', darkModeToggle.checked)
      localStorage.setItem('theme', darkModeToggle.checked ? 'dark' : 'light')
    })
  }

  /* ── Add Student Modal ───────────────────────────────── */
  const openAddStudentBtn = document.getElementById('openAddStudentBtn')
  const addStudentModal = document.getElementById('addStudentModal')
  const cancelAddStudent = document.getElementById('cancelAddStudent')
  const confirmAddStudent = document.getElementById('confirmAddStudent')
  const addStudentMsg = document.getElementById('addStudentMsg')

  function closeAddStudent() {
    addStudentModal.classList.remove('open')
  }

  async function openAddStudent() {
    settingsModal.classList.remove('open')
    addStudentModal.classList.add('open')
    addStudentMsg.textContent = ''
    addStudentMsg.className = 'add-student-msg'

      // Clear fields
      ;['studentFullName', 'studentEmail', 'studentPassword', 'studentYearLevel']
        .forEach(id => {
          const el = document.getElementById(id)
          if (el) el.value = ''
        })

    // Auto-generate next Student ID
    const { data } = await client
      .from('students')
      .select('student_id')
      .order('student_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextId = 'STU001'
    if (data?.student_id) {
      const num = parseInt(data.student_id.replace(/\D/g, '')) + 1
      nextId = 'STU' + String(num).padStart(3, '0')
    }

    document.getElementById('studentIdInput').value = nextId
    document.getElementById('studentIdInput').readOnly = true
  }

  if (openAddStudentBtn) openAddStudentBtn.addEventListener('click', openAddStudent)
  if (cancelAddStudent) cancelAddStudent.addEventListener('click', closeAddStudent)
  // Eye toggle for password
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#togglePassword')
    if (!toggleBtn) return
    const passwordInput = document.getElementById('studentPassword')
    const icon = toggleBtn.querySelector('i')
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text'
      icon.classList.remove('fa-eye')
      icon.classList.add('fa-eye-slash')
    } else {
      passwordInput.type = 'password'
      icon.classList.remove('fa-eye-slash')
      icon.classList.add('fa-eye')
    }
  })

  /* ── Hash Password ───────────────────────────────────── */
  async function hashPassword(password) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /* ── Create Account ──────────────────────────────────── */
  if (confirmAddStudent) {
    confirmAddStudent.addEventListener('click', async () => {
      const fullName = document.getElementById('studentFullName').value.trim()
      const studentId = document.getElementById('studentIdInput').value.trim()
      const email = document.getElementById('studentEmail')?.value.trim() || ''
      const password = document.getElementById('studentPassword').value
      const yearLevel = document.getElementById('studentYearLevel').value

      if (!fullName || !studentId || !password || !yearLevel) {
        showMsg('Please fill in all fields.', 'error'); return
      }
      if (password.length < 6) {
        showMsg('Password must be at least 6 characters.', 'error'); return
      }

      confirmAddStudent.disabled = true
      confirmAddStudent.textContent = 'Creating...'

      // Check if student ID already exists
      const { data: existing } = await client
        .from('students')
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle()

      if (existing) {
        showMsg('A student with this ID already exists.', 'error')
        resetBtn(); return
      }

      const hashedPassword = await hashPassword(password)

      const { error: dbError } = await client
  .from('students')
  .insert([{
    student_id:    studentId,
    student_name:  fullName,
    email:         email,
    password_hash: hashedPassword,
    year_level:    yearLevel
  }])

      if (dbError) {
        showMsg('Failed to create account: ' + dbError.message, 'error')
        resetBtn(); return
      }

      showMsg(`✅ Account for "${fullName}" created successfully!`, 'success')
      resetBtn()
    })
  }

  function showMsg(msg, type) {
    addStudentMsg.textContent = msg
    addStudentMsg.className = `add-student-msg ${type}`
  }

  function resetBtn() {
    confirmAddStudent.disabled = false
    confirmAddStudent.textContent = 'Create Account'
  }

})