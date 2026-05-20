const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

if (localStorage.getItem('userRole') !== 'instructor') {
  window.location.replace('/System/homepage/loginpage.html')
}

const instructorName = localStorage.getItem('username') || 'Instructor'
const tbody          = document.querySelector('.request-table tbody')
const statValues     = document.querySelectorAll('.stat-value')

// ── Urgency ───────────────────────────────────────────────────────────────────
function calcUrgency(dateStr) {
  if (!dateStr) return 'Low'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const daysAway = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
  if (daysAway <= 1) return 'High'
  if (daysAway <= 3) return 'Medium'
  return 'Low'
}

const dateNeeded = r.date_needed || null
const duration   = r.duration || null

// ── Alert Modal ───────────────────────────────────────────────────────────────
function showAlert({ type = 'error', title, message }) {
  const overlay  = document.getElementById('alertModalOverlay')
  const icon     = document.getElementById('alertModalIcon')
  const iconEl   = icon.querySelector('i')
  const titleEl  = document.getElementById('alertModalTitle')
  const msgEl    = document.getElementById('alertModalMessage')
  const closeBtn = document.getElementById('alertModalCloseBtn')

  icon.className   = `modal-icon ${type}`
  iconEl.className = type === 'danger'  ? 'fa-solid fa-circle-xmark'
                   : type === 'warning' ? 'fa-solid fa-triangle-exclamation'
                   : 'fa-solid fa-circle-check'

  titleEl.textContent = title
  msgEl.textContent   = message
  closeBtn.className  = `modal-btn ${type}`
  overlay.classList.add('open')
}

function closeAlert() {
  document.getElementById('alertModalOverlay').classList.remove('open')
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
let _pendingApprove = null
let _pendingReject  = null

function showApproveModal(data) {
  _pendingApprove = data
  document.getElementById('approveModalDetail').innerHTML = `
    <span><strong>Student:</strong> ${data.studentName}</span>
    <span><strong>Item:</strong> ${data.itemRequested}</span>
    <span><strong>Quantity:</strong> ${data.quantity}</span>
  `
  document.getElementById('approveModalOverlay').classList.add('open')
}

function showRejectModal(data) {
  _pendingReject = data
  document.getElementById('rejectModalDetail').innerHTML = `
    <span><strong>Student:</strong> ${data.studentName}</span>
    <span><strong>Item:</strong> ${data.itemRequested}</span>
    <span><strong>Quantity:</strong> ${data.quantity}</span>
  `
  document.getElementById('rejectModalOverlay').classList.add('open')
}

function closeApproveModal() {
  document.getElementById('approveModalOverlay').classList.remove('open')
  _pendingApprove = null
}

function closeRejectModal() {
  document.getElementById('rejectModalOverlay').classList.remove('open')
  _pendingReject = null
}

// ── Load Requests ─────────────────────────────────────────────────────────────
let _allRequests = []

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

  _allRequests = data
  updateStats(data)
  applyFilter()
}

