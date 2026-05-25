const { createClient } = supabase

const SUPABASE_URL      = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'

const db             = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

if (localStorage.getItem('userRole') !== 'instructor') {
  window.location.replace('/System/homepage/loginpage.html')
}

const instructorName = localStorage.getItem('username') || 'Instructor'
const tbody          = document.querySelector('.request-table tbody')
const statValues     = document.querySelectorAll('.stat-value')

let _allRequests           = []
let _groups                = {}
let _pendingApprove        = null
let _pendingReject         = null
let _isBulk                = false
let _expandedGroups        = new Set()
let _inventory             = []
let _deleteItemMode        = false
let _pendingDeleteItemId   = null
let _pendingDeleteGroupKey = null
let _pendingDeleteItemName = null

// ── Inventory ─────────────────────────────────────────────────────────────────
async function loadInventory() {
  const { data, error } = await db
    .from('admininventory')
    .select('id, item_name, quantity')
    .eq('status', 'Available')
    .order('item_name', { ascending: true })
  if (!error && data) _inventory = data
}

function getInventoryMax(itemName) {
  const found = _inventory.find(i => i.item_name === itemName)
  return found ? found.quantity : 999
}

function buildInventoryOptions(excludeNames = [], selectedName = '') {
  const opts = _inventory
    .filter(i => !excludeNames.includes(i.item_name) || i.item_name === selectedName)
    .map(i =>
      `<option value="${i.item_name}" data-max="${i.quantity}" ${i.item_name === selectedName ? 'selected' : ''}>
        ${i.item_name} (${i.quantity} available)
      </option>`
    ).join('')
  return `<option value="">Select item…</option>${opts}`
}

// ── Urgency ───────────────────────────────────────────────────────────────────
function calcUrgency(dateStr) {
  if (!dateStr) return 'Low'
  const today    = new Date(); today.setHours(0,0,0,0)
  const target   = new Date(dateStr); target.setHours(0,0,0,0)
  const daysAway = Math.ceil((target - today) / 86400000)
  if (daysAway <= 1) return 'High'
  if (daysAway <= 3) return 'Medium'
  return 'Low'
}

// ── Status helpers ────────────────────────────────────────────────────────────
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

