const loginForm = document.querySelector('.login-form');

loginForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (username.length > 30) {
    alert('Username cannot be more than 30 characters');
    return;
  }

  if (password.length > 20) {
    alert('Password cannot be more than 20 characters');
    return;
  }


  if (username === 'admin' && password === 'admin123') {

    window.location.href = 'homepage.html';
  } else {
    alert('Invalid credentials. Please try again!');
  }
});