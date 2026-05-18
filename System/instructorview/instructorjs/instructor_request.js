const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

if (localStorage.getItem('userRole') !== 'instructor') {
  window.location.replace('/System/homepage/loginpage.html')
}

const instructorName = localStorage.getItem('username') || 'Instructor'

const tbody        = document.querySelector('.request-table tbody')
const statValues   = document.querySelectorAll('.stat-value')

async function loadRequests() {
  tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">
    <i class="fa-solid fa-spinner fa-spin"></i> Loading requests...
  </td></tr>`

  const { data, error } = await db
    .from('studentrequests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">Failed to load requests.</td></tr>`
    console.error(error)
    return
  }

  updateStats(data)
  renderTable(data)
}

function updateStats(data) {
  const pending  = data.filter(r => r.status === 'Pending').length
  const approved = data.filter(r => r.status === 'Instructor Approved').length
  const rejected = data.filter(r => r.status === 'Instructor Rejected').length

  statValues[0].textContent = pending
  statValues[1].textContent = approved
  statValues[2].textContent = rejected
}

function renderTable(data) {
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">No requests found.</td></tr>`
    return
  }

  tbody.innerHTML = data.map(r => {
    const statusClass = getStatusClass(r.status)
    const date        = r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : '—'

    const isPending = r.status === 'Pending'

    return `
      <tr data-id="${r.id}">
        <td>#${r.id}</td>
        <td>
          <div class="student-info">
            <strong>${r.student_name}</strong>
            <span>${r.student_id} · ${r.year_level}</span>
          </div>
        </td>
        <td>${r.year_level}</td>
        <td>${r.item_requested}</td>
        <td>${r.quantity}</td>
        <td>${date}</td>
        <td><span class="urgency-badge">${r.reason || '—'}</span></td>
        <td><span class="status-badge ${statusClass}">${r.status}</span></td>
        <td>
          ${isPending ? `
            <div class="action-btns">
              <button class="btn-approve" onclick="handleApprove(${r.id}, '${r.student_id}', '${r.student_name}', '${r.item_requested}', ${r.quantity}, '${r.year_level}')">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button class="btn-reject" onclick="handleReject(${r.id})">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            </div>
          ` : `<span class="action-done">${r.status}</span>`}
        </td>
      </tr>
    `
  }).join('')
}

function getStatusClass(status) {
  switch (status) {
    case 'Pending':             return 'status-pending'
    case 'Instructor Approved': return 'status-approved'
    case 'Instructor Rejected': return 'status-rejected'
    case 'Admin Approved':      return 'status-approved'
    case 'Admin Rejected':      return 'status-rejected'
    default:                    return ''
  }
}

async function handleApprove(id, studentId, studentName, itemRequested, quantity, yearLevel) {
  const row = document.querySelector(`tr[data-id="${id}"]`)
  setRowLoading(row, true)

  const { error: updateError } = await db
    .from('studentrequests')
    .update({
      status:     'Instructor Approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) {
    setRowLoading(row, false)
    alert('Failed to approve request. Please try again.')
    console.error(updateError)
    return
  }

  const { error: insertError } = await db
    .from('adminrequisition_forms')
    .insert({
      requestor:      studentName,
      professor:      instructorName,
      item_requested: itemRequested,
      quantity:       quantity,
      date:           new Date().toISOString().split('T')[0],
      urgency:        yearLevel,
      status:         'Pending Admin Approval',
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString()
    })

  if (insertError) {
    console.error('Failed to forward to admin:', insertError)
  }

  await loadRequests()
}

async function handleReject(id) {
  if (!confirm('Are you sure you want to reject this request?')) return

  const row = document.querySelector(`tr[data-id="${id}"]`)
  setRowLoading(row, true)

  const { error } = await db
    .from('studentrequests')
    .update({
      status:     'Instructor Rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    setRowLoading(row, false)
    alert('Failed to reject request. Please try again.')
    console.error(error)
    return
  }

  await loadRequests()
}

function setRowLoading(row, loading) {
  if (!row) return
  const btns = row.querySelectorAll('button')
  btns.forEach(b => b.disabled = loading)
  if (loading) {
    const td = row.querySelector('td:last-child')
    td.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`
  }
}

window.handleApprove = handleApprove
window.handleReject  = handleReject

loadRequests()