function groupStatus(rows) {
  const statuses = [...new Set(rows.map(r => r.status))]
  if (statuses.length === 1) return statuses[0]
  if (statuses.every(s => s !== 'Pending')) return statuses[0]
  return 'Pending'
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
  _isBulk         = bulk

  const titleEl    = document.getElementById('approveModalTitle')
  const msgEl      = document.getElementById('approveModalMessage')
  const detailEl   = document.getElementById('approveModalDetail')
  const confirmBtn = document.getElementById('approveConfirmBtn')

  if (bulk) {
    titleEl.textContent = `Approve ${data.length} Request${data.length > 1 ? 's' : ''}`
    msgEl.textContent   = `You are about to approve ${data.length} request${data.length > 1 ? 's' : ''}. All will be forwarded to the admin for final approval.`
    detailEl.innerHTML  = data.map(g =>
      `<span><strong>${g.studentName}</strong> — ${g.items.length} item(s)</span>`
    ).join('')
    confirmBtn.textContent = `Approve ${data.length}`
  } else {
    const g = data
    titleEl.textContent = 'Approve Request'
    msgEl.textContent   = 'Are you sure you want to approve this request? It will be forwarded to the admin for final approval.'
    detailEl.innerHTML  = `
      <span><strong>Student:</strong> ${g.studentName}</span>
      ${g.items.map(i => `<span><strong>${i.item_requested}</strong> ×${i.quantity}</span>`).join('')}
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
  _isBulk        = bulk

  const titleEl    = document.getElementById('rejectModalTitle')
  const msgEl      = document.getElementById('rejectModalMessage')
  const detailEl   = document.getElementById('rejectModalDetail')
  const confirmBtn = document.getElementById('rejectConfirmBtn')

  if (bulk) {
    titleEl.textContent = `Reject ${data.length} Request${data.length > 1 ? 's' : ''}`
    msgEl.textContent   = `You are about to reject ${data.length} request${data.length > 1 ? 's' : ''}. This action cannot be undone.`
    detailEl.innerHTML  = data.map(g =>
      `<span><strong>${g.studentName}</strong> — ${g.items.length} item(s)</span>`
    ).join('')
    confirmBtn.textContent = `Reject ${data.length}`
  } else {
    const g = data
    titleEl.textContent = 'Reject Request'
    msgEl.textContent   = 'Are you sure you want to reject this request? This action cannot be undone.'
    detailEl.innerHTML  = `
      <span><strong>Student:</strong> ${g.studentName}</span>
      ${g.items.map(i => `<span><strong>${i.item_requested}</strong> ×${i.quantity}</span>`).join('')}
    `
    confirmBtn.textContent = 'Reject'
  }

  document.getElementById('rejectModalOverlay').classList.add('open')
}

function closeRejectModal() {
  document.getElementById('rejectModalOverlay').classList.remove('open')
  _pendingReject         = null
  _isBulk                = false
  _deleteItemMode        = false
  _pendingDeleteItemId   = null
  _pendingDeleteGroupKey = null
  _pendingDeleteItemName = null
  // Restore default button label in case delete mode changed it
  document.getElementById('rejectConfirmBtn').textContent = 'Reject'
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
  buildGroups(data)
  updateStats(data)
  applyFilter()
  clearSelection()
}

function buildGroups(data) {
  _groups = {}
  data.forEach(r => {
    const key = r.request_group_id || `solo_${r.id}`
    if (!_groups[key]) {
      _groups[key] = {
        groupKey:    key,
        groupId:     r.request_group_id || null,
        studentId:   r.student_id,
        studentName: r.student_name,
        yearLevel:   r.year_level,
        reason:      r.reason,
        dateNeeded:  r.date_needed,
        duration:    r.duration,
        createdAt:   r.created_at,
        items:       []
      }
    }
    _groups[key].items.push(r)
  })
}

function applyFilter() {
  const filter  = document.getElementById('dateFilter').value
  const toLocal = d => new Date(d).toLocaleDateString('en-CA')
  const now     = new Date()
  const today   = now.toLocaleDateString('en-CA')

  const weekAgo  = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1)

  let filteredGroups = Object.values(_groups)

  if (filter === 'today') {
    filteredGroups = filteredGroups.filter(g => toLocal(g.createdAt) === today)
  } else if (filter === 'week') {
    filteredGroups = filteredGroups.filter(g => {
      const d = toLocal(g.createdAt)
      return d >= weekAgo.toLocaleDateString('en-CA') && d <= today
    })
  } else if (filter === 'month') {
    filteredGroups = filteredGroups.filter(g => {
      const d = toLocal(g.createdAt)
      return d >= monthAgo.toLocaleDateString('en-CA') && d <= today
    })
  }

  renderTable(filteredGroups)
}

function updateStats(data) {
  const pending  = Object.values(_groups).filter(g => g.items.every(r => r.status === 'Pending')).length
  const approved = Object.values(_groups).filter(g => g.items.every(r => r.status === 'Instructor Approved')).length
  const rejected = Object.values(_groups).filter(g => g.items.every(r => r.status === 'Instructor Rejected')).length
  if (statValues[0]) statValues[0].textContent = pending
  if (statValues[1]) statValues[1].textContent = approved
  if (statValues[2]) statValues[2].textContent = rejected
}

// ── Render Table ──────────────────────────────────────────────────────────────
function renderTable(groups) {
  if (!groups || groups.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-cell">No requests found.</td></tr>`
    return
  }

  const rows = []

  groups.forEach(g => {
    const status       = groupStatus(g.items)
    const isPending    = status === 'Pending'
    const statusClass  = getStatusClass(status)
    const urgency      = calcUrgency(g.dateNeeded)
    const urgencyClass = urgency === 'High' ? 'urgency-high' : urgency === 'Medium' ? 'urgency-medium' : 'urgency-low'
    const date         = g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    const isExpanded   = _expandedGroups.has(g.groupKey)
    const isSingle     = g.items.length === 1
    const itemSummary  = isSingle
      ? `${g.items[0].item_requested} ×${g.items[0].quantity}`
      : `${g.items.length} items — ${g.items.map(i => i.item_requested).join(', ')}`

    const safeKey = g.groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')

    // ── Summary row ───────────────────────────────────────────────────────────
    rows.push(`
      <tr class="group-summary-row ${isExpanded ? 'expanded' : ''}" data-group-key="${g.groupKey}">
        <td class="checkbox-col">
          ${isPending ? `<input type="checkbox" class="row-checkbox" data-group-key="${g.groupKey}">` : ''}
        </td>
        <td>#${g.items[0].id}${g.items.length > 1 ? `<span class="group-badge">+${g.items.length - 1}</span>` : ''}</td>
        <td>
          <div class="student-info">
            <strong>${g.studentName}</strong>
            <span>${g.studentId} · ${g.yearLevel}</span>
          </div>
        </td>
        <td>${g.yearLevel}</td>
        <td class="item-summary-cell">
          <span class="item-summary-text">${itemSummary}</span>
        </td>
        <td>${g.dateNeeded || date}</td>
        <td><span class="urgency-badge ${urgencyClass}">${urgency}</span></td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td class="details-col">
          <button class="btn-details-icon ${isExpanded ? 'active' : ''}" onclick="toggleGroupDetail('${g.groupKey}')" title="${isExpanded ? 'Hide details' : 'View details'}">
            <i class="${isExpanded ? 'fa-solid fa-chevron-up' : 'fa-regular fa-file-lines'}"></i>
          </button>
        </td>
        <td>
          <div class="action-btns">
            ${isPending ? `
              <button class="btn-approve" onclick="handleGroupApprove('${g.groupKey}')">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button class="btn-reject" onclick="handleGroupReject('${g.groupKey}')">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            ` : `<span class="action-done">${status}</span>`}
          </div>
        </td>
      </tr>
    `)

    // ── Detail panel row (collapsible) ────────────────────────────────────────
    rows.push(`
      <tr class="group-detail-row ${isExpanded ? '' : 'hidden'}" data-group-key="${g.groupKey}" id="detail-row-${safeKey}">
        <td colspan="10" class="detail-panel-cell">
          ${renderGroupDetailPanel(g, isPending)}
        </td>
      </tr>
    `)
  })

  tbody.innerHTML = rows.join('')

  // Re-attach checkbox listeners
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', updateBulkBar)
  })
}

