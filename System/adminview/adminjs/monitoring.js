document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL     = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // ── State ─────────────────────────────────────────────────────────────────
  let _allRequisitions = []
  let _groups          = {}   // groupKey → { groupKey, requestor, professor, date, urgency, items[] }
  let _expandedGroups  = new Set()

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

  // ── Group Key ─────────────────────────────────────────────────────────────
  // Use group_id (set by instructor when forwarding) so each student submission
  // is always its own group, even if same requestor + professor + date.
  function makeGroupKey(row) {
    if (row.group_id) return row.group_id
    // Fallback for old rows that predate the group_id column
    return `${row.requestor}||${row.professor || ''}||${row.date || ''}`
  }

  // ── Build Groups ──────────────────────────────────────────────────────────
  function buildGroups(data) {
    _groups = {}
    data.forEach(r => {
      const key = makeGroupKey(r)
      if (!_groups[key]) {
        _groups[key] = {
          groupKey:  key,
          requestor: r.requestor,
          professor: r.professor,
          date:      r.date,
          urgency:   r.urgency,
          createdAt: r.created_at,
          items:     []
        }
      }
      _groups[key].items.push(r)
    })
  }

  // ── Group status helper ───────────────────────────────────────────────────
  function groupStatus(items) {
    const statuses = [...new Set(items.map(r => r.status))]
    if (statuses.length === 1) return statuses[0]
    if (statuses.includes('Pending Admin Approval')) return 'Pending Admin Approval'
    return statuses[0]
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
  async function loadRequisitions() {
    const { data, error } = await client
      .from('adminrequisition_forms')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('Error loading requisitions:', error); return }
    _allRequisitions = data
    buildGroups(data)
    applyFilters()
  }

  function applyFilters() {
    const statusVal  = document.getElementById('statusFilter').value
    const urgencyVal = document.getElementById('urgencyFilter').value
    const dateVal    = document.getElementById('dateFilter').value

    const now = new Date(); now.setHours(0, 0, 0, 0)

    let filteredGroups = Object.values(_groups)

    if (statusVal !== 'all') {
      filteredGroups = filteredGroups.filter(g => groupStatus(g.items) === statusVal)
    }
    if (urgencyVal !== 'all') {
      filteredGroups = filteredGroups.filter(g => g.urgency === urgencyVal)
    }
    if (dateVal === 'today') {
      filteredGroups = filteredGroups.filter(g => {
        const d = new Date(g.createdAt); d.setHours(0, 0, 0, 0)
        return d.getTime() === now.getTime()
      })
    } else if (dateVal === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      filteredGroups = filteredGroups.filter(g => new Date(g.createdAt) >= weekAgo)
    } else if (dateVal === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1)
      filteredGroups = filteredGroups.filter(g => new Date(g.createdAt) >= monthAgo)
    }

    renderTable(filteredGroups)
  }

  document.getElementById('statusFilter').addEventListener('change', applyFilters)
  document.getElementById('urgencyFilter').addEventListener('change', applyFilters)
  document.getElementById('dateFilter').addEventListener('change', applyFilters)

  // ── Toggle Detail Panel ───────────────────────────────────────────────────
  window.toggleGroupDetail = function (groupKey) {
    const detailRow  = document.getElementById('detail-row-' + groupKey.replace(/[^a-zA-Z0-9_-]/g, '_'))
    const summaryRow = document.querySelector(`tr.group-summary-row[data-group-key="${groupKey}"]`)
    const btn        = summaryRow?.querySelector('.btn-details-icon')
    if (!detailRow) return

    const isHidden = detailRow.classList.contains('hidden')
    if (isHidden) {
      _expandedGroups.add(groupKey)
      detailRow.classList.remove('hidden')
      summaryRow?.classList.add('expanded')
      if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>'; btn.title = 'Hide details' }
    } else {
      _expandedGroups.delete(groupKey)
      detailRow.classList.add('hidden')
      summaryRow?.classList.remove('expanded')
      if (btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fa-regular fa-file-lines"></i>'; btn.title = 'View details' }
    }
  }

  // ── Render Detail Panel ───────────────────────────────────────────────────
  function renderGroupDetailPanel(g, isPending) {
    const itemRows = g.items.map(item => {
      const statusClass = item.status === 'Approved' ? 'status-approved'
                        : item.status === 'Rejected' ? 'status-rejected'
                        : 'status-pending'
      return `
        <tr class="detail-item-row">
          <td>${item.item_requested || '—'}</td>
          <td>${item.quantity ?? '—'}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          ${isPending ? `<td class="detail-item-actions">
            <button class="detail-btn approve-item" onclick="approveSingleItem(${item.id})">
              <i class="fa-solid fa-check"></i> Approve
            </button>
            <button class="detail-btn reject-item" onclick="rejectSingleItem(${item.id})">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          </td>` : '<td></td>'}
        </tr>`
    }).join('')

    return `
      <div class="detail-panel">
        <div class="detail-panel-header">
          <div class="detail-meta">
            <span><i class="fa-solid fa-user"></i> ${g.requestor}</span>
            <span><i class="fa-solid fa-chalkboard-teacher"></i> Professor: ${g.professor || '—'}</span>
            <span><i class="fa-solid fa-calendar"></i> Date Needed: ${g.date || '—'}</span>
            <span><i class="fa-solid fa-triangle-exclamation"></i> Urgency: ${g.urgency || '—'}</span>
          </div>
        </div>
        <table class="detail-items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>`
  }

  // ── Render Table ──────────────────────────────────────────────────────────
  function renderTable(groups) {
    const table   = document.querySelector('.requisition-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    const thead = table.querySelector('thead tr')
    if (thead && !thead.querySelector('th.checkbox-col')) {
      thead.insertAdjacentHTML('afterbegin',
        '<th class="checkbox-col"><input type="checkbox" id="selectAllCheckbox"></th>')
    }

    const tbody = document.createElement('tbody')

    if (!groups || groups.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;color:#888;">No requisition forms found.</td></tr>'
      table.appendChild(tbody)
      updateBulkBar()
      return
    }

    const rows = []

    groups.forEach((g, index) => {
      const status      = groupStatus(g.items)
      const statusClass = status === 'Approved' ? 'status-approved'
                        : status === 'Rejected' ? 'status-rejected'
                        : 'status-pending'

      const validUrgency = ['High', 'Medium', 'Low'].includes(g.urgency)
      const urgencyClass = g.urgency === 'High' ? 'urgency-high' : g.urgency === 'Medium' ? 'urgency-medium' : 'urgency-low'
      const urgencyHtml  = validUrgency
        ? `<span class="urgency-badge ${urgencyClass}">${g.urgency}</span>`
        : '<span style="color:#888;">—</span>'

      const isPending  = status === 'Pending Admin Approval'
      const isSingle   = g.items.length === 1
      const safeKey    = g.groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')
      const isExpanded = _expandedGroups.has(g.groupKey)

      const itemSummary = isSingle
        ? `${g.items[0].item_requested} ×${g.items[0].quantity}`
        : `${g.items.length} items — ${g.items.map(i => i.item_requested).join(', ')}`

      rows.push(`
        <tr class="group-summary-row ${isExpanded ? 'expanded' : ''}" data-group-key="${g.groupKey}">
          <td class="checkbox-col">
            ${isPending ? `<input type="checkbox" class="row-checkbox" data-group-key="${g.groupKey}">` : ''}
          </td>
          <td>#${index + 1}${g.items.length > 1 ? `<span class="group-badge">+${g.items.length - 1}</span>` : ''}</td>
          <td>${g.requestor || '—'}</td>
          <td>${g.professor || '—'}</td>
          <td class="item-summary-cell">
            <span class="item-summary-text">${itemSummary}</span>
          </td>
          <td>${g.date || '—'}</td>
          <td>${urgencyHtml}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td class="details-col">
            <button class="btn-details-icon ${isExpanded ? 'active' : ''}"
                    onclick="toggleGroupDetail('${g.groupKey}')"
                    title="${isExpanded ? 'Hide details' : 'View details'}">
              <i class="${isExpanded ? 'fa-solid fa-chevron-up' : 'fa-regular fa-file-lines'}"></i>
            </button>
          </td>
          <td>
            <div class="actions-cell">
              ${isPending ? `
                <button class="approve-btn" onclick="approveGroup('${g.groupKey}')" title="Approve all"><i class="fa-solid fa-check"></i></button>
                <button class="reject-btn"  onclick="rejectGroup('${g.groupKey}')"  title="Reject all"><i class="fa-solid fa-xmark"></i></button>
              ` : `<span style="font-size:12px;color:#94a3b8;font-style:italic;">${status}</span>`}
            </div>
          </td>
        </tr>`)

      rows.push(`
        <tr class="group-detail-row ${isExpanded ? '' : 'hidden'}"
            data-group-key="${g.groupKey}" id="detail-row-${safeKey}">
          <td colspan="11" class="detail-panel-cell">
            ${renderGroupDetailPanel(g, isPending)}
          </td>
        </tr>`)
    })

    tbody.innerHTML = rows.join('')
    table.appendChild(tbody)

    document.querySelectorAll('.row-checkbox').forEach(cb =>
      cb.addEventListener('change', updateBulkBar))

    updateBulkBar()
  }

  // ── Bulk action bar ───────────────────────────────────────────────────────
  function getChecked() {
    return [...document.querySelectorAll('.row-checkbox:checked')]
  }

  function getSelectedGroups() {
    return getChecked().map(cb => _groups[cb.dataset.groupKey]).filter(Boolean)
  }

  function updateBulkBar() {
    const selected = getChecked()
    const bar      = document.getElementById('bulkActionBar')
    const count    = document.getElementById('bulkSelectedCount')
    if (selected.length > 0) {
      bar.classList.add('visible')
      count.textContent = selected.length + ' selected'
    } else {
      bar.classList.remove('visible')
    }

    const allBoxes  = document.querySelectorAll('.row-checkbox')
    const selectAll = document.getElementById('selectAllCheckbox')
    if (selectAll) {
      selectAll.checked       = allBoxes.length > 0 && selected.length === allBoxes.length
      selectAll.indeterminate = selected.length > 0 && selected.length < allBoxes.length
    }
  }

  function clearSelection() {
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false)
    const sa = document.getElementById('selectAllCheckbox')
    if (sa) { sa.checked = false; sa.indeterminate = false }
    document.getElementById('bulkActionBar').classList.remove('visible')
  }

  document.addEventListener('change', function (e) {
    if (e.target.id === 'selectAllCheckbox') {
      document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked)
      updateBulkBar()
    }
    if (e.target.classList.contains('row-checkbox')) updateBulkBar()
  })

  // Bulk approve
  document.getElementById('bulkApproveBtn').addEventListener('click', () => {
    const selected = getSelectedGroups()
    if (!selected.length) return

    const pendingGroups = selected.filter(g => groupStatus(g.items) === 'Pending Admin Approval')
    if (!pendingGroups.length) {
      showAlert({ type: 'warning', title: 'No Pending Selected', message: 'All selected requests are already actioned.' })
      return
    }

    showConfirm({
      type:     'approve',
      title:    `Bulk Approve (${pendingGroups.length} request${pendingGroups.length > 1 ? 's' : ''})`,
      subtitle: 'Approve all selected pending requests?',
      details:
        `<div class="req-detail-row"><span>Requests to approve</span><strong>${pendingGroups.length}</strong></div>` +
        pendingGroups.map(g =>
          `<div class="req-detail-row"><span>${g.requestor}</span><strong>${g.items.length} item(s)</strong></div>`
        ).join(''),
      onConfirm: () => doBulkApprove(pendingGroups)
    })
  })

  // Bulk reject
  document.getElementById('bulkRejectBtn').addEventListener('click', () => {
    const selected = getSelectedGroups()
    if (!selected.length) return

    const pendingGroups = selected.filter(g => groupStatus(g.items) === 'Pending Admin Approval')
    if (!pendingGroups.length) {
      showAlert({ type: 'warning', title: 'No Pending Selected', message: 'All selected requests are already actioned.' })
      return
    }

    showConfirm({
      type:     'reject',
      title:    `Bulk Reject (${pendingGroups.length} request${pendingGroups.length > 1 ? 's' : ''})`,
      subtitle: 'Reject all selected pending requests?',
      details:
        `<div class="req-detail-row"><span>Requests to reject</span><strong>${pendingGroups.length}</strong></div>` +
        pendingGroups.map(g =>
          `<div class="req-detail-row"><span>${g.requestor}</span><strong>${g.items.length} item(s)</strong></div>`
        ).join(''),
      onConfirm: () => doBulkReject(pendingGroups)
    })
  })

  document.getElementById('bulkClearBtn').addEventListener('click', clearSelection)

  // ── Approve a whole group ─────────────────────────────────────────────────
  window.approveGroup = async function (groupKey) {
    const g = _groups[groupKey]
    if (!g) return

    showConfirm({
      type:     'approve',
      title:    'Approve Request',
      subtitle: 'Approve all items in this request?',
      details:
        `<div class="req-detail-row"><span>Requestor</span><strong>${g.requestor}</strong></div>` +
        `<div class="req-detail-row"><span>Professor</span><strong>${g.professor || '—'}</strong></div>` +
        `<div class="req-detail-row"><span>Date Needed</span><strong>${g.date || '—'}</strong></div>` +
        g.items.map(i =>
          `<div class="req-detail-row"><span>${i.item_requested}</span><strong>×${i.quantity}</strong></div>`
        ).join(''),
      onConfirm: () => doApproveGroup(g)
    })
  }

  // ── Reject a whole group ──────────────────────────────────────────────────
  window.rejectGroup = async function (groupKey) {
    const g = _groups[groupKey]
    if (!g) return

    showConfirm({
      type:     'reject',
      title:    'Reject Request',
      subtitle: 'Reject all items in this request?',
      details:
        `<div class="req-detail-row"><span>Requestor</span><strong>${g.requestor}</strong></div>` +
        `<div class="req-detail-row"><span>Professor</span><strong>${g.professor || '—'}</strong></div>` +
        g.items.map(i =>
          `<div class="req-detail-row"><span>${i.item_requested}</span><strong>×${i.quantity}</strong></div>`
        ).join(''),
      onConfirm: () => doRejectGroup(g.items.map(i => i.id))
    })
  }

  // ── Approve a single item from the detail panel ───────────────────────────
  window.approveSingleItem = async function (id) {
    const row = _allRequisitions.find(r => r.id === id)
    if (!row) return

    showConfirm({
      type:     'approve',
      title:    'Approve Item',
      subtitle: 'Approve this individual item?',
      details:
        `<div class="req-detail-row"><span>Item</span><strong>${row.item_requested}</strong></div>` +
        `<div class="req-detail-row"><span>Quantity</span><strong>${row.quantity}</strong></div>`,
      onConfirm: () => doApproveItems([row])
    })
  }

  // ── Reject a single item from the detail panel ────────────────────────────
  window.rejectSingleItem = async function (id) {
    const row = _allRequisitions.find(r => r.id === id)
    if (!row) return

    showConfirm({
      type:     'reject',
      title:    'Reject Item',
      subtitle: 'Reject this individual item?',
      details:
        `<div class="req-detail-row"><span>Item</span><strong>${row.item_requested}</strong></div>` +
        `<div class="req-detail-row"><span>Quantity</span><strong>${row.quantity}</strong></div>`,
      onConfirm: () => doRejectItems([id])
    })
  }

  // ── Core approve logic ────────────────────────────────────────────────────
  // NOTE: Quantity is already deducted from inventory when the student submits
  // the request. So on approval we ONLY update the status and create the borrow
  // record — we do NOT deduct inventory again.
  async function doApproveItems(rows) {
    let successCount = 0
    let failCount    = 0

    for (const req of rows) {
      // Only act on items still pending
      if (req.status !== 'Pending Admin Approval') continue

      // Update requisition status to Approved
      const { error } = await client
        .from('adminrequisition_forms')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', req.id)

      if (error) { failCount++; continue }

      // Update inventory status only (quantity was already reduced on submit)
      const { data: inv } = await client
        .from('admininventory')
        .select('id, quantity')
        .ilike('item_name', req.item_requested)
        .maybeSingle()

      if (inv) {
        const newStatus = inv.quantity === 0 ? 'Borrowed' : 'Available'
        await client
          .from('admininventory')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', inv.id)
      }

      // Create borrow record
      const { data: student } = await client
        .from('students')
        .select('student_id, year_level')
        .ilike('student_name', req.requestor)
        .maybeSingle()

      const borrowDate = req.date || new Date().toISOString().split('T')[0]
      const due        = new Date(borrowDate)
      due.setDate(due.getDate() + 7)

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

    await loadRequisitions()
    await loadStats()

    if (failCount > 0) {
      showAlert({
        type:    'warning',
        title:   'Partial Success',
        message: `${successCount} approved, ${failCount} failed to update.`
      })
    }
  }

  async function doApproveGroup(g) {
    _expandedGroups.add(g.groupKey)
    await doApproveItems(g.items.filter(i => i.status === 'Pending Admin Approval'))
  }

  async function doBulkApprove(groups) {
    for (const g of groups) {
      _expandedGroups.add(g.groupKey)
      await doApproveItems(g.items.filter(i => i.status === 'Pending Admin Approval'))
    }
    clearSelection()
  }

  // ── Core reject logic ─────────────────────────────────────────────────────
  // On rejection we restore the quantity that was deducted on submission.
  async function doRejectItems(ids) {
    for (const id of ids) {
      const row = _allRequisitions.find(r => r.id === id)

      // Only act on items still pending
      if (!row || row.status !== 'Pending Admin Approval') continue

      // Update requisition status to Rejected
      await client
        .from('adminrequisition_forms')
        .update({ status: 'Rejected', updated_at: new Date().toISOString() })
        .eq('id', id)

      // Restore the quantity that was deducted when student submitted
      const { data: inv } = await client
        .from('admininventory')
        .select('id, quantity')
        .ilike('item_name', row.item_requested)
        .maybeSingle()

      if (inv) {
        const restoredQty = inv.quantity + row.quantity
        await client
          .from('admininventory')
          .update({
            quantity:   restoredQty,
            status:     'Available',
            updated_at: new Date().toISOString()
          })
          .eq('id', inv.id)
      }
    }

    await loadRequisitions()
    await loadStats()
  }

  async function doRejectGroup(ids) {
    await doRejectItems(ids)
  }

  async function doBulkReject(groups) {
    const ids = groups.flatMap(g => g.items.map(i => i.id))
    await doRejectItems(ids)
    clearSelection()
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  loadStats()
  loadRequisitions()
})