function applyFilter() {
  const filter = document.getElementById('dateFilter').value
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  let filtered = _allRequests

  if (filter === 'today') {
    filtered = _allRequests.filter(r => {
      const d = new Date(r.created_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === now.getTime()
    })
  } else if (filter === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    filtered = _allRequests.filter(r => new Date(r.created_at) >= weekAgo)
  } else if (filter === 'month') {
    const monthAgo = new Date(now)
    monthAgo.setMonth(now.getMonth() - 1)
    filtered = _allRequests.filter(r => new Date(r.created_at) >= monthAgo)
  }

  renderTable(filtered)
}

document.getElementById('dateFilter').addEventListener('change', applyFilter)

function updateStats(data) {
  const pending  = data.filter(r => r.status === 'Pending').length
  const approved = data.filter(r => r.status === 'Instructor Approved').length
  const rejected = data.filter(r => r.status === 'Instructor Rejected').length

  if (statValues[0]) statValues[0].textContent = pending
  if (statValues[1]) statValues[1].textContent = approved
  if (statValues[2]) statValues[2].textContent = rejected
}

function renderTable(data) {
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">No requests found.</td></tr>`
    return
  }

  tbody.innerHTML = data.map(r => {
    const statusClass  = getStatusClass(r.status)
    const date         = r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : '—'
    const dateNeeded = r.date_needed || null
    const urgency      = calcUrgency(dateNeeded)
    const urgencyClass = urgency === 'High' ? 'urgency-high' : urgency === 'Medium' ? 'urgency-medium' : 'urgency-low'
    const isPending    = r.status === 'Pending'

    const safeStudentName = (r.student_name || '').replace(/'/g, "\\'")
    const safeItem        = (r.item_requested || '').replace(/'/g, "\\'")
    const safeDateNeeded  = (dateNeeded || '').replace(/'/g, "\\'")

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
        <td>${dateNeeded || date}</td>
        <td><span class="urgency-badge ${urgencyClass}">${urgency}</span></td>
        <td><span class="status-badge ${statusClass}">${r.status}</span></td>
        <td>
          ${isPending ? `
            <div class="action-btns">
              <button class="btn-approve" onclick="handleApprove(${r.id}, '${r.student_id}', '${safeStudentName}', '${safeItem}', ${r.quantity}, '${safeDateNeeded}')">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button class="btn-reject" onclick="handleReject(${r.id}, '${safeStudentName}', '${safeItem}', ${r.quantity})">
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

// ── Approve ───────────────────────────────────────────────────────────────────
window.handleApprove = (id, studentId, studentName, itemRequested, quantity, dateNeeded) => {
  showApproveModal({ id, studentId, studentName, itemRequested, quantity, dateNeeded })
}

async function confirmApprove() {
  if (!_pendingApprove) return
  const { id, studentId, studentName, itemRequested, quantity, dateNeeded } = _pendingApprove

  const confirmBtn = document.getElementById('approveConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Approving...'

  const row = document.querySelector(`tr[data-id="${id}"]`)
  setRowLoading(row, true)

  const { error: updateError } = await db
    .from('studentrequests')
    .update({ status: 'Instructor Approved', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    setRowLoading(row, false)
    confirmBtn.disabled    = false
    confirmBtn.textContent = 'Approve'
    closeApproveModal()
    showAlert({ type: 'danger', title: 'Approval Failed', message: 'Failed to approve request. Please try again.' })
    console.error(updateError)
    return
  }

  const urgency = calcUrgency(dateNeeded)

  const { error: insertError } = await db
    .from('adminrequisition_forms')
    .insert({
      requestor:      studentName,
      professor:      instructorName,
      item_requested: itemRequested,
      quantity:       quantity,
      date:           dateNeeded || new Date().toISOString().split('T')[0],
      urgency:        urgency,
      status:         'Pending Admin Approval',
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString()
    })

  if (insertError) {
    console.error('Failed to forward to admin:', insertError)
  }

  confirmBtn.disabled    = false
  confirmBtn.textContent = 'Approve'
  closeApproveModal()
  await loadRequests()
}

// ── Reject ────────────────────────────────────────────────────────────────────
window.handleReject = (id, studentName, itemRequested, quantity) => {
  showRejectModal({ id, studentName, itemRequested, quantity })
}

async function confirmReject() {
  if (!_pendingReject) return
  const { id } = _pendingReject

  const confirmBtn = document.getElementById('rejectConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Rejecting...'

  const row = document.querySelector(`tr[data-id="${id}"]`)
  setRowLoading(row, true)

  const { error } = await db
    .from('studentrequests')
    .update({ status: 'Instructor Rejected', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    setRowLoading(row, false)
    confirmBtn.disabled    = false
    confirmBtn.textContent = 'Reject'
    closeRejectModal()
    showAlert({ type: 'danger', title: 'Rejection Failed', message: 'Failed to reject request. Please try again.' })
    console.error(error)
    return
  }

  confirmBtn.disabled    = false
  confirmBtn.textContent = 'Reject'
  closeRejectModal()
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

// ── Event Listeners ───────────────────────────────────────────────────────────
document.getElementById('approveConfirmBtn').addEventListener('click', confirmApprove)
document.getElementById('approveCancelBtn').addEventListener('click', closeApproveModal)
document.getElementById('approveModalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('approveModalOverlay')) closeApproveModal()
})

document.getElementById('rejectConfirmBtn').addEventListener('click', confirmReject)
document.getElementById('rejectCancelBtn').addEventListener('click', closeRejectModal)
document.getElementById('rejectModalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('rejectModalOverlay')) closeRejectModal()
})

document.getElementById('alertModalCloseBtn').addEventListener('click', closeAlert)
document.getElementById('alertModalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('alertModalOverlay')) closeAlert()
})

loadRequests()