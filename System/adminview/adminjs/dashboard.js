document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  async function loadStats() {

    // Active Borrows
    const { count: activeBorrows } = await client
      .from('adminborrows')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active')

    // Total Inventory Items
    const { data: inventoryData } = await client
      .from('admininventory')
      .select('quantity')
    const totalItems = inventoryData?.reduce((sum, item) => sum + item.quantity, 0) || 0

    // Pending Requisitions
    const { count: pendingReqs } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')

    // For Overdue Items
    const { count: overdueItems } = await client
      .from('adminborrows')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Overdue')

    // Update stat cards
    const statValues = document.querySelectorAll('.stat-value')
    if (statValues[0]) statValues[0].textContent = activeBorrows  || 0
    if (statValues[1]) statValues[1].textContent = totalItems
    if (statValues[2]) statValues[2].textContent = pendingReqs    || 0
    if (statValues[3]) statValues[3].textContent = overdueItems   || 0
  }

  async function loadRecentActivities() {
    const { data: recentBorrows, error } = await client
      .from('adminborrows')
      .select('student_name, item_borrowed, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) { console.error('Error loading activities:', error); return }

    const activityList = document.querySelector('.activity-list')
    if (!activityList) return

    activityList.innerHTML = ''

    if (!recentBorrows || recentBorrows.length === 0) {
      activityList.innerHTML = '<p style="color:#888; font-size:13px; padding:15px 0;">No recent activities.</p>'
      return
    }

    recentBorrows.forEach(borrow => {
      const date     = new Date(borrow.created_at)
      const now      = new Date()
      const diffMs   = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHrs  = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHrs / 24)

      let timeAgo = ''
      if (diffMins < 1)       timeAgo = 'just now'
      else if (diffMins < 60) timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
      else if (diffHrs < 24)  timeAgo = `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`
      else                    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

      activityList.innerHTML += `
        <div class="activity-item">
          <span class="dot blue"></span>
          <div class="activity-info">
            <strong>Item borrowed</strong>
            <p>${borrow.student_name} - ${borrow.item_borrowed || 'Unknown Item'}</p>
          </div>
          <span class="activity-time">${timeAgo}</span>
        </div>`
    })
  }

  loadStats()
  loadRecentActivities()

})