function renderGroupDetailPanel(g, isPending) {
  const safeKey      = g.groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')
  const takenNames   = g.items.map(i => i.item_requested)

  const itemRows = g.items.map(item => {
    const maxQty     = getInventoryMax(item.item_requested)
    const editExclude = takenNames.filter(n => n !== item.item_requested)
    const editOptions = buildInventoryOptions(editExclude, item.item_requested)

    return `
    <tr class="detail-item-row" data-item-id="${item.id}">
      <td>
        <span class="detail-item-name" id="name-${item.id}">${item.item_requested}</span>
        <select class="detail-item-input hidden" id="name-input-${item.id}">
          ${editOptions}
        </select>
      </td>
      <td style="white-space:nowrap;">
        <span class="detail-item-qty" id="qty-${item.id}">${item.quantity}</span>
        <div class="qty-stepper hidden" id="qty-stepper-${item.id}">
          <button type="button" class="qty-step-btn" onclick="stepQty('qty-input-${item.id}', -1)">−</button>
          <input  type="number" class="detail-item-input qty-step-input" id="qty-input-${item.id}"
                  value="${item.quantity}" min="1" max="${maxQty}" readonly>
          <button type="button" class="qty-step-btn" onclick="stepQty('qty-input-${item.id}', 1)">+</button>
        </div>
      </td>
      <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
      ${isPending ? `<td class="detail-item-actions">
          <button class="detail-btn edit" id="edit-btn-${item.id}" onclick="startEditItem(${item.id}, ${maxQty})">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="detail-btn save hidden" id="save-btn-${item.id}" onclick="saveEditItem(${item.id}, '${g.groupKey}')">
            <i class="fa-solid fa-check"></i> Save
          </button>
          <button class="detail-btn cancel-edit hidden" id="cancel-btn-${item.id}" onclick="cancelEditItem(${item.id})">
            <i class="fa-solid fa-xmark"></i>
          </button>
          ${g.items.length > 1 ? `
            <button class="detail-btn delete" onclick="deleteItem(${item.id}, '${g.groupKey}', '${item.item_requested.replace(/'/g, "\\'")}', ${item.quantity})">
              <i class="fa-solid fa-trash"></i>
            </button>
          ` : ''}
        </td>` : ''}
    </tr>
  `}).join('')

  const addOptions = buildInventoryOptions(takenNames)

  return `
    <div class="detail-panel">
      <div class="detail-panel-header">
        <div class="detail-meta">
          <span><i class="fa-solid fa-user"></i> ${g.studentName} (${g.studentId})</span>
          <span><i class="fa-solid fa-calendar"></i> Needed: ${g.dateNeeded || '—'}</span>
          <span><i class="fa-solid fa-clock"></i> Duration: ${g.duration || '—'}</span>
          <span><i class="fa-solid fa-note-sticky"></i> Reason: ${g.reason || '—'}</span>
        </div>
      </div>

      <table class="detail-items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Status</th>
            ${isPending ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody id="detail-tbody-${safeKey}">
          ${itemRows}
        </tbody>
      </table>

      ${isPending ? `
        <div class="detail-add-row" id="add-row-${safeKey}">
          <select class="detail-item-input" id="new-item-name-${safeKey}"
                  onchange="onAddSelectChange('${safeKey}')">
            ${addOptions}
          </select>
          <div class="qty-stepper">
            <button type="button" class="qty-step-btn" onclick="stepQty('new-item-qty-${safeKey}', -1)">−</button>
            <input  type="number" class="detail-item-input qty-step-input" id="new-item-qty-${safeKey}"
                    value="1" min="1" max="1" readonly>
            <button type="button" class="qty-step-btn" onclick="stepQty('new-item-qty-${safeKey}', 1)">+</button>
          </div>
          <button class="detail-btn save" onclick="addItem('${g.groupKey}')">
            <i class="fa-solid fa-plus"></i> Add Item
          </button>
        </div>
      ` : ''}
    </div>
  `
}

