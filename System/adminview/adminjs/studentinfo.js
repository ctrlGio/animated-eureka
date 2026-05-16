import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://pxqacjetfbqwwacifahv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const openBtn  = document.getElementById('openBorrow')
const modal    = document.getElementById('newBorrowModal')
const closeBtn = document.getElementById('closeNewBorrowModal')

openBtn.addEventListener('click',  () => modal.style.display = 'flex')
closeBtn.addEventListener('click', () => modal.style.display = 'none')
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none'
})


async function loadStats() {
  const { count: activeCount } = await supabase
    .from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Active')

  const { count: overdueCount } = await supabase
    .from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Overdue')

  const { count: returnedCount } = await supabase
    .from('adminborrows').select('*', { count: 'exact', head: true }).eq('status', 'Returned')

  document.querySelector('.student-cards .student-value').textContent     = activeCount   || 0
  document.querySelectorAll('.student-card .student-value')[0].textContent = overdueCount  || 0
  document.querySelectorAll('.student-card .student-value')[1].textContent = returnedCount || 0
}


async function loadBorrows(search = '', yearLevel = '', status = '') {
  let query = supabase
    .from('adminborrows')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%,item_borrowed.ilike.%${search}%`)
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
      const statusClass = r.status === 'Active'   ? 'status-active'
                        : r.status === 'Overdue'  ? 'status-overdue'
                        : 'status-returned'

      const borrowDate = r.borrow_date ? r.borrow_date.split('T')[0] : '—'
      const dueDate    = r.due_date    ? r.due_date.split('T')[0]    : '—'

      tbody.innerHTML += `
        <tr data-id="${r.id}">
          <td>${r.student_id || '—'}</td>
          <td>${r.student_name}</td>
          <td>${r.year_level || '—'}</td>
          <td>${r.item_borrowed || '—'}</td>
          <td>${r.quantity}</td>
          <td>${borrowDate}</td>
          <td>${dueDate}</td>
          <td><span class="status-badge ${statusClass}">${r.status}</span></td>
          <td>
            <button class="return-btn" onclick="markReturned(${r.id})" title="Mark as Returned">
              <i class="fa-solid fa-rotate-left"></i>
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

newBorrowForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const studentId    = document.getElementById('studentId').value.trim()
  const studentName  = document.getElementById('studentName').value.trim()
  const yearLevel    = document.getElementById('yearLevel').value
  const itemBorrowed = document.getElementById('itemBorrowed').value.trim()
  const quantity     = parseInt(document.getElementById('quantity').value)
  const borrowDate   = document.getElementById('borrowDate').value
  const dueDate      = document.getElementById('dueDate').value

  const { error } = await supabase.from('adminborrows').insert([{
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


window.markReturned = async (id) => {
  if (!confirm('Mark this item as returned?')) return

  const { error } = await supabase
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

  const { error } = await supabase.from('adminborrows').delete().eq('id', id)
  if (error) { alert('Failed to delete: ' + error.message); return }

  loadBorrows()
  loadStats()
}


const searchInput  = document.querySelector('.search-input')
const levelFilter  = document.querySelector('.level-filter')
const statusFilter = document.querySelector('.status-filter')

searchInput.addEventListener('input',    () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))
levelFilter.addEventListener('change',   () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))
statusFilter.addEventListener('change',  () => loadBorrows(searchInput.value, levelFilter.value, statusFilter.value))

async function checkOverdue() {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
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