document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  async function loadStats() {
    const { count: activeBorrows } = await client
      .from('adminborrows')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active')

    const { data: inventoryData } = await client
      .from('admininventory')
      .select('quantity')
    const totalItems = inventoryData?.reduce((sum, i) => sum + i.quantity, 0) || 0

    const { count: pendingReqs } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending Admin Approval')

    const { count: overdueItems } = await client
      .from('adminborrows')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Overdue')

    const statValues = document.querySelectorAll('.stat-value')
    if (statValues[0]) statValues[0].textContent = activeBorrows || 0
    if (statValues[1]) statValues[1].textContent = totalItems
    if (statValues[2]) statValues[2].textContent = pendingReqs   || 0
    if (statValues[3]) statValues[3].textContent = overdueItems  || 0
  }

  function timeAgo(dateStr) {
    const diffMs   = Date.now() - new Date(dateStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHrs  = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHrs / 24)
    if (diffMins < 1)       return 'just now'
    if (diffMins < 60)      return `${diffMins}m ago`
    if (diffHrs  < 24)      return `${diffHrs}h ago`
    return `${diffDays}d ago`
  }

  async function loadRecentActivities() {
    const activityList = document.querySelector('.activity-list')
    if (!activityList) return
    activityList.innerHTML = '<p style="color:#888;font-size:13px;padding:15px 0;">Loading...</p>'

    const { data: borrows } = await client
      .from('adminborrows')
      .select('student_name, item_borrowed, created_at, status, return_date')
      .order('created_at', { ascending: false })
      .limit(6)

    const { data: reqs } = await client
      .from('adminrequisition_forms')
      .select('requestor, item_requested, created_at, status, updated_at')
      .order('created_at', { ascending: false })
      .limit(6)

    const events = []

    ;(borrows || []).forEach(b => {

      events.push({
        time:  b.created_at,
        dot:   'blue',
        icon:  'fa-box-archive',
        title: 'Item Borrowed',
        desc:  `${b.student_name} borrowed <strong>${b.item_borrowed}</strong>`
      })
      if (b.status === 'Returned' && b.return_date) {
        events.push({
          time:  b.return_date,
          dot:   'green',
          icon:  'fa-rotate-left',
          title: 'Item Returned',
          desc:  `${b.student_name} returned <strong>${b.item_borrowed}</strong>`
        })
      }
      if (b.status === 'Overdue') {
        events.push({
          time:  b.created_at,
          dot:   'red',
          icon:  'fa-circle-exclamation',
          title: 'Overdue Item',
          desc:  `${b.student_name} — <strong>${b.item_borrowed}</strong> is overdue`
        })
      }
    })

    ;(reqs || []).forEach(r => {
      if (r.status === 'Approved') {
        events.push({
          time:  r.updated_at || r.created_at,
          dot:   'green',
          icon:  'fa-circle-check',
          title: 'Requisition Approved',
          desc:  `${r.requestor} — <strong>${r.item_requested}</strong>`
        })
      } else if (r.status === 'Rejected') {
        events.push({
          time:  r.updated_at || r.created_at,
          dot:   'red',
          icon:  'fa-circle-xmark',
          title: 'Requisition Rejected',
          desc:  `${r.requestor} — <strong>${r.item_requested}</strong>`
        })
      } else {
        events.push({
          time:  r.created_at,
          dot:   'orange',
          icon:  'fa-clipboard-list',
          title: 'New Requisition',
          desc:  `${r.requestor} requested <strong>${r.item_requested}</strong>`
        })
      }
    })

    events.sort((a, b) => new Date(b.time) - new Date(a.time))
    const top = events.slice(0, 8)

    if (top.length === 0) {
      activityList.innerHTML = '<p style="color:#888;font-size:13px;padding:15px 0;">No recent activities.</p>'
      return
    }

    activityList.innerHTML = top.map(e => `
      <div class="activity-item">
        <span class="dot ${e.dot}"></span>
        <div class="activity-info">
          <strong>${e.title}</strong>
          <p>${e.desc}</p>
        </div>
        <span class="activity-time">${timeAgo(e.time)}</span>
      </div>`
    ).join('')
  }

  loadStats()
  loadRecentActivities()
})