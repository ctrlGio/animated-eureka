const { createClient } = supabase
const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const studentId = localStorage.getItem('studentId')

function switchTab(element, tabName) {
  const buttons = element.parentElement.querySelectorAll('.pill-item')
  buttons.forEach(btn => btn.classList.remove('active'))
  element.classList.add('active')

  const contents = document.querySelectorAll('.tab-content')
  contents.forEach(content => {
    content.style.display = content.id === tabName ? 'block' : 'none'
  })
}

async function loadStats() {
  const activeEl   = document.getElementById('stat-active')
  const returnedEl = document.getElementById('stat-returned')
  const totalEl    = document.getElementById('stat-total')

  if (activeEl)   activeEl.textContent   = '—'
  if (returnedEl) returnedEl.textContent = '—'
  if (totalEl)    totalEl.textContent    = '—'

  const { count: activeCount }   = await client.from('adminborrows').select('*', { count: 'exact', head: true }).eq('student_id', studentId).in('status', ['Active', 'Overdue'])
  const { count: returnedCount } = await client.from('adminborrows').select('*', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'Returned')
  const { count: totalCount }    = await client.from('adminborrows').select('*', { count: 'exact', head: true }).eq('student_id', studentId)

  if (activeEl)   activeEl.textContent   = activeCount   ?? 0
  if (returnedEl) returnedEl.textContent = returnedCount ?? 0
  if (totalEl)    totalEl.textContent    = totalCount    ?? 0
}

async function loadActiveBorrows() {
  const { data, error } = await client
    .from('adminborrows')
    .select('*')
    .eq('student_id', studentId)
    .in('status', ['Active', 'Overdue'])
    .order('created_at', { ascending: false })

  if (error) { console.error(error); return }

  const container = document.getElementById('active-borrowings')
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="inventory-card"><p>No active borrows found.</p></div>`
    return
  }

  container.innerHTML = `
    <div class="inventory-card">
      <h4>Current Items</h4>
      <table class="borrow-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Borrow Date</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>${r.item_borrowed}</td>
              <td>${r.quantity}</td>
              <td>${r.borrow_date || '—'}</td>
              <td>${r.due_date    || '—'}</td>
              <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
            </tr>`).join('')}
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
    .order('created_at', { ascending: false })

  if (error) { console.error(error); return }

  const container = document.getElementById('history')
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="inventory-card"><p>No borrow history found.</p></div>`
    return
  }

  container.innerHTML = `
    <div class="inventory-card">
      <h4>Past History</h4>
      <table class="borrow-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Borrow Date</th>
            <th>Due Date</th>
            <th>Return Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>${r.item_borrowed}</td>
              <td>${r.quantity}</td>
              <td>${r.borrow_date  || '—'}</td>
              <td>${r.due_date     || '—'}</td>
              <td>${r.return_date  ? r.return_date.split('T')[0] : '—'}</td>
              <td><span class="status-badge status-returned">Returned</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`
}

document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  loadActiveBorrows()
  loadHistory()
})