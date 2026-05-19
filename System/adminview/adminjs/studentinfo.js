document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const historyModalEl = document.createElement('div')
  historyModalEl.id = 'historyModal'
  historyModalEl.innerHTML = `
    <div class="history-overlay" id="historyOverlay">
      <div class="history-card">
        <div class="history-header">
          <div>
            <h3 id="historyStudentName">—</h3>
            <p id="historyStudentMeta" style="font-size:13px;color:#64748b;margin-top:2px;"></p>
          </div>
          <button class="history-close-btn" id="historyClose">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="history-stats" id="historyStats"></div>
        <h4 style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:12px;">Borrow History</h4>
        <div style="overflow-x:auto;">
          <table class="history-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Borrow Date</th>
                <th>Due Date</th>
                <th>Return Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="historyTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(historyModalEl)

  const style = document.createElement('style')
  style.textContent = `
    .history-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 3000;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .history-overlay.open { display: flex; }
    .history-card {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 780px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .history-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .history-header h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .history-close-btn {
      background: #f1f5f9;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 14px;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .history-close-btn:hover { background: #e2e8f0; }
    .history-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .history-stat {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
    }
    .history-stat span {
      display: block;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .history-stat strong {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      white-space: nowrap;
    }
    .history-table th {
      padding: 10px 14px;
      background: #f8fafc;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 2px solid #e2e8f0;
      text-align: left;
    }
    .history-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .history-table tr:hover td { background: #f8fafc; }
    .clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f0f4ff; }
body.dark-mode .clickable-row:hover td { background: #1a1a2e !important; }
body.dark-mode .history-table tr:hover td { background: #1a1a2e !important; }
body.dark-mode .history-card { background: #0f3460 !important; color: #e2e8f0 !important; }
body.dark-mode .history-header h3 { color: #e2e8f0 !important; }
body.dark-mode .history-header p { color: #a0aec0 !important; }
body.dark-mode .history-close-btn { background: #1a1a2e !important; color: #e2e8f0 !important; }
body.dark-mode .history-stat { background: #1a1a2e !important; border-color: #2d3748 !important; }
body.dark-mode .history-stat span { color: #a0aec0 !important; }
body.dark-mode .history-stat strong { color: #e2e8f0 !important; }
body.dark-mode .history-table th { background: #1a1a2e !important; color: #a0aec0 !important; border-color: #2d3748 !important; }
body.dark-mode .history-table td { color: #e2e8f0 !important; border-color: #1a1a2e !important; }
  `
  document.head.appendChild(style)

  const historyOverlay = document.getElementById('historyOverlay')
  document.getElementById('historyClose').addEventListener('click', () => historyOverlay.classList.remove('open'))
  historyOverlay.addEventListener('click', e => { if (e.target === historyOverlay) historyOverlay.classList.remove('open') })

  async function openHistory(studentId, studentName, yearLevel) {
    document.getElementById('historyStudentName').textContent = studentName
    document.getElementById('historyStudentMeta').textContent = `${studentId} · ${yearLevel}`
    document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#888;">Loading...</td></tr>'
    document.getElementById('historyStats').innerHTML = ''
    historyOverlay.classList.add('open')

    const { data, error } = await client
      .from('adminborrows')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#888;">Failed to load history.</td></tr>'
      return
    }

    // Stats
    const active = data.filter(r => r.status === 'Active').length
    const overdue = data.filter(r => r.status === 'Overdue').length
    const returned = data.filter(r => r.status === 'Returned').length

    document.getElementById('historyStats').innerHTML = `
      <div class="history-stat"><span>Active</span><strong>${active}</strong></div>
      <div class="history-stat"><span>Overdue</span><strong>${overdue}</strong></div>
      <div class="history-stat"><span>Returned</span><strong>${returned}</strong></div>
    `

    if (data.length === 0) {
      document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#888;">No borrow records found.</td></tr>'
      return
    }

    document.getElementById('historyTableBody').innerHTML = data.map(r => {
      const statusClass = r.status === 'Active' ? 'status-active'
        : r.status === 'Overdue' ? 'status-overdue'
          : 'status-returned'
      return `<tr>
        <td>${r.item_borrowed || '—'}</td>
        <td>${r.quantity}</td>
        <td>${r.borrow_date || '—'}</td>
        <td>${r.due_date || '—'}</td>
        <td>${r.return_date ? r.return_date.split('T')[0] : '—'}</td>
        <td><span class="status-badge ${statusClass}">${r.status}</span></td>
      </tr>`
    }).join('')
  }

  window.openHistory = openHistory

  const openBtn = document.getElementById('openBorrow')
  const modal = document.getElementById('newBorrowModal')
  const closeBtn = document.getElementById('closeNewBorrowModal')

  if (openBtn) openBtn.addEventListener('click', () => { loadAvailableItems(); modal.style.display = 'flex' })
  if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none')
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none' })

  const studentIdInput = document.getElementById('studentId')
  if (studentIdInput) {
    studentIdInput.addEventListener('blur', async () => {
      const id = studentIdInput.value.trim()
      if (!id) return
      const { data: student } = await client.from('students').select('student_name, year_level').eq('student_id', id).maybeSingle()
      document.getElementById('studentName').value = student?.student_name || ''
      document.getElementById('yearLevel').value = student?.year_level || ''
    })
  }

  async function loadAvailableItems() {
    const { data } = await client.from('admininventory').select('item_name, quantity').eq('status', 'Available').gt('quantity', 0)
    const select = document.getElementById('itemBorrowed')
    select.innerHTML = '<option value="">Select Item</option>'
    if (!data || data.length === 0) { select.innerHTML = '<option value="">No items available</option>'; return }
    data.forEach(item => { select.innerHTML += `<option value="${item.item_name}">${item.item_name} (${item.quantity} available)</option>` })
  }

  async function loadStats() {
    const activeEl = document.querySelector('.student-cards .student-value')
    const overdueEl = document.querySelectorAll('.student-card .student-value')[0]
    const returnedEl = document.querySelectorAll('.student-card .student-value')[1]

    if (activeEl) activeEl.textContent = '—'
    if (overdueEl) overdueEl.textContent = '—'
    if (returnedEl) returnedEl.textContent = '—'

    const { count: activeCount } = await client.from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Active')
    const { count: overdueCount } = await client.from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Overdue')
    const { count: returnedCount } = await client.from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Returned')

    if (activeEl) activeEl.textContent = activeCount ?? 0
    if (overdueEl) overdueEl.textContent = overdueCount ?? 0
    if (returnedEl) returnedEl.textContent = returnedCount ?? 0
  }

  async function loadBorrows(search = '', yearLevel = '', status = '') {
    let query = client.from('adminborrows').select('*').order('created_at', { ascending: false })
    if (search) query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%,item_borrowed.ilike.%${search}%`)
    if (yearLevel && yearLevel !== 'All Statuses') query = query.eq('year_level', yearLevel)
    if (status && status !== 'All Statuses') query = query.eq('status', status)
    const { data, error } = await query
    if (error) { console.error(error); return }
    renderTable(data)
  }

  function renderTable(records) {
    const table = document.querySelector('.student-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()
    const tbody = document.createElement('tbody')

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;">No records found.</td></tr>`
    } else {
      records.forEach(r => {
        const statusClass = r.status === 'Active' ? 'status-active' : r.status === 'Overdue' ? 'status-overdue' : 'status-returned'
        const borrowDate = r.borrow_date ? r.borrow_date.split('T')[0] : '—'
        const dueDate = r.due_date ? r.due_date.split('T')[0] : '—'
        const safeId = (r.student_id || '').replace(/'/g, "\\'")
        const safeName = (r.student_name || '').replace(/'/g, "\\'")
        const safeYear = (r.year_level || '').replace(/'/g, "\\'")

        const isReturned = r.status === 'Returned'

        tbody.innerHTML += `
  <tr class="clickable-row" onclick="openHistory('${safeId}', '${safeName}', '${safeYear}')" data-id="${r.id}">
    <td>${r.student_id || '—'}</td>
    <td>${r.student_name}</td>
    <td>${r.year_level || '—'}</td>
    <td>${r.item_borrowed || '—'}</td>
    <td>${r.quantity}</td>
    <td>${borrowDate}</td>
    <td>${dueDate}</td>
    <td><span class="status-badge ${statusClass}">${r.status}</span></td>
    <td onclick="event.stopPropagation()">
      <button class="return-btn" 
        ${isReturned ? 'disabled' : `onclick="markReturned(${r.id}, '${r.item_borrowed}', ${r.quantity})"`}
        title="${isReturned ? 'Already returned' : 'Mark as Returned'}">
        <i class="fa-solid fa-rotate-left"></i> Return
      </button>
    </td>
  </tr>`
      })
    }
    table.appendChild(tbody)
  }

  const newBorrowForm = document.getElementById('newBorrowForm')
  if (newBorrowForm) {
    newBorrowForm.addEventListener('submit', async e => {
      e.preventDefault()
      const studentId = document.getElementById('studentId').value.trim()
      const studentName = document.getElementById('studentName').value.trim()
      const yearLevel = document.getElementById('yearLevel').value
      const itemBorrowed = document.getElementById('itemBorrowed').value.trim()
      const quantity = parseInt(document.getElementById('quantity').value)
      const borrowDate = document.getElementById('borrowDate').value
      const dueDate = document.getElementById('dueDate').value

      const { data: studentExists } = await client.from('students').select('id').eq('student_id', studentId).maybeSingle()
      if (!studentExists) { alert(`Student ID "${studentId}" does not exist.`); return }

      const { data: inventoryItem } = await client.from('admininventory').select('id, quantity, status').ilike('item_name', itemBorrowed).single()
      if (!inventoryItem) { alert('Item not found in inventory!'); return }
      if (inventoryItem.status !== 'Available') { alert('This item is not available!'); return }
      if (quantity > inventoryItem.quantity) { alert(`Only ${inventoryItem.quantity} available.`); return }

      const newQty = inventoryItem.quantity - quantity
      const newStatus = newQty === 0 ? 'Borrowed' : 'Available'

      await client.from('admininventory').update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() }).eq('id', inventoryItem.id)

      const { error } = await client.from('adminborrows').insert([{
        student_id: studentId, student_name: studentName, year_level: yearLevel,
        item_borrowed: itemBorrowed, quantity, borrow_date: borrowDate, due_date: dueDate, status: 'Active'
      }])

      if (error) { alert('Failed to save: ' + error.message); return }

      newBorrowForm.reset()
      modal.style.display = 'none'
      loadBorrows(); loadStats()
    })
  }

  function showArchiveModal({ onConfirm, onCancel }) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
  `;

    overlay.innerHTML = `
    <div style="background: #fff; border-radius: 12px; padding: 1.5rem; width: 340px; max-width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.18);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e8eafd; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3d3dc4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14L4 9l5-5"/>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
        </svg>
        </div>
        <span style="font-size: 17px; font-weight: 500;">Mark as returned</span>
      </div>
      <p style="font-size: 14px; color: #666; margin: 0 0 1.25rem; line-height: 1.6;">
        Mark this item as returned?
      </p>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="modal-cancel" style="padding: 8px 20px; font-size: 14px; border-radius: 8px; border: 1px solid #ddd; background: #f5f5f5; cursor: pointer;">Cancel</button>
        <button id="modal-confirm" style="padding: 8px 20px; font-size: 14px; border-radius: 8px; background: #3d3dc4; color: #fff; border: none; cursor: pointer; font-weight: 500;">Mark as returned</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    const cleanup = () => document.body.removeChild(overlay);

    overlay.querySelector('#modal-cancel').onclick = () => { cleanup(); onCancel?.(); };
    overlay.querySelector('#modal-confirm').onclick = () => { cleanup(); onConfirm(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); onCancel?.(); } });
  }

  window.markReturned = (id, itemBorrowed, quantity) => {
    showArchiveModal({
      onConfirm: async () => {
        const { data: inv } = await client.from('admininventory')
          .select('id, quantity')
          .ilike('item_name', itemBorrowed)
          .single();

        if (inv) {
          await client.from('admininventory').update({
            quantity: inv.quantity + quantity,
            status: 'Available',
            updated_at: new Date().toISOString()
          }).eq('id', inv.id);
        }

        const { error } = await client.from('adminborrows').update({
          status: 'Returned',
          return_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) { alert('Failed: ' + error.message); return; }

        loadBorrows();
        loadStats();
      }
    });
  };

  const searchInput = document.querySelector('.search-input')
  const levelFilter = document.querySelector('.level-filter')
  const statusFilter = document.querySelector('.status-filter')

  if (searchInput) searchInput.addEventListener('input', () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))
  if (levelFilter) levelFilter.addEventListener('change', () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))
  if (statusFilter) statusFilter.addEventListener('change', () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))

  async function checkOverdue() {
    const today = new Date().toISOString().split('T')[0]
    await client.from('adminborrows').update({ status: 'Overdue', updated_at: new Date().toISOString() }).eq('status', 'Active').lt('due_date', today)
  }

  checkOverdue().then(() => { loadBorrows(); loadStats() })
})