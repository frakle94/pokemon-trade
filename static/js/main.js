document.getElementById('showRegisterBtn').addEventListener('click', function () {
    const registrationSection = document.getElementById('registrationSection');
    registrationSection.style.display = registrationSection.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('registerForm').addEventListener('submit', handleRegistration);
document.getElementById('loginForm').addEventListener('submit', handleLogin);
