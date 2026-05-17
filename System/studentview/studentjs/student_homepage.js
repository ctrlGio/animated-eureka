document.addEventListener('DOMContentLoaded', async function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Get logged-in student info from localStorage
  const studentId   = localStorage.getItem('studentId')
  const studentName = localStorage.getItem('username')

  // Update sidebar name and welcome text
  const sidebarName    = document.getElementById('sidebarName')
  const sidebarWelcome = document.getElementById('sidebarWelcome')
  if (sidebarName)    sidebarName.textContent    = studentName || 'Student'
  if (sidebarWelcome) sidebarWelcome.textContent = `Welcome, ${studentName || 'student'}`

  // Stat elements
  const statBorrows  = document.getElementById('stat-borrows')
  const statOverdue  = document.getElementById('stat-overdue')
  const statRequests = document.getElementById('stat-requests')
  const statStanding = document.getElementById('stat-standing')

  // ── Load Stats ──────────────────────────────────────────────
  const { count: borrowCount } = await client
    .from('adminborrows')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('status', ['Active', 'Overdue'])

  const { count: overdueCount } = await client
    .from('adminborrows')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'Overdue')

  const { count: requestCount } = await client
    .from('studentrequests')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'Pending')

  if (statBorrows)  statBorrows.textContent  = borrowCount  ?? 0
  if (statOverdue)  statOverdue.textContent  = overdueCount ?? 0
  if (statRequests) statRequests.textContent = requestCount ?? 0

  // Good Standing = no overdue items
  if (statStanding) {
    if ((overdueCount ?? 0) === 0) {
      statStanding.textContent  = '✓'
      statStanding.style.color  = '#28a745'
    } else {
      statStanding.textContent  = '✗'
      statStanding.style.color  = '#dc3545'
    }
  }

  // ── Load Current Borrowings ──────────────────────────────────
  const { data: borrows, error: borrowError } = await client
    .from('adminborrows')
    .select('*')
    .eq('student_id', studentId)
    .in('status', ['Active', 'Overdue'])
    .order('created_at', { ascending: false })
    .limit(3)

  const borrowsList = document.getElementById('current-borrowings-list')
  if (borrowsList) {
    if (borrowError || !borrows || borrows.length === 0) {
      borrowsList.innerHTML = `<p style="color:#888; padding: 10px 0;">No active borrowings.</p>`
    } else {
      borrowsList.innerHTML = borrows.map(r => {
        const isOverdue  = r.status === 'Overdue'
        const badgeColor = isOverdue ? 'red' : 'green'
        const badgeText  = isOverdue ? 'Overdue' : 'Active'
        return `
          <div class="card">
            <div class="card-header">
              <strong>${r.item_borrowed}</strong>
              <span class="badge ${badgeColor}">${badgeText}</span>
            </div>
            <p>Quantity: ${r.quantity}</p>
            <div class="card-footer">
              <span>Borrowed: ${r.borrow_date || '—'}</span>
              <span>Due: ${r.due_date || '—'}</span>
            </div>
          </div>`
      }).join('')
    }
  }

  // ── Load Recent Requests ─────────────────────────────────────
  const { data: requests, error: requestError } = await client
    .from('studentrequests')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(3)

  const requestsList = document.getElementById('recent-requests-list')
  if (requestsList) {
    if (requestError || !requests || requests.length === 0) {
      requestsList.innerHTML = `<p style="color:#888; padding: 10px 0;">No recent requests.</p>`
    } else {
      requestsList.innerHTML = requests.map((r, i) => {
        const badgeColor = r.status === 'Approved' ? 'green'
                         : r.status === 'Rejected' ? 'red'
                         : 'grey'
        return `
          <div class="card">
            <div class="card-header">
              <strong>${r.item_requested}</strong>
              <span class="badge ${badgeColor}">${r.status}</span>
            </div>
            <p>Request ID: REQ${String(r.id).padStart(3, '0')}</p>
            <p>Requested: ${r.created_at ? r.created_at.split('T')[0] : '—'}</p>
          </div>`
      }).join('')
    }
  }

})