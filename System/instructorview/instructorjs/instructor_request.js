document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  async function loadStats() {
    const { count: pendingCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')

    const { count: approvedCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')

    const { count: rejectedCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Rejected')

    const statValues = document.querySelectorAll('.stat-value')
    if (statValues[0]) statValues[0].textContent = pendingCount  || 0
    if (statValues[1]) statValues[1].textContent = approvedCount || 0
    if (statValues[2]) statValues[2].textContent = rejectedCount || 0
  }

  async function loadRequests() {
    const { data, error } = await client
      .from('adminrequisition_forms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { console.error('Error loading requests:', error); return }

    renderTable(data)
  }

  function renderTable(records) {
    const table   = document.querySelector('.request-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    const tbody = document.createElement('tbody')

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No requests found.</td></tr>`
    } else {
      records.forEach(r => {
        const statusClass  = r.status === 'Pending'  ? 'status-pending'
                           : r.status === 'Approved' ? 'status-approved'
                           : 'status-rejected'

        const urgencyClass = r.urgency === 'High'   ? 'urgency-high'
                           : r.urgency === 'Medium' ? 'urgency-medium'
                           : 'urgency-low'

        tbody.innerHTML += `
          <tr data-id="${r.id}">
            <td>#${r.id}</td>
            <td>${r.requestor}</td>
            <td>${r.date || '—'}</td>
            <td>${r.item_requested}</td>
            <td>${r.quantity}</td>
            <td>${r.date || '—'}</td>
            <td><span class="urgency-badge ${urgencyClass}">${r.urgency || 'Normal'}</span></td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
          </tr>`
      })
    }

    table.appendChild(tbody)
  }

  loadStats()
  loadRequests()

})