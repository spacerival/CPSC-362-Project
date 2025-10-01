// Page Navigation
function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    if (pageName === 'login') {
        document.getElementById('loginPage').classList.add('active');
    } else if (pageName === 'signup') {
        document.getElementById('signupPage').classList.add('active');
    }
}

// Password Strength Checker
function checkPasswordStrength(password) {
    let strength = 0;
    let strengthText = 'Weak';
    let strengthClass = 'strength-weak';

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    switch (strength) {
        case 0:
        case 1:
            strengthText = 'Weak';
            strengthClass = 'strength-weak';
            break;
        case 2:
            strengthText = 'Fair';
            strengthClass = 'strength-fair';
            break;
        case 3:
            strengthText = 'Good';
            strengthClass = 'strength-good';
            break;
        case 4:
        case 5:
            strengthText = 'Strong';
            strengthClass = 'strength-strong';
            break;
    }

    const strengthFill = document.getElementById('strengthFill');
    if (strengthFill) {
        const percentage = (strength / 4) * 100;
        strengthFill.style.width = percentage + '%';
        strengthFill.className = `strength-fill ${strengthClass}`;
    }

    return strength >= 3;
}

// Password strength indicator
const passwordInput = document.getElementById('password');
if (passwordInput) {
    passwordInput.addEventListener('input', function() {
        checkPasswordStrength(this.value);
    });
}

// Confirm password validation
const confirmPasswordInput = document.getElementById('confirmPassword');
if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener('input', function() {
        if (this.value && this.value !== passwordInput.value) {
            this.setCustomValidity('Passwords do not match');
        } else {
            this.setCustomValidity('');
        }
    });
}

// Input Focus Animations
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Make showPage function globally accessible
window.showPage = showPage;