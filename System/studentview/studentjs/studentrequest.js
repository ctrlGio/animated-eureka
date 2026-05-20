const { createClient } = supabase
const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const studentId   = localStorage.getItem('studentId')   || '—'
const studentName = localStorage.getItem('username')     || '—'
const yearLevel   = localStorage.getItem('yearLevel')    || '—'

const dateInput = document.getElementById('dateNeeded')
const today = new Date()
dateInput.min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

// ── Student Info ──────────────────────────────────────────────────────────────
function fillStudentInfo() {
  const idEl   = document.getElementById('info-student-id')
  const nameEl = document.getElementById('info-student-name')
  const yrEl   = document.getElementById('info-year-level')
  if (idEl)   idEl.textContent   = studentId
  if (nameEl) nameEl.textContent = studentName
  if (yrEl)   yrEl.textContent   = yearLevel
}

// ── Equipment Options ─────────────────────────────────────────────────────────
async function loadEquipmentOptions() {
  const { data, error } = await client
    .from('admininventory')
    .select('id, item_name, status, quantity')
    .eq('status', 'Available')
    .order('item_name', { ascending: true })
  if (error) { console.error('Failed to load equipment:', error); return }
  window._equipmentList = data || []
  populateAllSelects()
}

function buildOptions(selectedName = '', excludeNames = []) {
  const list = window._equipmentList || []
  return '<option value="">Select equipment...</option>' +
    list
      .filter(item => !excludeNames.includes(item.item_name) || item.item_name === selectedName)
      .map(item =>
        `<option value="${item.item_name}" ${item.item_name === selectedName ? 'selected' : ''} data-max="${item.quantity}">
          ${item.item_name} (${item.quantity} available)
        </option>`
      ).join('')
}

function populateAllSelects() {
  document.querySelectorAll('.item-select').forEach(sel => {
    const current = sel.value
    sel.innerHTML = buildOptions(current)
  })
}

function getMaxQty(itemName) {
  const found = (window._equipmentList || []).find(i => i.item_name === itemName)
  return found ? found.quantity : 1
}

// ── Item Rows ─────────────────────────────────────────────────────────────────
function getSelectedItemNames(excludeRow = null) {
  const names = []
  document.querySelectorAll('.item-entry').forEach(row => {
    if (row === excludeRow) return
    const sel = row.querySelector('.item-select')
    if (sel && sel.value) names.push(sel.value)
  })
  return names
}

function createItemRow(preselectedName = '') {
  const row = document.createElement('div')
  row.className = 'form-row items-row item-entry'
  const initialMax = preselectedName ? getMaxQty(preselectedName) : 1

  row.innerHTML = `
    <div class="form-group flex-grow">
      <select class="item-select" required>${buildOptions(preselectedName, getSelectedItemNames())}</select>
    </div>
    <div class="form-group qty-box">
      <input type="number" class="item-qty" value="1" min="1" max="${initialMax}" required>
    </div>
    <button type="button" class="btn-remove-item" title="Remove">
      <i class="fa-solid fa-xmark"></i>
    </button>`

  const sel = row.querySelector('.item-select')
  const qty = row.querySelector('.item-qty')

  sel.addEventListener('change', () => {
    const max = getMaxQty(sel.value)
    qty.max = max
    if (parseInt(qty.value) > max) qty.value = max
    refreshAllSelects()
  })

  row.querySelector('.btn-remove-item').addEventListener('click', () => {
    row.remove()
    updateRemoveButtons()
    refreshAllSelects()
  })

  return row
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.item-entry')
  rows.forEach(row => {
    const btn = row.querySelector('.btn-remove-item')
    if (btn) btn.style.visibility = rows.length > 1 ? 'visible' : 'hidden'
  })
}

function initItemRows() {
  const container = document.getElementById('items-container')
  container.innerHTML = `
    <div class="items-header">
      <span class="items-header-label" style="flex: 3;">Item Name</span>
      <span class="items-header-label" style="flex: 0.5;">Quantity</span>
      <span style="width: 28px; flex-shrink: 0;"></span>
    </div>
  `
  const preselected = sessionStorage.getItem('preselectedItem') || ''
  sessionStorage.removeItem('preselectedItem')
  container.appendChild(createItemRow(preselected))
  updateRemoveButtons()
}

// ── Past Requests ─────────────────────────────────────────────────────────────
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">No requests yet.</td></tr>'
    return
  }

  tbody.innerHTML = data.map(r =>
    `<tr>
      <td>${r.item_requested}</td>
      <td>${r.quantity}</td>
      <td>${r.reason || '—'}</td>
      <td>${r.date_needed || '—'}</td>
      <td>${r.duration || '—'}</td>
      <td><span class="status-badge status-${r.status.toLowerCase().replace(/\s+/g, '-')}">${r.status}</span></td>
      <td>${r.created_at ? r.created_at.split('T')[0] : '—'}</td>
    </tr>`
  ).join('')
}

