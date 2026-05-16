import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://pxqacjetfbqwwacifahv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const openButton  = document.getElementById('openButton')
const container   = document.getElementById('addButton')
const closeButton = document.getElementById('closeButton')

openButton.addEventListener('click',  () => container.classList.add('open'))
closeButton.addEventListener('click', () => container.classList.remove('open'))
window.addEventListener('click', (e) => {
  if (e.target === container) container.classList.remove('open')
})

async function loadInventory(search = '', category = '', status = '') {
  let query = supabase
    .from('admininventory')
    .select('*, admincategories(name)')
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('item_name', `%${search}%`)
  if (status && status !== 'All Statuses') query = query.eq('status', status)

  const { data, error } = await query
  if (error) { console.error('Error loading inventory:', error); return }


  let filtered = data
  if (category && category !== 'All Categories') {
    filtered = data.filter(item => item.admincategories?.name === category)
  }

  renderTable(filtered)
}

function renderTable(items) {
  const table   = document.querySelector('.inventory-table')
  const oldBody = table.querySelector('tbody')
  if (oldBody) oldBody.remove()

  const tbody = document.createElement('tbody')

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No items found.</td></tr>`
  } else {
    items.forEach(item => {
      const statusClass = item.status === 'Available'  ? 'status-available'
                        : item.status === 'Borrowed'   ? 'status-borrowed'
                        : 'status-maintenance'

      const categoryName = item.admincategories?.name || 'Unknown'

      tbody.innerHTML += `
        <tr data-id="${item.id}">
          <td>${item.item_name}</td>
          <td>${categoryName}</td>
          <td>${item.quantity}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>
            <button class="edit-btn" onclick="openEdit(${item.id})" title="Edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="delete-btn" onclick="deleteItem(${item.id})" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>`
    })
  }

  table.appendChild(tbody)
}

const addItemForm = document.getElementById('addItemForm')

addItemForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const itemName    = document.getElementById('itemName').value.trim()
  const categoryVal = document.getElementById('category').value
  const quantity    = parseInt(document.getElementById('quantity').value)
  const statusVal   = document.getElementById('status').value

  const categoryMap = {
    'kitchen-equipmet':   'Kitchen Equipment',
    'kitchen-tools':      'Kitchen Tools',
    'beverage-equipment': 'Beverage Equipment',
    'tableware':          'Tableware',
    'furniture':          'Furniture',
    'linen':              'Linen',
    'software':           'Software',
    'books':              'Books'
  }
  const statusMap = {
    'available':   'Available',
    'borrowed':    'Borrowed',
    'maintenance': 'Maintenance'
  }

  const categoryName = categoryMap[categoryVal] || categoryVal

  const { data: catData, error: catError } = await supabase
    .from('admincategories')
    .select('id')
    .eq('name', categoryName)
    .single()

  if (catError) {
    console.error('Category not found:', catError)
    alert('Category not found. Make sure categories are inserted in the database.')
    return
  }

  const { error } = await supabase.from('admininventory').insert([{
    item_name:   itemName,
    category_id: catData.id,
    quantity,
    status:      statusMap[statusVal] || statusVal
  }])

  if (error) {
    console.error('Error adding item:', error)
    alert('Failed to add item: ' + error.message)
    return
  }

  addItemForm.reset()
  container.classList.remove('open')
  loadInventory()
})

window.deleteItem = async (id) => {
  if (!confirm('Are you sure you want to delete this item?')) return

  const { error } = await supabase.from('admininventory').delete().eq('id', id)
  if (error) { alert('Failed to delete: ' + error.message); return }

  loadInventory()
}


window.openEdit = async (id) => {
  const { data, error } = await supabase
    .from('admininventory')
    .select('*, admincategories(name)')
    .eq('id', id)
    .single()

  if (error) { console.error('Error fetching item:', error); return }

  const newName   = prompt('Item Name:', data.item_name)
  const newQty    = prompt('Quantity:', data.quantity)
  const newStatus = prompt('Status (Available / Borrowed / Maintenance):', data.status)

  if (newName === null && newQty === null && newStatus === null) return

  const { error: updateError } = await supabase
    .from('admininventory')
    .update({
      item_name:  newName   || data.item_name,
      quantity:   newQty    ? parseInt(newQty) : data.quantity,
      status:     newStatus || data.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) { alert('Failed to update: ' + updateError.message); return }

  loadInventory()
}


const searchInput    = document.querySelector('.search-input')
const categoryFilter = document.querySelector('.category-filter')
const statusFilter   = document.querySelector('.status-filter')

searchInput.addEventListener('input',     () => loadInventory(searchInput.value, categoryFilter.value, statusFilter.value))
categoryFilter.addEventListener('change', () => loadInventory(searchInput.value, categoryFilter.value, statusFilter.value))
statusFilter.addEventListener('change',   () => loadInventory(searchInput.value, categoryFilter.value, statusFilter.value))

loadInventory()