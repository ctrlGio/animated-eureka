document.addEventListener('DOMContentLoaded', function () {

  const { createClient } = supabase
  const SUPABASE_URL = 'https://pxqacjetfbqwwacifyhv.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cWFjamV0ZmJxd3dhY2lmeWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTAyMDAsImV4cCI6MjA5NDA2NjIwMH0.EO9lMp3Nmg29JhIuuzEgM15nlRaQZKwQg6EkXMSTos4'
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  /* ── Stats ─────────────────────────────────────────── */
  async function loadStats() {
    const statuses = ['Pending Admin Approval', 'Approved', 'Rejected']
    const counts   = await Promise.all(statuses.map(s =>
      client.from('adminrequisition_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', s)
        .then(r => r.count || 0)
    ))

    const vals = document.querySelectorAll('.monitoring-value')
    if (vals[0]) vals[0].textContent = counts[0]
    if (vals[1]) vals[1].textContent = counts[1]
    if (vals[2]) vals[2].textContent = counts[2]
  }

  /* ── Load table ─────────────────────────────────────── */
  async function loadRequisitions() {
    const { data, error } = await client
      .from('adminrequisition_forms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { console.error('Error loading requisitions:', error); return }
    renderTable(data)
  }

  /* ── Render ─────────────────────────────────────────── */
  function renderTable(records) {
    const table   = document.querySelector('.requisition-table')
    const oldBody = table.querySelector('tbody')
    if (oldBody) oldBody.remove()

    const tbody = document.createElement('tbody')

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">No requisition forms found.</td></tr>`
    } else {
      records.forEach((r, index) => {
        const status = r.status || 'Pending Admin Approval'

        const statusClass = status === 'Approved'              ? 'status-approved'
                          : status === 'Rejected'              ? 'status-rejected'
                          : 'status-pending'

        // urgency — only show badge if it's actually High/Medium/Low
        const validUrgency = ['High', 'Medium', 'Low'].includes(r.urgency)
        const urgencyClass = r.urgency === 'High'   ? 'urgency-high'
                           : r.urgency === 'Medium' ? 'urgency-medium'
                           : 'urgency-low'
        const urgencyHtml  = validUrgency
          ? `<span class="urgency-badge ${urgencyClass}">${r.urgency}</span>`
          : `<span style="color:#888;">—</span>`

        const isPending = status === 'Pending Admin Approval'

        tbody.innerHTML += `
          <tr data-id="${r.id}">
            <td>#${index + 1}</td>
            <td>${r.requestor || '—'}</td>
            <td>${r.professor || '—'}</td>
            <td>${r.item_requested || '—'}</td>
            <td>${r.quantity ?? '—'}</td>
            <td>${r.date || '—'}</td>
            <td>${urgencyHtml}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td>
              <div class="actions-cell">
                <button class="approve-btn" onclick="approveRequisition(${r.id})" title="Approve" ${!isPending ? 'disabled' : ''}>
                  <i class="fa-solid fa-check"></i>
                </button>
                <button class="reject-btn" onclick="rejectRequisition(${r.id})" title="Reject" ${!isPending ? 'disabled' : ''}>
                  <i class="fa-solid fa-xmark"></i>
                </button>
                <button class="delete-btn" onclick="deleteRequisition(${r.id})" title="Delete">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>`
      })
    }

    table.appendChild(tbody)
  }

  /* ── Actions ─────────────────────────────────────────── */
  window.approveRequisition = async (id) => {
    if (!confirm('Approve this requisition?')) return

    // Fetch full requisition record first
    const { data: req, error: fetchErr } = await client
      .from('adminrequisition_forms')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !req) { alert('Failed to fetch requisition details.'); return }

    // Update status to Approved
    const { error } = await client
      .from('adminrequisition_forms')
      .update({ status: 'Approved', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { alert('Failed to approve: ' + error.message); return }

    // Look up student record to get student_id and year_level
    const { data: student } = await client
      .from('students')
      .select('student_id, year_level')
      .ilike('student_name', req.requestor)
      .maybeSingle()

    // Calculate due date (borrow date + 7 days by default)
    const borrowDate = req.date || new Date().toISOString().split('T')[0]
    const due = new Date(borrowDate)
    due.setDate(due.getDate() + 7)
    const dueDate = due.toISOString().split('T')[0]

    // Create borrow record in adminborrows
    const { error: borrowErr } = await client
      .from('adminborrows')
      .insert([{
        student_id:    student?.student_id || 'N/A',
        student_name:  req.requestor,
        year_level:    student?.year_level || 'N/A',
        item_borrowed: req.item_requested,
        quantity:      req.quantity,
        borrow_date:   borrowDate,
        due_date:      dueDate,
        status:        'Active'
      }])

    if (borrowErr) {
      console.error('Failed to create borrow record:', borrowErr)
      alert('Approved but failed to create borrow record: ' + borrowErr.message)
    }

    loadRequisitions(); loadStats()
  }

  window.rejectRequisition = async (id) => {
    if (!confirm('Reject this requisition?')) return
    const { error } = await client
      .from('adminrequisition_forms')
      .update({ status: 'Rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { alert('Failed to reject: ' + error.message); return }
    loadRequisitions(); loadStats()
  }

  window.deleteRequisition = async (id) => {
    if (!confirm('Delete this requisition?')) return
    const { error } = await client
      .from('adminrequisition_forms')
      .delete()
      .eq('id', id)
    if (error) { alert('Failed to delete: ' + error.message); return }
    loadRequisitions(); loadStats()
  }

  loadStats()
  loadRequisitions()
})