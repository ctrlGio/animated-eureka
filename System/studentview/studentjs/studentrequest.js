const { createClient } = supabase
const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const studentId   = localStorage.getItem('studentId')
const studentName = localStorage.getItem('username')
const yearLevel   = localStorage.getItem('yearLevel')

document.addEventListener('DOMContentLoaded', () => {
  loadMyRequests()

  const form = document.getElementById('requestForm')
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const itemRequested = document.getElementById('itemRequested').value.trim()
      const quantity      = parseInt(document.getElementById('quantity').value)
      const reason        = document.getElementById('reason').value.trim()

      const { error } = await client.from('studentrequests').insert([{
        student_id:     studentId,
        student_name:   studentName,
        year_level:     yearLevel,
        item_requested: itemRequested,
        quantity,
        reason,
        status:         'Pending'
      }])

      if (error) { alert('Failed to submit request: ' + error.message); return }

      alert('Request submitted successfully!')
      form.reset()
      loadMyRequests()
    })
  }
})

async function loadMyRequests() {
  const { data, error } = await client
    .from('studentrequests')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) { console.error(error); return }

  const tbody = document.querySelector('.request-table tbody')
  if (!tbody) return

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No requests found.</td></tr>`
    return
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.item_requested}</td>
      <td>${r.quantity}</td>
      <td>${r.reason || '—'}</td>
      <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
      <td>${r.created_at ? r.created_at.split('T')[0] : '—'}</td>
    </tr>`).join('')
}