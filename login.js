// Clear session just in case they reached this page manually while logged in
localStorage.removeItem('medpredict_auth');

// Setup DB
let usersDB = JSON.parse(localStorage.getItem('medpredict_users')) || [];

// Form Element Grab
const tabAdmin = document.getElementById('tab-admin');
const tabUser = document.getElementById('tab-user');
const adminForm = document.getElementById('admin-form');
const userForm = document.getElementById('user-form');
const registerForm = document.getElementById('register-form');

const showRegBtn = document.getElementById('show-register-btn');
const showLoginBtn = document.getElementById('show-login-btn');

function resetForms() {
    adminForm.classList.remove('active');
    userForm.classList.remove('active');
    registerForm.classList.remove('active');
    document.getElementById('user-error-msg').style.display = 'none';
    document.getElementById('admin-error-msg').style.display = 'none';
    document.getElementById('reg-error-msg').style.display = 'none';
    document.getElementById('reg-success-msg').style.display = 'none';
}

tabAdmin.addEventListener('click', () => {
    tabAdmin.classList.add('active');
    tabUser.classList.remove('active');
    resetForms();
    adminForm.classList.add('active');
});

tabUser.addEventListener('click', () => {
    tabUser.classList.add('active');
    tabAdmin.classList.remove('active');
    resetForms();
    userForm.classList.add('active');
});

showRegBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForms();
    registerForm.classList.add('active');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForms();
    userForm.classList.add('active');
});

// Shake Animation Helper
function shakeCard() {
    const card = document.querySelector('.login-card');
    card.style.transform = 'translate(-10px, 0)';
    setTimeout(() => card.style.transform = 'translate(10px, 0)', 100);
    setTimeout(() => card.style.transform = 'translate(-10px, 0)', 200);
    setTimeout(() => card.style.transform = 'translate(0, 0)', 300);
}

// Login Logic
adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('admin-username').value.trim();
    const pass = document.getElementById('admin-password').value.trim();
    const err = document.getElementById('admin-error-msg');
    
    if (user === 'admin' && pass === 'password') {
        err.style.display = 'none';
        localStorage.setItem('medpredict_auth', JSON.stringify({ token: 'admin_123', role: 'admin' }));
        
        // Log Login Event
        let notifs = JSON.parse(localStorage.getItem('medpredict_notifications')) || [];
        notifs.push({ message: `System Admin securely authenticated.`, time: new Date().toLocaleTimeString(), read: false });
        localStorage.setItem('medpredict_notifications', JSON.stringify(notifs));
        
        window.location.href = 'index.html';
    } else {
        err.style.display = 'block';
        shakeCard();
    }
});

userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('user-username').value.trim();
    const pass = document.getElementById('user-password').value.trim();
    const err = document.getElementById('user-error-msg');
    
    // Auth Check
    const validUser = usersDB.find(u => u.username === user && u.password === pass);
    
    if (validUser) {
        err.style.display = 'none';
        localStorage.setItem('medpredict_auth', JSON.stringify({ token: 'user_123', role: 'user', name: user }));
        
        // Log Login Event
        let notifs = JSON.parse(localStorage.getItem('medpredict_notifications')) || [];
        notifs.push({ message: `Clinical User (${user}) established secure session.`, time: new Date().toLocaleTimeString(), read: false });
        localStorage.setItem('medpredict_notifications', JSON.stringify(notifs));
        
        window.location.href = 'index.html';
    } else {
        err.style.display = 'block';
        shakeCard();
    }
});

// Registration Logic
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const err = document.getElementById('reg-error-msg');
    const succ = document.getElementById('reg-success-msg');
    
    err.style.display = 'none';
    succ.style.display = 'none';
    
    if (!user || user.length < 3) {
        err.textContent = "Username must be at least 3 characters.";
        err.style.display = 'block';
        return shakeCard();
    }
    if (!pass || pass.length < 6) {
        err.textContent = "Password must be at least 6 characters.";
        err.style.display = 'block';
        return shakeCard();
    }
    
    if (user === 'admin' || usersDB.some(u => u.username.toLowerCase() === user.toLowerCase())) {
        err.textContent = "Error: Username is already taken.";
        err.style.display = 'block';
        return shakeCard();
    }
    
    usersDB.push({ username: user, password: pass });
    localStorage.setItem('medpredict_users', JSON.stringify(usersDB));
    
    // Push notification to Admin
    let notifs = JSON.parse(localStorage.getItem('medpredict_notifications')) || [];
    notifs.push({ 
        message: `New User Registration: ${user}`, 
        time: new Date().toLocaleTimeString(), 
        read: false 
    });
    localStorage.setItem('medpredict_notifications', JSON.stringify(notifs));
    
    succ.style.display = 'block';
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
});
