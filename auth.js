// Simple authentication system (for demo purposes)
const validUsers = {
    'admin': 'admin123',
};

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (validUsers[username] && validUsers[username] === password) {
        // Store user session
        localStorage.setItem('currentUser', username);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } else {
        alert('Invalid username or password!');
    }
});

// Check if user is already logged in
if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = 'dashboard.html';
}