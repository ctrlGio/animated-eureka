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

let _allRequests    = []
let _pendingApprove = null
let _pendingReject  = null
let _isBulk         = false

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

// ── Alert Modal ───────────────────────────────────────────────────────────────
function showAlert({ type = 'success', title, message }) {
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

// ── Approve Modal ─────────────────────────────────────────────────────────────
function showApproveModal(data, bulk = false) {
  _pendingApprove = data
  _isBulk = bulk

  const titleEl   = document.getElementById('approveModalTitle')
  const msgEl     = document.getElementById('approveModalMessage')
  const detailEl  = document.getElementById('approveModalDetail')
  const confirmBtn = document.getElementById('approveConfirmBtn')

  if (bulk) {
    titleEl.textContent = `Approve ${data.length} Request${data.length > 1 ? 's' : ''}`
    msgEl.textContent   = `You are about to approve ${data.length} request${data.length > 1 ? 's' : ''}. All will be forwarded to the admin for final approval.`
    detailEl.innerHTML  = data.map(r =>
      `<span><strong>${r.studentName}</strong> — ${r.itemRequested} ×${r.quantity}</span>`
    ).join('')
    confirmBtn.textContent = `Approve ${data.length}`
  } else {
    titleEl.textContent = 'Approve Request'
    msgEl.textContent   = 'Are you sure you want to approve this request? It will be forwarded to the admin for final approval.'
    detailEl.innerHTML  = `
      <span><strong>Student:</strong> ${data.studentName}</span>
      <span><strong>Item:</strong> ${data.itemRequested}</span>
      <span><strong>Quantity:</strong> ${data.quantity}</span>
    `
    confirmBtn.textContent = 'Approve'
  }

  document.getElementById('approveModalOverlay').classList.add('open')
}

function closeApproveModal() {
  document.getElementById('approveModalOverlay').classList.remove('open')
  _pendingApprove = null
  _isBulk = false
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function showRejectModal(data, bulk = false) {
  _pendingReject = data
  _isBulk = bulk

  const titleEl    = document.getElementById('rejectModalTitle')
  const msgEl      = document.getElementById('rejectModalMessage')
  const detailEl   = document.getElementById('rejectModalDetail')
  const confirmBtn = document.getElementById('rejectConfirmBtn')

  if (bulk) {
    titleEl.textContent = `Reject ${data.length} Request${data.length > 1 ? 's' : ''}`
    msgEl.textContent   = `You are about to reject ${data.length} request${data.length > 1 ? 's' : ''}. This action cannot be undone.`
    detailEl.innerHTML  = data.map(r =>
      `<span><strong>${r.studentName}</strong> — ${r.itemRequested} ×${r.quantity}</span>`
    ).join('')
    confirmBtn.textContent = `Reject ${data.length}`
  } else {
    titleEl.textContent = 'Reject Request'
    msgEl.textContent   = 'Are you sure you want to reject this request? This action cannot be undone.'
    detailEl.innerHTML  = `
      <span><strong>Student:</strong> ${data.studentName}</span>
      <span><strong>Item:</strong> ${data.itemRequested}</span>
      <span><strong>Quantity:</strong> ${data.quantity}</span>
    `
    confirmBtn.textContent = 'Reject'
  }

  document.getElementById('rejectModalOverlay').classList.add('open')
}

function closeRejectModal() {
  document.getElementById('rejectModalOverlay').classList.remove('open')
  _pendingReject = null
  _isBulk = false
}

// ── Load Requests ─────────────────────────────────────────────────────────────
async function loadRequests() {
  tbody.innerHTML = `<tr><td colspan="10" class="loading-cell">
    <i class="fa-solid fa-spinner fa-spin"></i> Loading requests...
  </td></tr>`

  const { data, error } = await db
    .from('studentrequests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-cell">Failed to load requests.</td></tr>`
    console.error(error)
    return
  }

  _allRequests = data
  updateStats(data)
  applyFilter()
  clearSelection()
}

function applyFilter() {
  const filter  = document.getElementById('dateFilter').value
  const toLocal = d => new Date(d).toLocaleDateString('en-CA') // YYYY-MM-DD in local time

  const now      = new Date()
  const todayStr = now.toLocaleDateString('en-CA')

  const weekAgo  = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const weekAgoStr = weekAgo.toLocaleDateString('en-CA')

  const monthAgo = new Date(now)
  monthAgo.setMonth(now.getMonth() - 1)
  const monthAgoStr = monthAgo.toLocaleDateString('en-CA')

  let filtered = _allRequests

  if (filter === 'today') {
    filtered = _allRequests.filter(r => toLocal(r.created_at) === todayStr)
  } else if (filter === 'week') {
    filtered = _allRequests.filter(r => toLocal(r.created_at) >= weekAgoStr && toLocal(r.created_at) <= todayStr)
  } else if (filter === 'month') {
    filtered = _allRequests.filter(r => toLocal(r.created_at) >= monthAgoStr && toLocal(r.created_at) <= todayStr)
  }

  renderTable(filtered)
}

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
    tbody.innerHTML = `<tr><td colspan="10" class="empty-cell">No requests found.</td></tr>`
    return
  }

  tbody.innerHTML = data.map(r => {
    const statusClass  = getStatusClass(r.status)
    const date         = r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    }) : '—'
    const dateNeeded   = r.date_needed || null
    const urgency      = calcUrgency(dateNeeded)
    const urgencyClass = urgency === 'High' ? 'urgency-high' : urgency === 'Medium' ? 'urgency-medium' : 'urgency-low'
    const isPending    = r.status === 'Pending'

    const safeStudentName = (r.student_name || '').replace(/'/g, "\\'")
    const safeItem        = (r.item_requested || '').replace(/'/g, "\\'")
    const safeDateNeeded  = (dateNeeded || '').replace(/'/g, "\\'")

    return `
      <tr data-id="${r.id}" data-pending="${isPending}">
        <td class="checkbox-col">
          ${isPending ? `<input type="checkbox" class="row-checkbox" data-id="${r.id}" 
            data-student-name="${safeStudentName}"
            data-item="${safeItem}"
            data-quantity="${r.quantity}"
            data-student-id="${r.student_id}"
            data-date-needed="${safeDateNeeded}">` : ''}
        </td>
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

  // Attach checkbox listeners after render
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', updateBulkBar)
  })
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

// ── Selection & Bulk Bar ──────────────────────────────────────────────────────
function getChecked() {
  return [...document.querySelectorAll('.row-checkbox:checked')]
}

function updateBulkBar() {
  const checked = getChecked()
  const bar     = document.getElementById('bulkBar')
  const countEl = document.getElementById('bulkCount')

  if (checked.length > 0) {
    bar.classList.add('visible')
    countEl.textContent = `${checked.length} selected`
  } else {
    bar.classList.remove('visible')
  }

  // Sync select-all state
  const allBoxes = document.querySelectorAll('.row-checkbox')
  document.getElementById('selectAll').checked        = allBoxes.length > 0 && checked.length === allBoxes.length
  document.getElementById('selectAll').indeterminate  = checked.length > 0 && checked.length < allBoxes.length
}

function clearSelection() {
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false)
  const sa = document.getElementById('selectAll')
  if (sa) { sa.checked = false; sa.indeterminate = false }
  document.getElementById('bulkBar').classList.remove('visible')
}

function getSelectedData() {
  return getChecked().map(cb => ({
    id:          parseInt(cb.dataset.id),
    studentId:   cb.dataset.studentId,
    studentName: cb.dataset.studentName,
    itemRequested: cb.dataset.item,
    quantity:    parseInt(cb.dataset.quantity),
    dateNeeded:  cb.dataset.dateNeeded
  }))
}

// ── Single Approve/Reject ─────────────────────────────────────────────────────
window.handleApprove = (id, studentId, studentName, itemRequested, quantity, dateNeeded) => {
  showApproveModal({ id, studentId, studentName, itemRequested, quantity, dateNeeded }, false)
}

window.handleReject = (id, studentName, itemRequested, quantity) => {
  showRejectModal({ id, studentName, itemRequested, quantity }, false)
}

// ── Confirm Approve ───────────────────────────────────────────────────────────
async function confirmApprove() {
  if (!_pendingApprove) return

  const confirmBtn = document.getElementById('approveConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Approving...'

  const items = _isBulk ? _pendingApprove : [_pendingApprove]

  for (const item of items) {
    const { error: updateError } = await db
      .from('studentrequests')
      .update({ status: 'Instructor Approved', updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (updateError) {
      console.error(`Failed to approve request ${item.id}:`, updateError)
      continue
    }

    const urgency = calcUrgency(item.dateNeeded)

    await db.from('adminrequisition_forms').insert({
      requestor:      item.studentName,
      professor:      instructorName,
      item_requested: item.itemRequested,
      quantity:       item.quantity,
      date:           item.dateNeeded || new Date().toISOString().split('T')[0],
      urgency:        urgency,
      status:         'Pending Admin Approval',
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString()
    })
  }

  confirmBtn.disabled    = false
  confirmBtn.textContent = _isBulk ? `Approve ${items.length}` : 'Approve'
  closeApproveModal()

  showAlert({
    type:    'success',
    title:   _isBulk ? `${items.length} Requests Approved` : 'Request Approved',
    message: _isBulk
      ? `${items.length} request${items.length > 1 ? 's have' : ' has'} been approved and forwarded to the admin.`
      : 'The request has been approved and forwarded to the admin.'
  })

  await loadRequests()
}

// ── Confirm Reject ────────────────────────────────────────────────────────────
async function confirmReject() {
  if (!_pendingReject) return

  const confirmBtn = document.getElementById('rejectConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Rejecting...'

  const items = _isBulk ? _pendingReject : [_pendingReject]

  for (const item of items) {
    const { error } = await db
      .from('studentrequests')
      .update({ status: 'Instructor Rejected', updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (error) console.error(`Failed to reject request ${item.id}:`, error)
  }

  confirmBtn.disabled    = false
  confirmBtn.textContent = _isBulk ? `Reject ${items.length}` : 'Reject'
  closeRejectModal()

  showAlert({
    type:    'danger',
    title:   _isBulk ? `${items.length} Requests Rejected` : 'Request Rejected',
    message: _isBulk
      ? `${items.length} request${items.length > 1 ? 's have' : ' has'} been rejected.`
      : 'The request has been rejected.'
  })

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
document.getElementById('selectAll').addEventListener('change', function () {
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = this.checked)
  updateBulkBar()
})

document.getElementById('dateFilter').addEventListener('change', () => {
  clearSelection()
  applyFilter()
})

document.getElementById('bulkApproveBtn').addEventListener('click', () => {
  const selected = getSelectedData()
  if (selected.length === 0) return
  showApproveModal(selected, true)
})

document.getElementById('bulkRejectBtn').addEventListener('click', () => {
  const selected = getSelectedData()
  if (selected.length === 0) return
  showRejectModal(selected, true)
})

document.getElementById('bulkCancelBtn').addEventListener('click', clearSelection)

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