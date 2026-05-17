document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const openBtn  = document.getElementById('openBorrow')
  const modal    = document.getElementById('newBorrowModal')
  const closeBtn = document.getElementById('closeNewBorrowModal')

  if (openBtn)  openBtn.addEventListener('click', () => {
    loadAvailableItems()
    modal.style.display = 'flex'
  })
  if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none')
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none'
  })

  const studentIdInput = document.getElementById('studentId')
  if (studentIdInput) {
    studentIdInput.addEventListener('blur', async () => {
      const studentId = studentIdInput.value.trim()
      if (!studentId) return

      const { data: student } = await client
        .from('students')
        .select('student_name, year_level')
        .eq('student_id', studentId)
        .maybeSingle()

      if (student) {
        document.getElementById('studentName').value = student.student_name
        document.getElementById('yearLevel').value   = student.year_level
      } else {
        document.getElementById('studentName').value = ''
        document.getElementById('yearLevel').value   = ''
      }
    })
  }

  async function loadAvailableItems() {
    const { data, error } = await client
      .from('admininventory')
      .select('item_name, quantity')
      .eq('status', 'Available')
      .gt('quantity', 0)

    if (error) { console.error('Error loading items:', error); return }

    const select = document.getElementById('itemBorrowed')
    select.innerHTML = '<option value="">Select Item</option>'

    if (!data || data.length === 0) {
      select.innerHTML = '<option value="">No items available</option>'
      return
    }

    data.forEach(item => {
      select.innerHTML += `<option value="${item.item_name}">${item.item_name} (${item.quantity} available)</option>`
    })
  }

  async function loadStats() {
    const activeEl   = document.querySelector('.student-cards .student-value')
    const overdueEl  = document.querySelectorAll('.student-card .student-value')[0]
    const returnedEl = document.querySelectorAll('.student-card .student-value')[1]

    if (activeEl)   activeEl.textContent   = '—'
    if (overdueEl)  overdueEl.textContent  = '—'
    if (returnedEl) returnedEl.textContent = '—'

    const { count: activeCount } = await client
      .from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Active')

    const { count: overdueCount } = await client
      .from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Overdue')

    const { count: returnedCount } = await client
      .from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Returned')

    if (activeEl)   activeEl.textContent   = activeCount   ?? 0
    if (overdueEl)  overdueEl.textContent  = overdueCount  ?? 0
    if (returnedEl) returnedEl.textContent = returnedCount ?? 0
  }

  async function loadBorrows(search = '', yearLevel = '', status = '') {
    let query = client
      .from('adminborrows')
      .select('*')
      .order('created_at', { ascending: false })

    if (search)    query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%,item_borrowed.ilike.%${search}%`)
    if (yearLevel && yearLevel !== 'All Statuses') query = query.eq('year_level', yearLevel)
    if (status    && status    !== 'All Statuses') query = query.eq('status', status)

    const { data, error } = await query
    if (error) { console.error('Error loading borrows:', error); return }

    renderTable(data)
  }

  function renderTable(records) {
    const table   = document.querySelector('.student-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    const tbody = document.createElement('tbody')

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">No records found.</td></tr>`
    } else {
      records.forEach(r => {
        const statusClass = r.status === 'Active'  ? 'status-active'
                          : r.status === 'Overdue' ? 'status-overdue'
                          : 'status-returned'

        const borrowDate = r.borrow_date ? r.borrow_date.split('T')[0] : '—'
        const dueDate    = r.due_date    ? r.due_date.split('T')[0]    : '—'

        tbody.innerHTML += `
          <tr data-id="${r.id}">
            <td>${r.student_id    || '—'}</td>
            <td>${r.student_name}</td>
            <td>${r.year_level    || '—'}</td>
            <td>${r.item_borrowed || '—'}</td>
            <td>${r.quantity}</td>
            <td>${borrowDate}</td>
            <td>${dueDate}</td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
            <td>
              <button class="return-btn" onclick="markReturned(${r.id}, '${r.item_borrowed}', ${r.quantity})" title="Mark as Returned">
                <i class="fa-solid fa-rotate-left"></i> Return
              </button>
              <button class="delete-btn" onclick="deleteRecord(${r.id})" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>`
      })
    }

    table.appendChild(tbody)
  }

  const newBorrowForm = document.getElementById('newBorrowForm')

  if (newBorrowForm) {
    newBorrowForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      const studentId    = document.getElementById('studentId').value.trim()
      const studentName  = document.getElementById('studentName').value.trim()
      const yearLevel    = document.getElementById('yearLevel').value
      const itemBorrowed = document.getElementById('itemBorrowed').value.trim()
      const quantity     = parseInt(document.getElementById('quantity').value)
      const borrowDate   = document.getElementById('borrowDate').value
      const dueDate      = document.getElementById('dueDate').value

      const { data: studentExists } = await client
        .from('students')
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle()

      if (!studentExists) {
        alert(`Student ID "${studentId}" does not exist in the system. Please register the student first.`)
        return
      }

      const { data: inventoryItem, error: inventoryError } = await client
        .from('admininventory')
        .select('id, quantity, status')
        .ilike('item_name', itemBorrowed)
        .single()

      if (inventoryError || !inventoryItem) {
        alert('Item not found in inventory!')
        return
      }

      if (inventoryItem.status !== 'Available') {
        alert('This item is not available for borrowing!')
        return
      }

      if (quantity > inventoryItem.quantity) {
        alert(`Not enough stock! Only ${inventoryItem.quantity} available.`)
        return
      }

      const newQuantity = inventoryItem.quantity - quantity
      const newStatus   = newQuantity === 0 ? 'Borrowed' : 'Available'

      const { error: updateError } = await client
        .from('admininventory')
        .update({
          quantity:   newQuantity,
          status:     newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryItem.id)

      if (updateError) {
        alert('Failed to update inventory: ' + updateError.message)
        return
      }

      const { error } = await client.from('adminborrows').insert([{
        student_id:    studentId,
        student_name:  studentName,
        year_level:    yearLevel,
        item_borrowed: itemBorrowed,
        quantity,
        borrow_date:   borrowDate,
        due_date:      dueDate,
        status:        'Active'
      }])

      if (error) {
        console.error('Error saving borrow record:', error)
        alert('Failed to save record: ' + error.message)
        return
      }

      newBorrowForm.reset()
      modal.style.display = 'none'
      loadBorrows()
      loadStats()
    })
  }

  window.markReturned = async (id, itemBorrowed, quantity) => {
    if (!confirm('Mark this item as returned?')) return

    const { data: inventoryItem } = await client
      .from('admininventory')
      .select('id, quantity')
      .ilike('item_name', itemBorrowed)
      .single()

    if (inventoryItem) {
      const restoredQuantity = inventoryItem.quantity + quantity
      await client
        .from('admininventory')
        .update({
          quantity:   restoredQuantity,
          status:     'Available',
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryItem.id)
    }

    const { error } = await client
      .from('adminborrows')
      .update({
        status:      'Returned',
        return_date: new Date().toISOString(),
        updated_at:  new Date().toISOString()
      })
      .eq('id', id)

    if (error) { alert('Failed to update: ' + error.message); return }

    loadBorrows()
    loadStats()
  }

  window.deleteRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    const { error } = await client.from('adminborrows').delete().eq('id', id)
    if (error) { alert('Failed to delete: ' + error.message); return }

    loadBorrows()
    loadStats()
  }

  const searchInput  = document.querySelector('.search-input')
  const levelFilter  = document.querySelector('.level-filter')
  const statusFilter = document.querySelector('.status-filter')

  if (searchInput)  searchInput.addEventListener('input',   () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))
  if (levelFilter)  levelFilter.addEventListener('change',  () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))
  if (statusFilter) statusFilter.addEventListener('change', () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))

  async function checkOverdue() {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await client
      .from('adminborrows')
      .update({ status: 'Overdue', updated_at: new Date().toISOString() })
      .eq('status', 'Active')
      .lt('due_date', today)

    if (error) console.error('Error checking overdue:', error)
  }

  checkOverdue().then(() => {
    loadBorrows()
    loadStats()
  })

})