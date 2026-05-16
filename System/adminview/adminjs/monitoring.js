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

    const monitoringValues = document.querySelectorAll('.monitoring-value')
    if (monitoringValues[0]) monitoringValues[0].textContent = pendingCount  || 0
    if (monitoringValues[1]) monitoringValues[1].textContent = approvedCount || 0
    if (monitoringValues[2]) monitoringValues[2].textContent = rejectedCount || 0
  }

  async function loadRequisitions() {
    const { data, error } = await client
      .from('adminrequisition_forms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { console.error('Error loading requisitions:', error); return }

    renderTable(data)
  }

  function renderTable(records) {
    const table   = document.querySelector('.requisition-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    const tbody = document.createElement('tbody')

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px;">No requisition forms found.</td></tr>`
    } else {
      records.forEach(r => {
        const statusClass = r.status === 'Pending'  ? 'status-pending'
                          : r.status === 'Approved' ? 'status-approved'
                          : 'status-rejected'

        const urgencyClass = r.urgency === 'High'   ? 'urgency-high'
                           : r.urgency === 'Medium' ? 'urgency-medium'
                           : 'urgency-low'

        tbody.innerHTML += `
          <tr data-id="${r.id}">
            <td>#${r.id}</td>
            <td>${r.requestor}</td>
            <td>${r.professor || '—'}</td>
            <td>${r.department || '—'}</td>
            <td>${r.item_requested}</td>
            <td>${r.quantity}</td>
            <td>${r.date || '—'}</td>
            <td><span class="urgency-badge ${urgencyClass}">${r.urgency || 'Normal'}</span></td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
            <td>
              <button class="approve-btn" onclick="approveRequisition(${r.id})" title="Approve" ${r.status !== 'Pending' ? 'disabled' : ''}>
                <i class="fa-solid fa-check"></i>
              </button>
              <button class="reject-btn" onclick="rejectRequisition(${r.id})" title="Reject" ${r.status !== 'Pending' ? 'disabled' : ''}>
                <i class="fa-solid fa-xmark"></i>
              </button>
              <button class="delete-btn" onclick="deleteRequisition(${r.id})" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>`
      })
    }

    table.appendChild(tbody)
  }

  window.approveRequisition = async (id) => {
    if (!confirm('Approve this requisition?')) return

    const { error } = await client
      .from('adminrequisition_forms')
      .update({ status: 'Approved', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) { alert('Failed to approve: ' + error.message); return }

    loadRequisitions()
    loadStats()
  }

  window.rejectRequisition = async (id) => {
    if (!confirm('Reject this requisition?')) return

    const { error } = await client
      .from('adminrequisition_forms')
      .update({ status: 'Rejected', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) { alert('Failed to reject: ' + error.message); return }

    loadRequisitions()
    loadStats()
  }

  window.deleteRequisition = async (id) => {
    if (!confirm('Are you sure you want to delete this requisition?')) return

    const { error } = await client
      .from('adminrequisition_forms')
      .delete()
      .eq('id', id)

    if (error) { alert('Failed to delete: ' + error.message); return }

    loadRequisitions()
    loadStats()
  }

  loadStats()
  loadRequisitions()

})