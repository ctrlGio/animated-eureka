const loginForm = document.querySelector('.login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (username.length > 30) {
        alert('Username cannot be more than 30 characters');
        return;
    }

    const validRoles = ['admin', 'student', 'instructor'];
    const activeRole = validRoles.includes(username) ? username : null;

    if (!activeRole) {
        alert('Invalid username. Please use admin, student, or instructor.');
        return;
    }

    if (password === activeRole + '123') {
        if (activeRole === 'admin') {
            window.location.href = '/System/adminview/admin_homepage.html';
        } else if (activeRole === 'instructor') {
            window.location.href = '/System/instructorview/instructor_homepage.html';
        } else if (activeRole === 'student') {
            window.location.href = '/System/studentview/student_homepage.html';
        }
    } else {
        alert(`Invalid ${activeRole} credentials. Please try again!`);
    }
});

const toggleBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const passwordWrapper = document.getElementById('password-wrapper');

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  eyeIcon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

passwordWrapper.addEventListener('focusout', (e) => {
  if (!passwordWrapper.contains(e.relatedTarget)) {
    passwordInput.type = 'password';
    eyeIcon.className = 'fa-regular fa-eye';
    toggleBtn.setAttribute('aria-label', 'Show password');
  }
});