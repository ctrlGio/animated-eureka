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
  showRestoreModal({
    onConfirm: async () => {
      const { error } = await client
        .from('admininventory')
        .update({ deleted_at: null })
        .eq('id', id)

      if (error) { showMessageModal('Failed to restore: ' + error.message, 'error'); return }

      showMessageModal('Item successfully restored to inventory.', 'success')
      loadArchive(searchInput.value, categoryFilter.value)
    }
  })
}

function showMessageModal(message, type = 'success') {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
  `

  const isSuccess = type === 'success'
  const iconColor = isSuccess ? '#16a34a' : '#c0392b'
  const iconBg = isSuccess ? '#dcfce7' : '#fdecea'
  const iconPath = isSuccess
    ? `<path d="M20 6L9 17l-5-5"/>`
    : `<path d="M18 6L6 18M6 6l12 12"/>`

  overlay.innerHTML = `
    <div style="background: #fff; border-radius: 12px; padding: 1.5rem; width: 340px; max-width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.18);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${iconBg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${iconPath}
          </svg>
        </div>
        <span style="font-size: 17px; font-weight: 500;">${isSuccess ? 'Success' : 'Error'}</span>
      </div>
      <p style="font-size: 14px; color: #666; margin: 0 0 1.25rem; line-height: 1.6;">${message}</p>
      <div style="display: flex; justify-content: flex-end;">
        <button id="msg-ok" style="padding: 8px 24px; font-size: 14px; border-radius: 8px; background: ${isSuccess ? '#16a34a' : '#c0392b'}; color: #fff; border: none; cursor: pointer; font-weight: 500;">OK</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  const cleanup = () => document.body.removeChild(overlay)
  overlay.querySelector('#msg-ok').onclick = cleanup
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup() })
}

function showRestoreModal({ onConfirm, onCancel }) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
  `

  overlay.innerHTML = `
    <div style="background: #fff; border-radius: 12px; padding: 1.5rem; width: 340px; max-width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.18);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #e8eafd; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3d3dc4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </div>
        <span style="font-size: 17px; font-weight: 500;">Restore item</span>
      </div>
      <p style="font-size: 14px; color: #666; margin: 0 0 1.25rem; line-height: 1.6;">
        Restore this item back to inventory?
      </p>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="modal-cancel" style="padding: 8px 20px; font-size: 14px; border-radius: 8px; border: 1px solid #ddd; background: #f5f5f5; cursor: pointer;">Cancel</button>
        <button id="modal-confirm" style="padding: 8px 20px; font-size: 14px; border-radius: 8px; background: #3d3dc4; color: #fff; border: none; cursor: pointer; font-weight: 500;">Restore</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const cleanup = () => document.body.removeChild(overlay)

  overlay.querySelector('#modal-cancel').onclick = () => { cleanup(); onCancel?.() }
  overlay.querySelector('#modal-confirm').onclick = () => { cleanup(); onConfirm() }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); onCancel?.() } })
}

  if (searchInput) searchInput.addEventListener('input', () => loadArchive(searchInput.value, categoryFilter.value))
  if (categoryFilter) categoryFilter.addEventListener('change', () => loadArchive(searchInput.value, categoryFilter.value))

  loadArchive()

})