document.addEventListener('DOMContentLoaded', async function () {

  const { createClient } = supabase
  const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const studentId   = localStorage.getItem('studentId')
  const studentName = localStorage.getItem('username')

  const sidebarName    = document.getElementById('sidebarName')
  const sidebarWelcome = document.getElementById('sidebarWelcome')
  if (sidebarName)    sidebarName.textContent    = studentName || 'Student'
  if (sidebarWelcome) sidebarWelcome.textContent = `Welcome, ${studentName || 'student'}`

  const { count: activeCount } = await client
    .from('adminborrows')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('status', ['Active', 'Overdue'])

  const { count: returnedCount } = await client
    .from('adminborrows')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'Returned')

  const { count: totalCount } = await client
    .from('adminborrows')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)

  const statActive   = document.getElementById('stat-active')
  const statReturned = document.getElementById('stat-returned')
  const statTotal    = document.getElementById('stat-total')

  if (statActive)   statActive.textContent   = activeCount   ?? 0
  if (statReturned) statReturned.textContent = returnedCount ?? 0
  if (statTotal)    statTotal.textContent    = totalCount    ?? 0

  async function loadActiveBorrows() {
    const { data, error } = await client
      .from('adminborrows')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['Active', 'Overdue'])
      .order('created_at', { ascending: false })

    const container = document.getElementById('active-borrowings')
    if (!container) return

    if (error || !data || data.length === 0) {
      container.innerHTML = `
        <div class="inventory-card">
          <h4>Current Items</h4>
          <p style="color:#888; margin-top:10px;">No active borrowings.</p>
        </div>`
      return
    }

    container.innerHTML = `
      <div class="inventory-card">
        <h4>Current Items</h4>
        <table class="borrow-table">
          <thead>
            <tr class="borrow-table-header">
              <th>Item Borrowed</th>
              <th>Quantity</th>
              <th>Borrow Date</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(r => {
              const statusClass = r.status === 'Overdue' ? 'status-overdue' : 'status-active'
              const borrowDate  = r.borrow_date ? r.borrow_date.split('T')[0] : '—'
              const dueDate     = r.due_date    ? r.due_date.split('T')[0]    : '—'
              return `
                <tr>
                  <td>${r.item_borrowed || '—'}</td>
                  <td>${r.quantity}</td>
                  <td>${borrowDate}</td>
                  <td>${dueDate}</td>
                  <td><span class="status-badge ${statusClass}">${r.status}</span></td>
                </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>`
  }

  async function loadHistory() {
    const { data, error } = await client
      .from('adminborrows')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'Returned')
      .order('return_date', { ascending: false })

    const container = document.getElementById('history')
    if (!container) return

    if (error || !data || data.length === 0) {
      container.innerHTML = `
        <div class="inventory-card">
          <h4>Past History</h4>
          <p style="color:#888; margin-top:10px;">No borrowing history yet.</p>
        </div>`
      return
    }

    container.innerHTML = `
      <div class="inventory-card">
        <h4>Past History</h4>
        <table class="borrow-table">
          <thead>
            <tr class="borrow-table-header">
              <th>Item Borrowed</th>
              <th>Quantity</th>
              <th>Borrow Date</th>
              <th>Due Date</th>
              <th>Return Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(r => {
              const borrowDate = r.borrow_date  ? r.borrow_date.split('T')[0]  : '—'
              const dueDate    = r.due_date     ? r.due_date.split('T')[0]     : '—'
              const returnDate = r.return_date  ? r.return_date.split('T')[0]  : '—'
              return `
                <tr>
                  <td>${r.item_borrowed || '—'}</td>
                  <td>${r.quantity}</td>
                  <td>${borrowDate}</td>
                  <td>${dueDate}</td>
                  <td>${returnDate}</td>
                  <td><span class="status-badge status-returned">Returned</span></td>
                </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>`
  }

  window.switchTab = function (element, tabName) {
    const buttons = element.parentElement.querySelectorAll('.pill-item')
    buttons.forEach(btn => btn.classList.remove('active'))
    element.classList.add('active')

    const contents = document.querySelectorAll('.tab-content')
    contents.forEach(content => {
      content.style.display = content.id === tabName ? 'block' : 'none'
    })
  }

  loadActiveBorrows()
  loadHistory()

})