document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  async function loadStats() {
    const { count: pendingCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')

    const { count: approvedCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')

    const { count: rejectedCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Rejected')

    const { count: totalCount } = await client
      .from('adminrequisition_forms')
      .select('*', { count: 'exact', head: true })

    const statValues = document.querySelectorAll('.stat-value')
    if (statValues[0]) statValues[0].textContent = pendingCount  || 0
    if (statValues[1]) statValues[1].textContent = approvedCount || 0
    if (statValues[2]) statValues[2].textContent = rejectedCount || 0
    if (statValues[3]) statValues[3].textContent = totalCount    || 0
  }

  loadStats()

})