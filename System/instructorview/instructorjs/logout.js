document.addEventListener('DOMContentLoaded', function () {
  const logoutBtn = document.getElementById('logoutBtn')
  if (!logoutBtn) return

  // Inject modal HTML
  const modal = document.createElement('div')
  modal.id = 'logout-modal'
  modal.innerHTML = `
    <div class="logout-modal-overlay" id="logout-overlay">
      <div class="logout-modal-card">
        <div class="logout-modal-icon">
          <i class="fa-solid fa-right-from-bracket"></i>
        </div>
        <h3>Confirm Logout</h3>
        <p>Are you sure you want to logout?</p>
        <div class="logout-modal-actions">
          <button class="logout-confirm-btn" id="logout-confirm">Yes</button>
          <button class="logout-cancel-btn" id="logout-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  // Inject styles
  const style = document.createElement('style')
  style.textContent = `
    .logout-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .logout-modal-overlay.open {
      display: flex;
    }
    .logout-modal-card {
      background: #fff;
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: logoutSlideUp 0.25s ease;
    }
    @keyframes logoutSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .logout-modal-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #fff0f0;
      color: #dc2626;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .logout-modal-card h3 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .logout-modal-card p {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 28px;
    }
    .logout-modal-actions {
      display: flex;
      gap: 12px;
    }
    .logout-confirm-btn {
      flex: 1;
      padding: 12px;
      background: #2b3240;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .logout-confirm-btn:hover { background: #1e232d; }
    .logout-cancel-btn {
      flex: 1;
      padding: 12px;
      background: #f1f5f9;
      color: #475569;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .logout-cancel-btn:hover { background: #e2e8f0; }
  `
  document.head.appendChild(style)

  const overlay    = document.getElementById('logout-overlay')
  const confirmBtn = document.getElementById('logout-confirm')
  const cancelBtn  = document.getElementById('logout-cancel')

  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault()
    overlay.classList.add('open')
  })

  confirmBtn.addEventListener('click', function () {
    localStorage.removeItem('userRole')
    localStorage.removeItem('username')
    localStorage.removeItem('studentId')
    localStorage.removeItem('yearLevel')
    window.location.href = '/System/homepage/loginpage.html'
  })

  cancelBtn.addEventListener('click', function () {
    overlay.classList.remove('open')
  })

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('open')
  })
})