// ── Qty stepper helpers ───────────────────────────────────────────────────────
window.stepQty = function(inputId, delta) {
  const el  = document.getElementById(inputId)
  if (!el) return
  const min = parseInt(el.min) || 1
  const max = parseInt(el.max) || 999
  const val = parseInt(el.value) || 1
  el.value  = Math.min(max, Math.max(min, val + delta))
}

window.onAddSelectChange = function(safeKey) {
  const sel    = document.getElementById(`new-item-name-${safeKey}`)
  const qtyEl  = document.getElementById(`new-item-qty-${safeKey}`)
  if (!sel || !qtyEl) return
  const opt    = sel.options[sel.selectedIndex]
  const max    = opt ? (parseInt(opt.dataset.max) || 1) : 1
  qtyEl.max    = max
  qtyEl.value  = 1
}

window.onEditSelectChange = function(itemId) {
  const sel   = document.getElementById(`name-input-${itemId}`)
  const qtyEl = document.getElementById(`qty-input-${itemId}`)
  if (!sel || !qtyEl) return
  const opt   = sel.options[sel.selectedIndex]
  const max   = opt ? (parseInt(opt.dataset.max) || 1) : 1
  qtyEl.max   = max
  if (parseInt(qtyEl.value) > max) qtyEl.value = max
}

