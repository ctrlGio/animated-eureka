document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  function showAlert({ type = 'error', title, message, detail = null }) {
  const overlay  = document.getElementById('alertModalOverlay')
  const icon     = document.getElementById('alertModalIcon')
  const iconEl   = icon.querySelector('i')
  const titleEl  = document.getElementById('alertModalTitle')
  const msgEl    = document.getElementById('alertModalMessage')
  const detailEl = document.getElementById('alertModalDetail')
  const closeBtn = document.getElementById('alertModalCloseBtn')

  icon.className   = `alert-modal-icon ${type}`
  iconEl.className = type === 'error'   ? 'fa-solid fa-circle-xmark'
                   : type === 'warning' ? 'fa-solid fa-triangle-exclamation'
                   : 'fa-solid fa-circle-check'

  titleEl.textContent = title
  msgEl.textContent   = message
  closeBtn.className  = `alert-modal-close-btn ${type}`

  if (detail) {
    detailEl.innerHTML = detail
    detailEl.classList.add('visible')
  } else {
    detailEl.innerHTML = ''
    detailEl.classList.remove('visible')
  }

  overlay.classList.add('open')
}

function closeAlert() {
  document.getElementById('alertModalOverlay').classList.remove('open')
}

function showConfirm({ type = 'delete', title, message, onConfirm }) {
  const overlay    = document.getElementById('confirmModalOverlay')
  const icon       = document.getElementById('confirmModalIcon')
  const iconEl     = icon.querySelector('i')
  const titleEl    = document.getElementById('confirmModalTitle')
  const msgEl      = document.getElementById('confirmModalMessage')
  const confirmBtn = document.getElementById('confirmModalConfirmBtn')
  const cancelBtn  = document.getElementById('confirmModalCancelBtn')

  icon.className   = `alert-modal-icon error`
  iconEl.className = 'fa-solid fa-box-archive'
  titleEl.textContent = title
  msgEl.textContent   = message
  confirmBtn.textContent = 'Move to Archive'
  confirmBtn.className   = 'alert-modal-close-btn error'

  overlay.classList.add('open')

  const newConfirmBtn = confirmBtn.cloneNode(true)
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn)
  const newCancelBtn = cancelBtn.cloneNode(true)
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn)

  newConfirmBtn.addEventListener('click', () => {
    overlay.classList.remove('open')
    onConfirm()
  })

  newCancelBtn.addEventListener('click', () => overlay.classList.remove('open'))
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open')
  }, { once: true })
}

document.getElementById('alertModalCloseBtn').addEventListener('click', closeAlert)
document.getElementById('alertModalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('alertModalOverlay')) closeAlert()
})

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

        const tr = document.createElement('tr')
        tr.dataset.id = item.id
        tr.innerHTML = `
          <td>${item.item_name}</td>
          <td>${categoryName}</td>
          <td>
            <div class="qty-display" id="qty-display-${item.id}">
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-edit-icon" onclick="startEditQty(${item.id}, ${item.quantity})" title="Edit quantity">
              <i class="fa-solid fa-pen"></i>
              </button>
              </div> 
            <div class="qty-edit" id="qty-edit-${item.id}" style="display:none;">
              <input type="number" class="qty-input" id="qty-input-${item.id}" value="${item.quantity}" min="0">
              <div class="qty-actions">
                <button class="qty-confirm-btn" onclick="saveQty(${item.id})" title="Save">
                  <i class="fa-solid fa-check"></i>
                </button>
                <button class="qty-cancel-btn" onclick="cancelEditQty(${item.id}, ${item.quantity})" title="Cancel">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          </td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>
            <button class="delete-btn" onclick="deleteItem(${item.id})" title="Move to Archive">
              <i class="fa-solid fa-box-archive"></i>
            </button>
          </td>
        `
        tbody.appendChild(tr)
      })
    }

    table.appendChild(tbody)
  }

  window.startEditQty = (id, currentQty) => {
    document.getElementById(`qty-display-${id}`).style.display = 'none'
    document.getElementById(`qty-edit-${id}`).style.display = 'flex'
    const input = document.getElementById(`qty-input-${id}`)
    input.value = currentQty
    input.focus()
  }

  window.cancelEditQty = (id, originalQty) => {
    document.getElementById(`qty-input-${id}`).value = originalQty
    document.getElementById(`qty-edit-${id}`).style.display = 'none'
    document.getElementById(`qty-display-${id}`).style.display = 'flex'
  }

  window.saveQty = async (id) => {
    const input = document.getElementById(`qty-input-${id}`)
    const newQty = parseInt(input.value)

    if (isNaN(newQty) || newQty < 0) {
      showAlert({ type: 'warning', title: 'Invalid Quantity', message: 'Please enter a valid quantity (0 or more).' })
      return
    }

    const newStatus = newQty === 0 ? 'Borrowed' : 'Available'

    const { error } = await client
      .from('admininventory')
      .update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      showAlert({ type: 'error', title: 'Update Failed', message: 'Could not update the quantity.', detail: `<strong>Error:</strong> ${error.message}` })
      return
    }

    loadInventory(searchInput.value, categoryFilter.value, statusFilter.value)
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

  window.deleteItem = (id) => {
  showConfirm({
    type: 'delete',
    title: 'Move to Archive',
    message: 'Are you sure you want to move this item to the archive? You can restore it later.',
    onConfirm: async () => {
      const { error } = await client
        .from('admininventory')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        showAlert({ type: 'error', title: 'Archive Failed', message: 'Could not move this item to the archive.', detail: `<strong>Error:</strong> ${error.message}` })
        return
      }

      showAlert({ type: 'success', title: 'Moved to Archive', message: 'The item has been successfully moved to the archive.' })
      loadInventory()
    }
  })
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