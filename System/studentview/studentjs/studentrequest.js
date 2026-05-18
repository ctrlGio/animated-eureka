const { createClient } = supabase
const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const studentId   = localStorage.getItem('studentId')   || '—'
const studentName = localStorage.getItem('username')     || '—'
const yearLevel   = localStorage.getItem('yearLevel')    || '—'

function fillStudentInfo() {
  const idEl   = document.getElementById('info-student-id')
  const nameEl = document.getElementById('info-student-name')
  const yrEl   = document.getElementById('info-year-level')
  if (idEl)   idEl.textContent   = studentId
  if (nameEl) nameEl.textContent = studentName
  if (yrEl)   yrEl.textContent   = yearLevel
}

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

function buildOptions(selectedName = '') {
  const list = window._equipmentList || []
  return '<option value="">Select equipment...</option>' +
    list.map(item =>
      '<option value="' + item.item_name + '" ' + (item.item_name === selectedName ? 'selected' : '') + ' data-max="' + item.quantity + '">' +
        item.item_name + ' (' + item.quantity + ' available)' +
      '</option>'
    ).join('')
}

function populateAllSelects() {
  document.querySelectorAll('.item-select').forEach(sel => {
    const current = sel.value
    sel.innerHTML = buildOptions(current)
  })
}

function getMaxQty(itemName) {
  const list = window._equipmentList || []
  const found = list.find(i => i.item_name === itemName)
  return found ? found.quantity : 1
}

let itemRowCount = 1

function createItemRow(preselectedName) {
  preselectedName = preselectedName || ''
  const row = document.createElement('div')
  row.className = 'form-row items-row item-entry'
  const initialMax = preselectedName ? getMaxQty(preselectedName) : 1

  row.innerHTML =
    '<div class="form-group flex-grow">' +
      '<select class="item-select" required>' +
        buildOptions(preselectedName) +
      '</select>' +
    '</div>' +
    '<div class="form-group qty-box">' +
      '<input type="number" class="item-qty" value="1" min="1" max="' + initialMax + '" required>' +
    '</div>' +
    '<button type="button" class="btn-remove-item" title="Remove">' +
      '<i class="fa-solid fa-xmark"></i>' +
    '</button>'

  const sel = row.querySelector('.item-select')
  const qty = row.querySelector('.item-qty')

  sel.addEventListener('change', function() {
    const max = getMaxQty(sel.value)
    qty.max = max
    if (parseInt(qty.value) > max) qty.value = max
  })

  row.querySelector('.btn-remove-item').addEventListener('click', function() {
    row.remove()
    itemRowCount--
    updateRemoveButtons()
  })

  return row
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.item-entry')
  rows.forEach(function(row) {
    const btn = row.querySelector('.btn-remove-item')
    if (btn) btn.style.visibility = rows.length > 1 ? 'visible' : 'hidden'
  })
}

function initItemRows() {
  const itemsContainer = document.getElementById('items-container')
  itemsContainer.innerHTML = ''

  const preselected = sessionStorage.getItem('preselectedItem') || ''
  sessionStorage.removeItem('preselectedItem')

  const firstRow = createItemRow(preselected)
  itemsContainer.appendChild(firstRow)
  updateRemoveButtons()

  document.getElementById('btn-add-item').addEventListener('click', function() {
    itemRowCount++
    const newRow = createItemRow()
    itemsContainer.appendChild(newRow)
    updateRemoveButtons()
  })
}

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
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">No requests yet.</td></tr>'
    return
  }

  tbody.innerHTML = data.map(function(r) {
    return '<tr>' +
      '<td>' + r.item_requested + '</td>' +
      '<td>' + r.quantity + '</td>' +
      '<td>' + (r.reason || '—') + '</td>' +
      '<td><span class="status-badge status-' + r.status.toLowerCase() + '">' + r.status + '</span></td>' +
      '<td>' + (r.created_at ? r.created_at.split('T')[0] : '—') + '</td>' +
    '</tr>'
  }).join('')
}

async function handleSubmit(e) {
  e.preventDefault()

  const purpose    = document.getElementById('purpose').value.trim()
  const dateNeeded = document.getElementById('dateNeeded').value
  const duration   = document.getElementById('duration').value
  const notes      = document.getElementById('notes').value.trim()

  const itemEntries = document.querySelectorAll('.item-entry')
  const items = []
  let valid = true

  itemEntries.forEach(function(row) {
    const sel = row.querySelector('.item-select')
    const qty = row.querySelector('.item-qty')
    if (!sel.value) { valid = false; sel.style.borderColor = '#ef4444'; return }
    sel.style.borderColor = ''

    const requestedQty = parseInt(qty.value) || 1
    const maxQty = getMaxQty(sel.value)
    if (requestedQty > maxQty) {
      valid = false
      qty.style.borderColor = '#ef4444'
      alert(sel.value + ' only has ' + maxQty + ' available. Please reduce the quantity.')
      return
    }
    qty.style.borderColor = ''
    items.push({ name: sel.value, qty: requestedQty })
  })

  if (!valid) return

  const submitBtn = document.getElementById('btn-submit')
  submitBtn.disabled = true
  submitBtn.textContent = 'Submitting...'

  const inserts = items.map(function(item) {
    return {
      student_id:     studentId,
      student_name:   studentName,
      year_level:     yearLevel,
      item_requested: item.name,
      quantity:       item.qty,
      reason:         purpose + (notes ? ' — ' + notes : '') + ' | Date needed: ' + dateNeeded + ' | Duration: ' + duration + ' day(s)',
      status:         'Pending'
    }
  })

  const { error } = await client.from('studentrequests').insert(inserts)

  submitBtn.disabled = false
  submitBtn.textContent = 'Submit Request'

  if (error) { alert('Failed to submit: ' + error.message); return }

  alert('Request submitted successfully!')
  document.getElementById('requestForm').reset()
  initItemRows()
  loadMyRequests()
}

document.addEventListener('DOMContentLoaded', async function() {
  fillStudentInfo()
  await loadEquipmentOptions()
  initItemRows()
  loadMyRequests()

  const form = document.getElementById('requestForm')
  if (form) form.addEventListener('submit', handleSubmit)
})