// ── Toggle Detail Panel ───────────────────────────────────────────────────────
window.toggleGroupDetail = function(groupKey) {
  const safeKey    = groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')
  const detailRow  = document.getElementById(`detail-row-${safeKey}`)
  const summaryRow = document.querySelector(`tr.group-summary-row[data-group-key="${groupKey}"]`)
  const btn        = summaryRow?.querySelector('.btn-details-icon')

  if (!detailRow) return

  const isHidden = detailRow.classList.contains('hidden')

  if (isHidden) {
    _expandedGroups.add(groupKey)
    detailRow.classList.remove('hidden')
    summaryRow?.classList.add('expanded')
    if (btn) {
      btn.classList.add('active')
      btn.title = 'Hide details'
      btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>'
    }
  } else {
    _expandedGroups.delete(groupKey)
    detailRow.classList.add('hidden')
    summaryRow?.classList.remove('expanded')
    if (btn) {
      btn.classList.remove('active')
      btn.title = 'View details'
      btn.innerHTML = '<i class="fa-regular fa-file-lines"></i>'
    }
  }
}

// ── Edit Item ─────────────────────────────────────────────────────────────────
window.startEditItem = function(itemId, maxQty) {
  document.getElementById(`name-${itemId}`).style.display  = 'none'
  document.getElementById(`qty-${itemId}`).style.display   = 'none'

  const nameSelect    = document.getElementById(`name-input-${itemId}`)
  nameSelect.style.display = ''
  nameSelect.classList.remove('hidden')
  nameSelect.onchange = () => onEditSelectChange(itemId)

  const stepper       = document.getElementById(`qty-stepper-${itemId}`)
  stepper.style.display = 'inline-flex'
  stepper.classList.remove('hidden')

  const qtyEl = document.getElementById(`qty-input-${itemId}`)
  qtyEl.max   = maxQty

  document.getElementById(`edit-btn-${itemId}`).classList.add('hidden')
  document.getElementById(`save-btn-${itemId}`).classList.remove('hidden')
  document.getElementById(`cancel-btn-${itemId}`)?.classList.remove('hidden')
}

window.cancelEditItem = function(itemId) {
  document.getElementById(`name-${itemId}`).style.display  = ''
  document.getElementById(`qty-${itemId}`).style.display   = ''

  const nameSelect = document.getElementById(`name-input-${itemId}`)
  nameSelect.style.display = 'none'
  nameSelect.classList.add('hidden')

  const stepper = document.getElementById(`qty-stepper-${itemId}`)
  stepper.style.display = 'none'
  stepper.classList.add('hidden')

  document.getElementById(`edit-btn-${itemId}`).classList.remove('hidden')
  document.getElementById(`save-btn-${itemId}`).classList.add('hidden')
  document.getElementById(`cancel-btn-${itemId}`)?.classList.add('hidden')
}

