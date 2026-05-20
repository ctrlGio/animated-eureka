document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // ── Alert Modal ───────────────────────────────────────────────────────────
  function showAlert({ type = 'error', title, message, detail = null }) {
    const overlay  = document.getElementById('alertModalOverlay')
    const icon     = document.getElementById('alertModalIcon')
    const iconEl   = icon.querySelector('i')
    const titleEl  = document.getElementById('alertModalTitle')
    const msgEl    = document.getElementById('alertModalMessage')
    const detailEl = document.getElementById('alertModalDetail')
    const closeBtn = document.getElementById('alertModalCloseBtn')

    icon.className   = 'alert-modal-icon ' + type
    iconEl.className = type === 'error'   ? 'fa-solid fa-circle-xmark'
                     : type === 'warning' ? 'fa-solid fa-triangle-exclamation'
                     : 'fa-solid fa-circle-check'
    titleEl.textContent = title
    msgEl.textContent   = message
    closeBtn.className  = 'alert-modal-close-btn ' + type

    if (detail) { detailEl.innerHTML = detail; detailEl.classList.add('visible') }
    else        { detailEl.innerHTML = '';      detailEl.classList.remove('visible') }
    overlay.classList.add('open')
  }

  function closeAlert() { document.getElementById('alertModalOverlay').classList.remove('open') }
  document.getElementById('alertModalCloseBtn').addEventListener('click', closeAlert)
  document.getElementById('alertModalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('alertModalOverlay')) closeAlert()
  })

  // ── Confirm Modal ─────────────────────────────────────────────────────────
  function showConfirm({ type, title, subtitle, details, onConfirm }) {
    const overlay    = document.getElementById('reqConfirmOverlay')
    const icon       = document.getElementById('reqConfirmIcon')
    const iconEl     = document.getElementById('reqConfirmIconI')
    const titleEl    = document.getElementById('reqConfirmTitle')
    const subtitleEl = document.getElementById('reqConfirmSubtitle')
    const detailsEl  = document.getElementById('reqConfirmDetails')

    icon.className         = 'req-confirm-icon ' + type
    iconEl.className       = type === 'approve' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'
    titleEl.textContent    = title
    subtitleEl.textContent = subtitle
    detailsEl.innerHTML    = details || ''
    overlay.classList.add('open')

    const close = () => overlay.classList.remove('open')
    const oldYes    = document.getElementById('reqConfirmYes')
    const oldCancel = document.getElementById('reqConfirmCancel')
    const newYes    = oldYes.cloneNode(true)
    const newCancel = oldCancel.cloneNode(true)
    newYes.className = 'req-confirm-yes ' + type
    oldYes.parentNode.replaceChild(newYes, oldYes)
    oldCancel.parentNode.replaceChild(newCancel, oldCancel)

    document.getElementById('reqConfirmYes').addEventListener('click', () => { close(); onConfirm() })
    document.getElementById('reqConfirmCancel').addEventListener('click', close)
    overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  async function loadStats() {
    const statuses = ['Pending Admin Approval', 'Approved', 'Rejected']
    const counts   = await Promise.all(statuses.map(s =>
      client.from('adminrequisition_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', s)
        .then(r => r.count || 0)
    ))
    const vals = document.querySelectorAll('.monitoring-value')
    if (vals[0]) vals[0].textContent = counts[0]
    if (vals[1]) vals[1].textContent = counts[1]
    if (vals[2]) vals[2].textContent = counts[2]
  }

  // ── Load & Filter ─────────────────────────────────────────────────────────
  let _allRequisitions = []

  async function loadRequisitions() {
    const { data, error } = await client
      .from('adminrequisition_forms')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('Error loading requisitions:', error); return }
    _allRequisitions = data
    applyFilters()
  }

  function applyFilters() {
    const statusVal  = document.getElementById('statusFilter').value
    const urgencyVal = document.getElementById('urgencyFilter').value
    const dateVal    = document.getElementById('dateFilter').value

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let filtered = _allRequisitions

    if (statusVal !== 'all')  filtered = filtered.filter(r => r.status === statusVal)
    if (urgencyVal !== 'all') filtered = filtered.filter(r => r.urgency === urgencyVal)

    if (dateVal === 'today') {
      filtered = filtered.filter(r => {
        const d = new Date(r.created_at); d.setHours(0,0,0,0)
        return d.getTime() === now.getTime()
      })
    } else if (dateVal === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      filtered = filtered.filter(r => new Date(r.created_at) >= weekAgo)
    } else if (dateVal === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1)
      filtered = filtered.filter(r => new Date(r.created_at) >= monthAgo)
    }

    renderTable(filtered)
  }

  document.getElementById('statusFilter').addEventListener('change', applyFilters)
  document.getElementById('urgencyFilter').addEventListener('change', applyFilters)
  document.getElementById('dateFilter').addEventListener('change', applyFilters)

  // ── Bulk action bar ───────────────────────────────────────────────────────
  function getSelectedIds() {
    return Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => parseInt(cb.value))
  }

  function updateBulkBar() {
    const selected = getSelectedIds()
    const bar      = document.getElementById('bulkActionBar')
    const count    = document.getElementById('bulkSelectedCount')
    if (selected.length > 0) {
      bar.classList.add('visible')
      count.textContent = selected.length + ' selected'
    } else {
      bar.classList.remove('visible')
    }

    // update select-all checkbox state
    const allBoxes = document.querySelectorAll('.row-checkbox')
    const selectAll = document.getElementById('selectAllCheckbox')
    if (selectAll) {
      selectAll.checked = allBoxes.length > 0 && selected.length === allBoxes.length
      selectAll.indeterminate = selected.length > 0 && selected.length < allBoxes.length
    }
  }

  // select all
  document.addEventListener('change', function(e) {
    if (e.target.id === 'selectAllCheckbox') {
      document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked)
      updateBulkBar()
    }
    if (e.target.classList.contains('row-checkbox')) {
      updateBulkBar()
    }
  })

  // bulk approve
  document.getElementById('bulkApproveBtn').addEventListener('click', () => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    const pendingReqs = _allRequisitions.filter(r => ids.includes(r.id) && r.status === 'Pending Admin Approval')
    if (pendingReqs.length === 0) { showAlert({ type: 'warning', title: 'No Pending Selected', message: '' }); return }

    showConfirm({
      type:     'approve',
      title:    'Bulk Approve',
      subtitle: 'Approve all selected pending requests?',
      details:  '<div class="req-detail-row"><span>Requests to approve</span><strong>' + pendingReqs.length + '</strong></div>' +
                pendingReqs.map(r => '<div class="req-detail-row"><span>' + r.requestor + '</span><strong>' + r.item_requested + ' ×' + r.quantity + '</strong></div>').join(''),
      onConfirm: () => doBulkApprove(pendingReqs)
    })
  })

  // bulk reject
  document.getElementById('bulkRejectBtn').addEventListener('click', () => {
    const ids = getSelectedIds()
    if (ids.length === 0) return
    const pendingReqs = _allRequisitions.filter(r => ids.includes(r.id) && r.status === 'Pending Admin Approval') 
    if (pendingReqs.length === 0) { showAlert({ type: 'warning', title: 'No Pending Selected', message: '' }); return } 
    //refix alert for when no pending requests

    showConfirm({
      type:     'reject',
      title:    'Bulk Reject',
      subtitle: 'Reject all selected pending requests?',
      details:  '<div class="req-detail-row"><span>Requests to reject</span><strong>' + pendingReqs.length + '</strong></div>' +
                pendingReqs.map(r => '<div class="req-detail-row"><span>' + r.requestor + '</span><strong>' + r.item_requested + ' ×' + r.quantity + '</strong></div>').join(''),
      onConfirm: () => doBulkReject(pendingReqs.map(r => r.id))
    })
  })

  // clear selection
  document.getElementById('bulkClearBtn').addEventListener('click', () => {
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false)
    const selectAll = document.getElementById('selectAllCheckbox')
    if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false }
    updateBulkBar()
  })

  async function doBulkApprove(reqs) {
    let successCount = 0
    let failCount    = 0

    for (const req of reqs) {
      // Check inventory
      const { data: inv } = await client.from('admininventory').select('id, quantity, status').ilike('item_name', req.item_requested).maybeSingle()
      if (!inv || inv.quantity < req.quantity) { failCount++; continue }

      // Deduct inventory
      const newQty    = inv.quantity - req.quantity
      const newStatus = newQty === 0 ? 'Borrowed' : 'Available'
      await client.from('admininventory').update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() }).eq('id', inv.id)

      // Approve
      await client.from('adminrequisition_forms').update({ status: 'Approved', updated_at: new Date().toISOString() }).eq('id', req.id)

      // Create borrow record
      const { data: student } = await client.from('students').select('student_id, year_level').ilike('student_name', req.requestor).maybeSingle()
      const borrowDate = req.date || new Date().toISOString().split('T')[0]
      const due = new Date(borrowDate); due.setDate(due.getDate() + 7)

      await client.from('adminborrows').insert([{
        student_id:    student ? student.student_id : 'N/A',
        student_name:  req.requestor,
        year_level:    student ? student.year_level : 'N/A',
        item_borrowed: req.item_requested,
        quantity:      req.quantity,
        borrow_date:   borrowDate,
        due_date:      due.toISOString().split('T')[0],
        status:        'Active'
      }])

      successCount++
    }

    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false)
    updateBulkBar()
    loadRequisitions(); loadStats()

    if (failCount > 0) {
      showAlert({ type: 'warning', title: 'Partial Success',
        message: successCount + ' approved, ' + failCount + ' skipped due to insufficient stock.' })
    }
  }

  async function doBulkReject(ids) {
    for (const id of ids) {
      await client.from('adminrequisition_forms').update({ status: 'Rejected', updated_at: new Date().toISOString() }).eq('id', id)
    }
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false)
    updateBulkBar()
    loadRequisitions(); loadStats()
  }

  // ── Render Table ──────────────────────────────────────────────────────────
  function renderTable(records) {
    const table   = document.querySelector('.requisition-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    // Update select-all in thead
    const thead = table.querySelector('thead tr')
    if (thead && !thead.querySelector('th.checkbox-col')) {
      thead.insertAdjacentHTML('afterbegin', '<th class="checkbox-col" style="width:40px;"><input type="checkbox" id="selectAllCheckbox"></th>')
    }

    const tbody = document.createElement('tbody')

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:#888;">No requisition forms found.</td></tr>'
    } else {
      records.forEach((r, index) => {
        const status = r.status || 'Pending Admin Approval'
        const statusClass = status === 'Approved' ? 'status-approved'
                          : status === 'Rejected' ? 'status-rejected'
                          : 'status-pending'

        const validUrgency = ['High', 'Medium', 'Low'].includes(r.urgency)
        const urgencyClass = r.urgency === 'High' ? 'urgency-high' : r.urgency === 'Medium' ? 'urgency-medium' : 'urgency-low'
        const urgencyHtml  = validUrgency
          ? '<span class="urgency-badge ' + urgencyClass + '">' + r.urgency + '</span>'
          : '<span style="color:#888;">—</span>'

        const isPending = status === 'Pending Admin Approval'

        tbody.innerHTML +=
          '<tr data-id="' + r.id + '">' +
            '<td class="checkbox-col"><input type="checkbox" class="row-checkbox" value="' + r.id + '"></td>' +
            '<td>#' + (index + 1) + '</td>' +
            '<td>' + (r.requestor || '—') + '</td>' +
            '<td>' + (r.professor || '—') + '</td>' +
            '<td>' + (r.item_requested || '—') + '</td>' +
            '<td>' + (r.quantity ?? '—') + '</td>' +
            '<td>' + (r.date || '—') + '</td>' +
            '<td>' + urgencyHtml + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>' +
            '<td><div class="actions-cell">' +
              '<button class="approve-btn" onclick="approveRequisition(' + r.id + ')" title="Approve"' + (!isPending ? ' disabled' : '') + '><i class="fa-solid fa-check"></i></button>' +
              '<button class="reject-btn"  onclick="rejectRequisition(' + r.id + ')"  title="Reject"'  + (!isPending ? ' disabled' : '') + '><i class="fa-solid fa-xmark"></i></button>' +
            '</div></td>' +
          '</tr>'
      })
    }
    table.appendChild(tbody)
    updateBulkBar()
  }

  // ── Single Approve ────────────────────────────────────────────────────────
  window.approveRequisition = async (id) => {
    const { data: req } = await client.from('adminrequisition_forms').select('*').eq('id', id).maybeSingle()
    if (!req) { showAlert({ type: 'error', title: 'Not Found', message: 'Could not load requisition details.' }); return }

    showConfirm({
      type:     'approve',
      title:    'Approve Requisition',
      subtitle: 'Are you sure you want to approve this request?',
      details:
        '<div class="req-detail-row"><span>Requestor</span><strong>'   + req.requestor     + '</strong></div>' +
        '<div class="req-detail-row"><span>Professor</span><strong>'   + (req.professor || '—') + '</strong></div>' +
        '<div class="req-detail-row"><span>Item</span><strong>'        + req.item_requested + '</strong></div>' +
        '<div class="req-detail-row"><span>Quantity</span><strong>'    + req.quantity       + '</strong></div>' +
        '<div class="req-detail-row"><span>Date Needed</span><strong>' + (req.date || '—') + '</strong></div>',
      onConfirm: () => doApprove(id, req)
    })
  }

  async function doApprove(id, req) {
    const { data: inv, error: invErr } = await client.from('admininventory').select('id, quantity, status').ilike('item_name', req.item_requested).maybeSingle()
    if (invErr || !inv) { showAlert({ type: 'error', title: 'Item Not Found', message: 'Item not in inventory.', detail: '<strong>Item:</strong> ' + req.item_requested }); return }
    if (inv.quantity < req.quantity) { showAlert({ type: 'warning', title: 'Insufficient Stock', message: 'Not enough stock.', detail: '<strong>Available:</strong> ' + inv.quantity + '<br><strong>Requested:</strong> ' + req.quantity }); return }

    const newQty = inv.quantity - req.quantity
    await client.from('admininventory').update({ quantity: newQty, status: newQty === 0 ? 'Borrowed' : 'Available', updated_at: new Date().toISOString() }).eq('id', inv.id)

    const { error: approveErr } = await client.from('adminrequisition_forms').update({ status: 'Approved', updated_at: new Date().toISOString() }).eq('id', id)
    if (approveErr) { showAlert({ type: 'error', title: 'Approval Failed', message: 'Could not update status.', detail: '<strong>Error:</strong> ' + approveErr.message }); return }

    const { data: student } = await client.from('students').select('student_id, year_level').ilike('student_name', req.requestor).maybeSingle()
    const borrowDate = req.date || new Date().toISOString().split('T')[0]
    const due = new Date(borrowDate); due.setDate(due.getDate() + 7)

    const { error: borrowErr } = await client.from('adminborrows').insert([{
      student_id: student ? student.student_id : 'N/A', student_name: req.requestor,
      year_level: student ? student.year_level : 'N/A', item_borrowed: req.item_requested,
      quantity: req.quantity, borrow_date: borrowDate, due_date: due.toISOString().split('T')[0], status: 'Active'
    }])
    if (borrowErr) { showAlert({ type: 'warning', title: 'Borrow Record Failed', message: 'Approved but borrow record failed.', detail: '<strong>Error:</strong> ' + borrowErr.message }) }

    loadRequisitions(); loadStats()
  }

  // ── Single Reject ─────────────────────────────────────────────────────────
  window.rejectRequisition = async (id) => {
    const { data: req } = await client.from('adminrequisition_forms').select('requestor, item_requested, quantity, professor').eq('id', id).maybeSingle()
    showConfirm({
      type:     'reject',
      title:    'Reject Requisition',
      subtitle: 'Are you sure you want to reject this request?',
      details: req
        ? '<div class="req-detail-row"><span>Requestor</span><strong>' + req.requestor + '</strong></div>' +
          '<div class="req-detail-row"><span>Professor</span><strong>' + (req.professor || '—') + '</strong></div>' +
          '<div class="req-detail-row"><span>Item</span><strong>' + req.item_requested + '</strong></div>' +
          '<div class="req-detail-row"><span>Quantity</span><strong>' + req.quantity + '</strong></div>'
        : '',
      onConfirm: () => doReject(id)
    })
  }

  async function doReject(id) {
    const { error } = await client.from('adminrequisition_forms').update({ status: 'Rejected', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showAlert({ type: 'error', title: 'Rejection Failed', message: 'Could not reject.', detail: '<strong>Error:</strong> ' + error.message }); return }
    loadRequisitions(); loadStats()
  }

  loadStats()
  loadRequisitions()
})