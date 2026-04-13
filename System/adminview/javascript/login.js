const loginForm = document.querySelector('.login-form');
const roleButtons = document.querySelectorAll('.role-selection button');
const signInBtn = document.querySelector('.sign-in-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const demoUserLabel = document.getElementById('demo-user');
const demoPassLabel = document.getElementById('demo-pass');

roleButtons.forEach(button => {
    button.addEventListener('click', () => {
        
        roleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const role = button.innerText;
        const roleLower = role.toLowerCase();
        
        signInBtn.innerText = `Sign In as ${role}`;
        usernameInput.placeholder = `Enter ${roleLower} username`;
        passwordInput.placeholder = `Enter ${roleLower} password`;
        
        if (demoUserLabel && demoPassLabel) {
            demoUserLabel.innerText = roleLower;
            demoPassLabel.innerText = roleLower + '123';
        }
    });
});

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    const activeBtn = document.querySelector('.role-selection button.active');
    const activeRole = activeBtn ? activeBtn.innerText.toLowerCase() : 'student';

    if (username.length > 30) {
        alert('Username cannot be more than 30 characters');
        return;
    }

    if (username === activeRole && password === activeRole + '123') {
        window.location.href = 'homepage.html';
    } else {
        alert(`Invalid ${activeRole} credentials. Please try again!`);
    }
});