window.saveEditItem = async function(itemId, groupKey) {
  const nameSelect = document.getElementById(`name-input-${itemId}`)
  const newName    = nameSelect ? nameSelect.value.trim() : ''
  const newQty     = parseInt(document.getElementById(`qty-input-${itemId}`).value) || 1

  if (!newName) {
    showAlert({ type: 'warning', title: 'Invalid Input', message: 'Please select an item.' })
    return
  }

  const saveBtn      = document.getElementById(`save-btn-${itemId}`)
  saveBtn.disabled   = true
  saveBtn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i>'

  const { error } = await db
    .from('studentrequests')
    .update({ item_requested: newName, quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  saveBtn.disabled  = false

  if (error) {
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save'
    showAlert({ type: 'danger', title: 'Update Failed', message: error.message })
    return
  }

  await loadRequests()
  _expandedGroups.add(groupKey)
}

// ── Delete Item ───────────────────────────────────────────────────────────────
window.deleteItem = function(itemId, groupKey, itemName, itemQty) {
  const group = _groups[groupKey]

  // Guard: must have more than 1 item (check both cached group and the fact the button exists)
  if (group && group.items.length <= 1) {
    showAlert({ type: 'warning', title: 'Cannot Delete', message: 'A request must have at least one item. Reject the request instead.' })
    return
  }

  // Store pending delete state
  _deleteItemMode        = true
  _pendingDeleteItemId   = itemId
  _pendingDeleteGroupKey = groupKey
  _pendingDeleteItemName = itemName

  // Re-purpose the reject modal for delete confirmation
  document.getElementById('rejectModalTitle').textContent   = 'Remove Item'
  document.getElementById('rejectModalMessage').textContent = 'Are you sure you want to remove this item from the request? This cannot be undone.'
  document.getElementById('rejectModalDetail').innerHTML    = `<span><strong>${itemName}</strong> ×${itemQty}</span>`
  document.getElementById('rejectConfirmBtn').textContent   = 'Remove'
  document.getElementById('rejectModalOverlay').classList.add('open')
}

// ── Add Item ──────────────────────────────────────────────────────────────────
window.addItem = async function(groupKey) {
  const safeKey = groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')
  const nameEl  = document.getElementById(`new-item-name-${safeKey}`)
  const qtyEl   = document.getElementById(`new-item-qty-${safeKey}`)

  const name = nameEl ? nameEl.value.trim() : ''
  const qty  = parseInt(qtyEl?.value) || 1

  if (!name) {
    showAlert({ type: 'warning', title: 'Missing Item', message: 'Please select an item from the list.' })
    nameEl?.focus()
    return
  }

  const group = _groups[groupKey]
  if (!group) return

  const addBtn = document.querySelector(`#add-row-${safeKey} .detail-btn.save`)
  if (addBtn) { addBtn.disabled = true; addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...' }

  const { error } = await db.from('studentrequests').insert({
    student_id:       group.studentId,
    student_name:     group.studentName,
    year_level:       group.yearLevel,
    item_requested:   name,
    quantity:         qty,
    reason:           group.reason,
    date_needed:      group.dateNeeded,
    duration:         group.duration,
    status:           'Pending',
    request_group_id: group.groupId,
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString()
  })

  if (addBtn) { addBtn.disabled = false; addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Item' }

  if (error) {
    showAlert({ type: 'danger', title: 'Add Failed', message: error.message })
    return
  }

  nameEl.value = ''
  qtyEl.value  = 1
  qtyEl.max    = 1

  await loadRequests()
  _expandedGroups.add(groupKey)
}

// ── Group Approve / Reject triggers ──────────────────────────────────────────
window.handleGroupApprove = function(groupKey) {
  const g = _groups[groupKey]
  if (!g) return
  showApproveModal(g, false)
}

window.handleGroupReject = function(groupKey) {
  const g = _groups[groupKey]
  if (!g) return
  showRejectModal(g, false)
}

// ── Confirm Approve ───────────────────────────────────────────────────────────
async function confirmApprove() {
  if (!_pendingApprove) return

  const confirmBtn       = document.getElementById('approveConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Approving...'

  const groups = _isBulk ? _pendingApprove : [_pendingApprove]

  for (const g of groups) {
    for (const item of g.items) {
      const { error } = await db
        .from('studentrequests')
        .update({ status: 'Instructor Approved', updated_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) { console.error(`Failed to approve item ${item.id}:`, error); continue }

      await db.from('adminrequisition_forms').insert({
        requestor:      g.studentName,
        professor:      instructorName,
        item_requested: item.item_requested,
        quantity:       item.quantity,
        date:           g.dateNeeded || new Date().toISOString().split('T')[0],
        urgency:        calcUrgency(g.dateNeeded),
        status:         'Pending Admin Approval',
        created_at:     new Date().toISOString(),
        updated_at:     new Date().toISOString()
      })
    }
  }

  confirmBtn.disabled    = false
  confirmBtn.textContent = _isBulk ? `Approve ${groups.length}` : 'Approve'
  closeApproveModal()

  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  showAlert({
    type:    'success',
    title:   _isBulk ? `${groups.length} Requests Approved` : 'Request Approved',
    message: `${total} item${total > 1 ? 's have' : ' has'} been approved and forwarded to the admin.`
  })

  await loadRequests()
}

// ── Confirm Reject ────────────────────────────────────────────────────────────
async function confirmReject() {
  // Handle delete-item mode (reuses the reject modal)
  if (_deleteItemMode) {
    const confirmBtn = document.getElementById('rejectConfirmBtn')
    confirmBtn.disabled    = true
    confirmBtn.textContent = 'Removing...'

    // Capture before closeRejectModal() nulls them
    const groupKey = _pendingDeleteGroupKey
    const itemId   = Number(_pendingDeleteItemId)

    // Try to find cached item to add student_id filter (helps satisfy RLS policies)
    const group  = _groups[groupKey]
    const cached = group?.items.find(i => Number(i.id) === itemId)
    console.log('[deleteItem] id:', itemId, 'groupKey:', groupKey, 'student_id:', cached?.student_id)

    let query = db.from('studentrequests').delete({ count: 'exact' }).eq('id', itemId)
    if (cached?.student_id) query = query.eq('student_id', cached.student_id)

    const { error, count } = await query

    console.log('[deleteItem] error:', error, 'count:', count)

    confirmBtn.disabled    = false
    confirmBtn.textContent = 'Remove'

    if (error) {
      closeRejectModal()
      showAlert({ type: 'danger', title: 'Delete Failed', message: error.message })
      return
    }

    if (count === 0) {
      closeRejectModal()
      showAlert({
        type: 'warning',
        title: 'Delete Blocked',
        message: 'Row Level Security (RLS) is preventing this delete. In Supabase, go to Table Editor → studentrequests → RLS Policies and add a DELETE policy for the anon role.'
      })
      return
    }

    closeRejectModal()
    showAlert({ type: 'success', title: 'Item Removed', message: 'The item has been removed from the request.' })
    await loadRequests()
    _expandedGroups.add(groupKey)
    return
  }

  if (!_pendingReject) return

  const confirmBtn       = document.getElementById('rejectConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Rejecting...'

  const groups = _isBulk ? _pendingReject : [_pendingReject]

  for (const g of groups) {
    for (const item of g.items) {
      const { error } = await db
        .from('studentrequests')
        .update({ status: 'Instructor Rejected', updated_at: new Date().toISOString() })
        .eq('id', item.id)
      if (error) { console.error(`Failed to reject item ${item.id}:`, error); continue }

      // Restore quantity back to inventory
      const { data: inv } = await db
        .from('admininventory')
        .select('id, quantity')
        .ilike('item_name', item.item_requested)
        .maybeSingle()

      if (inv) {
        const restoredQty = inv.quantity + item.quantity
        await db
          .from('admininventory')
          .update({
            quantity:   restoredQty,
            status:     'Available',
            updated_at: new Date().toISOString()
          })
          .eq('id', inv.id)
      }
    }
  }

  confirmBtn.disabled    = false
  confirmBtn.textContent = _isBulk ? `Reject ${groups.length}` : 'Reject'
  closeRejectModal()

  showAlert({
    type:    'danger',
    title:   _isBulk ? `${groups.length} Requests Rejected` : 'Request Rejected',
    message: _isBulk
      ? `${groups.length} request${groups.length > 1 ? 's have' : ' has'} been rejected.`
      : 'The request has been rejected.'
  })

  await loadRequests()
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

  const allBoxes = document.querySelectorAll('.row-checkbox')
  document.getElementById('selectAll').checked       = allBoxes.length > 0 && checked.length === allBoxes.length
  document.getElementById('selectAll').indeterminate = checked.length > 0 && checked.length < allBoxes.length
}

function clearSelection() {
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false)
  const sa = document.getElementById('selectAll')
  if (sa) { sa.checked = false; sa.indeterminate = false }
  document.getElementById('bulkBar').classList.remove('visible')
}

function getSelectedGroups() {
  return getChecked().map(cb => _groups[cb.dataset.groupKey]).filter(Boolean)
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
  const selected = getSelectedGroups()
  if (!selected.length) return
  showApproveModal(selected, true)
})

document.getElementById('bulkRejectBtn').addEventListener('click', () => {
  const selected = getSelectedGroups()
  if (!selected.length) return
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

loadInventory().then(loadRequests)