document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const openButton = document.getElementById('openButton')
  const container = document.getElementById('addButton')
  const closeButton = document.getElementById('closeButton')

  if (openButton) openButton.addEventListener('click', () => container.classList.add('open'))
  if (closeButton) closeButton.addEventListener('click', () => container.classList.remove('open'))
  window.addEventListener('click', (e) => {
    if (e.target === container) container.classList.remove('open')
    if (e.target === document.getElementById('editModal')) closeEditModal()
  })

  function openEditModal(item) {
    document.getElementById('editId').value = item.id
    document.getElementById('editItemName').value = item.item_name
    document.getElementById('editQuantity').value = item.quantity
    document.getElementById('editStatus').value = item.status
    document.getElementById('editModal').classList.add('open')
  }

  function closeEditModal() {
    document.getElementById('editModal').classList.remove('open')
  }

  document.getElementById('closeEditButton').addEventListener('click', closeEditModal)

  document.getElementById('editItemForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const id = document.getElementById('editId').value
    const itemName = document.getElementById('editItemName').value.trim()
    const quantity = parseInt(document.getElementById('editQuantity').value)
    let status = document.getElementById('editStatus').value

    if (quantity > 0 && status === 'Borrowed') {
      status = 'Available'
      document.getElementById('editStatus').value = 'Available'
    }

    if (quantity === 0) {
      status = 'Borrowed'
      document.getElementById('editStatus').value = 'Borrowed'
    }

    const { error } = await client
      .from('admininventory')
      .update({
        item_name: itemName,
        quantity,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) { alert('Failed to update: ' + error.message); return }

    closeEditModal()
    loadInventory()
  })

  async function loadInventory(search = '', category = '', status = '') {
    let query = client
      .from('admininventory')
      .select('*, admincategories(name)')
      .is('deleted_at', null)
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
    const table = document.querySelector('.inventory-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    const tbody = document.createElement('tbody')

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No items found.</td></tr>`
    } else {
      items.forEach(item => {
        const statusClass = item.status === 'Available' ? 'status-available'
          : item.status === 'Borrowed' ? 'status-borrowed'
            : 'status-maintenance'

        const categoryName = item.admincategories?.name || 'Unknown'

        tbody.innerHTML += `
          <tr data-id="${item.id}">
            <td>${item.item_name}</td>
            <td>${categoryName}</td>
            <td>${item.quantity}</td>
            <td><span class="status-badge ${statusClass}">${item.status}</span></td>
            <td>
              <button class="delete-btn" onclick="deleteItem(${item.id})" title="Move to Archive">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>`
      })
    }

    table.appendChild(tbody)
  }

  const addItemForm = document.getElementById('addItemForm')

  if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
      e.preventDefault()

      const itemName = document.getElementById('itemName').value.trim()
      const categoryVal = document.getElementById('category').value
      const quantity = parseInt(document.getElementById('quantity').value)

      const categoryMap = {
        'kitchen-equipmet': 'Kitchen Equipment',
        'kitchen-tools': 'Kitchen Tools',
        'beverage-equipment': 'Beverage Equipment',
        'tableware': 'Tableware',
        'furniture': 'Furniture',
        'linen': 'Linen',
        'utensils': 'Utensils',
        'mise-en-place-tools': 'Mise En Place Tools'
      }

      const categoryName = categoryMap[categoryVal] || categoryVal

      const { data: existing } = await client
        .from('admininventory')
        .select('id')
        .ilike('item_name', itemName)

      if (existing && existing.length > 0) {
        alert('Item already exists in the inventory!')
        return
      }

      const { data: catData, error: catError } = await client
        .from('admincategories')
        .select('id')
        .eq('name', categoryName)
        .single()

      if (catError) {
        alert('Category not found. Make sure categories are inserted in the database.')
        return
      }

      const { error: insertError } = await client.from('admininventory').insert([{
        item_name: itemName,
        category_id: catData.id,
        quantity,
        status: 'Available'
      }])

      if (insertError) { alert('Failed to add item: ' + insertError.message); return }

      addItemForm.reset()
      container.classList.remove('open')
      loadInventory()
    })
  }

  window.deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const { error } = await client
      .from('admininventory')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert('Failed to delete: ' + error.message)
      return
    }

    alert('Item successfully marked as deleted.')
    loadInventory()
  }

  window.openEdit = async (id) => {
    const { data, error } = await client
      .from('admininventory')
      .select('*, admincategories(name)')
      .eq('id', id)
      .single()

    if (error) { console.error('Error fetching item:', error); return }

    openEditModal(data)
  }

  const searchInput = document.querySelector('.search-input')
  const categoryFilter = document.querySelector('.category-filter')
  const statusFilter = document.querySelector('.status-filter')

  if (searchInput) searchInput.addEventListener('input', () => loadInventory(searchInput.value, categoryFilter.value, statusFilter.value))
  if (categoryFilter) categoryFilter.addEventListener('change', () => loadInventory(searchInput.value, categoryFilter.value, statusFilter.value))
  if (statusFilter) statusFilter.addEventListener('change', () => loadInventory(searchInput.value, categoryFilter.value, statusFilter.value))

  loadInventory()

})