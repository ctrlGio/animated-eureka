const { createClient } = supabase
const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let allItems = []

async function loadEquipment() {
  const grid = document.querySelector('.equipment-grid')
  grid.innerHTML = `<p style="color:#888; padding: 20px;">Loading equipment...</p>`

  const { data, error } = await client
    .from('admininventory')
    .select('*')
    .order('item_name', { ascending: true })

  if (error) {
    console.error(error)
    grid.innerHTML = `<p style="color:red; padding:20px;">Failed to load equipment.</p>`
    return
  }

  allItems = data || []
  renderCards(allItems)
}

function renderCards(items) {
  const grid = document.querySelector('.equipment-grid')

  if (!items || items.length === 0) {
    grid.innerHTML = `<p style="color:#888; padding:20px;">No equipment found.</p>`
    return
  }

  grid.innerHTML = items.map(item => {
    const available = item.status === 'Available'
    const badgeClass = available ? 'badge-available' : 'badge-unavailable'
    const badgeText  = available ? 'Available' : 'Unavailable'

    return `
      <div class="equipment-card">
        <div class="card-header">
          <h3>${item.item_name}</h3>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <p class="category-label">Category ID: ${item.category_id || '—'}</p>
        <div class="card-footer">
          <div class="availability">
            <span class="label">In Stock</span>
            <span class="count">${item.quantity}</span>
          </div>
          <button
            class="request-btn"
            onclick="goToRequest('${item.item_name.replace(/'/g, "\\'")}')"
            ${!available ? 'disabled title="Not available"' : ''}
          >
            <i class="fa-solid fa-cart-shopping"></i> Request
          </button>
        </div>
      </div>`
  }).join('')
}

function goToRequest(itemName) {
  sessionStorage.setItem('preselectedItem', itemName)
  window.location.href = '/System/studentview/student_request.html'
}

function filterItems() {
  const search   = document.querySelector('.search-input').value.toLowerCase()
  const category = document.querySelector('.category-filter').value

  const filtered = allItems.filter(item => {
    const matchSearch   = item.item_name.toLowerCase().includes(search)
    const matchCategory = category === 'All' || category === 'All Categories' || !category
      ? true
      : String(item.category_id) === category

    return matchSearch && matchCategory
  })

  renderCards(filtered)
}

document.addEventListener('DOMContentLoaded', () => {
  loadEquipment()

  const searchInput = document.querySelector('.search-input')
  if (searchInput) searchInput.addEventListener('input', filterItems)

  const categoryFilter = document.querySelector('.category-filter')
  if (categoryFilter) categoryFilter.addEventListener('change', filterItems)
})