// ── Alert Modal ───────────────────────────────────────────────────────────────
function showAlert({ type = 'error', title, message }) {
  const overlay  = document.getElementById('alertModalOverlay')
  const icon     = document.getElementById('alertModalIcon')
  const iconEl   = icon.querySelector('i')
  const titleEl  = document.getElementById('alertModalTitle')
  const msgEl    = document.getElementById('alertModalMessage')
  const closeBtn = document.getElementById('alertModalCloseBtn')

  icon.className   = `alert-modal-icon ${type}`
  iconEl.className = type === 'error'   ? 'fa-solid fa-circle-xmark'
                   : type === 'warning' ? 'fa-solid fa-triangle-exclamation'
                   : 'fa-solid fa-circle-check'

  titleEl.textContent = title
  msgEl.textContent   = message
  closeBtn.className  = `alert-modal-close-btn ${type}`
  overlay.classList.add('open')
}

function closeAlert() {
  document.getElementById('alertModalOverlay').classList.remove('open')
}

// ── Submit Confirm Modal ──────────────────────────────────────────────────────
let _pendingInserts = null

function showSubmitConfirm(inserts, itemSummary) {
  _pendingInserts = inserts
  document.getElementById('submitModalItemSummary').innerHTML = itemSummary
  document.getElementById('responsibilityCheck').checked = false
  document.getElementById('submitModalConfirmBtn').disabled = true
  document.getElementById('submitModalOverlay').classList.add('open')
}

function closeSubmitModal() {
  document.getElementById('submitModalOverlay').classList.remove('open')
  _pendingInserts = null
}

async function confirmSubmit() {
  if (!_pendingInserts) return

  const confirmBtn = document.getElementById('submitModalConfirmBtn')
  confirmBtn.disabled    = true
  confirmBtn.textContent = 'Submitting...'

  const { error } = await client.from('studentrequests').insert(_pendingInserts)

  confirmBtn.disabled    = false
  confirmBtn.textContent = 'Submit Request'

  if (error) {
    closeSubmitModal()
    showAlert({ type: 'error', title: 'Submission Failed', message: 'Failed to submit: ' + error.message })
    return
  }

  closeSubmitModal()
  showAlert({ type: 'success', title: 'Request Submitted', message: 'Your request has been submitted and is now pending approval.' })
  document.getElementById('requestForm').reset()
  initItemRows()
  loadMyRequests()
}

// ── Form Submit ───────────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault()

  const purpose    = document.getElementById('purpose').value.trim()
  const dateNeeded = document.getElementById('dateNeeded').value
  const duration   = document.getElementById('duration').value
  const notes      = document.getElementById('notes').value.trim()

  const itemEntries = document.querySelectorAll('.item-entry')
  const items = []
  let valid = true

  itemEntries.forEach(row => {
    const sel = row.querySelector('.item-select')
    const qty = row.querySelector('.item-qty')

    if (!sel.value) {
      valid = false
      sel.style.borderColor = '#ef4444'
      return
    }
    sel.style.borderColor = ''

    const requestedQty = parseInt(qty.value) || 1
    const maxQty = getMaxQty(sel.value)
    if (requestedQty > maxQty) {
      valid = false
      qty.style.borderColor = '#ef4444'
      showAlert({
        type: 'warning',
        title: 'Quantity Exceeded',
        message: `${sel.value} only has ${maxQty} available. Please reduce the quantity.`
      })
      return
    }
    qty.style.borderColor = ''
    items.push({ name: sel.value, qty: requestedQty })
  })

  if (!valid) return

  const itemNames = items.map(i => i.name)
  const hasDuplicates = itemNames.some((name, idx) => itemNames.indexOf(name) !== idx)
  if (hasDuplicates) {
    showAlert({
      type: 'warning',
      title: 'Duplicate Items',
      message: 'You have selected the same item more than once. Please combine them into a single row.'
    })
    return
  }

  const inserts = items.map(item => ({
    student_id:     studentId,
    student_name:   studentName,
    year_level:     yearLevel,
    item_requested: item.name,
    quantity:       item.qty,
    reason:         purpose + (notes ? ' — ' + notes : ''),
    date_needed:    dateNeeded,
    duration:       duration + ' day(s)',
    status:         'Pending'
  }))

  const itemSummary = items.map(item =>
    `<div class="submit-modal-item">
      <i class="fa-solid fa-box"></i>
      <span>${item.name}</span>
      <strong>×${item.qty}</strong>
    </div>`
  ).join('')

  showSubmitConfirm(inserts, itemSummary)
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  fillStudentInfo()
  await loadEquipmentOptions()
  initItemRows()
  loadMyRequests()

  const form = document.getElementById('requestForm')
  if (form) form.addEventListener('submit', handleSubmit)

  document.getElementById('btn-add-item').addEventListener('click', () => {
    document.getElementById('items-container').appendChild(createItemRow())
    updateRemoveButtons()
  })

  document.getElementById('responsibilityCheck').addEventListener('change', function () {
    document.getElementById('submitModalConfirmBtn').disabled = !this.checked
  })

  document.getElementById('submitModalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('submitModalOverlay')) closeSubmitModal()
  })

  document.getElementById('submitModalCancelBtn').addEventListener('click', closeSubmitModal)
  document.getElementById('submitModalConfirmBtn').addEventListener('click', confirmSubmit)
  document.getElementById('alertModalCloseBtn').addEventListener('click', closeAlert)
  document.getElementById('alertModalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('alertModalOverlay')) closeAlert()
  })
})