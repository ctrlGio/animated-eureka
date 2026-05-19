document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const searchInput = document.querySelector('.search-input')
  const categoryFilter = document.querySelector('.category-filter')

  async function loadArchive(search = '', category = '') {
    let query = client
      .from('admininventory')
      .select('*, admincategories(name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (search) query = query.ilike('item_name', `%${search}%`)

    const { data, error } = await query
    if (error) { console.error('Error loading archive:', error); return }

    let filtered = data
    if (category && category !== 'All Categories') {
      filtered = data.filter(item => item.admincategories?.name === category)
    }

    renderTable(filtered)
  }

  function renderTable(items) {
    const tbody = document.getElementById('archiveTableBody')
    tbody.innerHTML = ''

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="archive-empty">
              <i class="fa-solid fa-box-open"></i>
              <p>No archived items found.</p>
            </div>
          </td>
        </tr>`
      return
    }

    items.forEach(item => {
      const categoryName = item.admincategories?.name || 'Unknown'
      const deletedAt = item.deleted_at
        ? new Date(item.deleted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '—'

      const statusClass = item.status === 'Available' ? 'status-available'
        : item.status === 'Borrowed' ? 'status-borrowed'
        : 'status-maintenance'

      tbody.innerHTML += `
        <tr data-id="${item.id}">
          <td>${item.item_name}</td>
          <td>${categoryName}</td>
          <td>${item.quantity}</td>
          <td><span class="status-badge ${statusClass}">${item.status}</span></td>
          <td>${deletedAt}</td>
          <td>
            <button class="restore-btn" onclick="restoreItem(${item.id})" title="Restore">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </td>
        </tr>`
    })
  }

  window.restoreItem = async (id) => {
    if (!confirm('Restore this item back to inventory?')) return

    const { error } = await client
      .from('admininventory')
      .update({ deleted_at: null })
      .eq('id', id)

    if (error) { alert('Failed to restore: ' + error.message); return }

    alert('Item successfully restored to inventory.')
    loadArchive(searchInput.value, categoryFilter.value)
  }

  if (searchInput) searchInput.addEventListener('input', () => loadArchive(searchInput.value, categoryFilter.value))
  if (categoryFilter) categoryFilter.addEventListener('change', () => loadArchive(searchInput.value, categoryFilter.value))

  loadArchive()

})