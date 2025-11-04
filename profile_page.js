import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    updateEmail, 
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDejcz9F-nLXaUE-fyLTE2FPKjfirBxQys",
    authDomain: "login-form-8b627.firebaseapp.com",
    projectId: "login-form-8b627",
    storageBucket: "login-form-8b627.firebasestorage.app",
    messagingSenderId: "629954794557",
    appId: "1:629954794557:web:51d41ddf80348532c50654",
    measurementId: "G-Q2ZFXF54WX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null;

// DOM Elements
const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const emailInput = document.getElementById('email');
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const profileMessage = document.getElementById('profileMessage');
const passwordMessage = document.getElementById('passwordMessage');
const logoutBtn = document.getElementById('logoutBtn');
const newPasswordInput = document.getElementById('newPassword');

// Check authentication and load user data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('User logged in:', user.uid);
        await loadUserData();
    } else {
        console.log('No user logged in, redirecting...');
        window.location.href = 'index.html';
    }
});

// Load user data from Firestore
async function loadUserData() {
    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Populate form fields
            firstNameInput.value = userData.firstName || '';
            lastNameInput.value = userData.lastName || '';
            emailInput.value = currentUser.email || '';
            
            // Update display
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User';
            displayName.textContent = fullName;
            displayEmail.textContent = currentUser.email || 'No email';
        } else {
            console.warn('User document not found');
            emailInput.value = currentUser.email || '';
            displayEmail.textContent = currentUser.email || 'No email';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('profileMessage', 'Error loading profile data', 'error');
    }
}

// Handle profile form submission
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const newEmail = emailInput.value.trim();
    
    if (!firstName || !lastName || !newEmail) {
        showMessage('profileMessage', 'Please fill in all fields', 'error');
        return;
    }
    
    showMessage('profileMessage', 'Updating profile...', 'info');
    
    try {
        const emailChanged = newEmail !== currentUser.email;
        
        // Update Firestore first
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, {
            firstName: firstName,
            lastName: lastName,
            email: newEmail
        }, { merge: true });
        
        console.log('Firestore updated successfully');
        
        // Update email in Firebase Auth if changed
        if (emailChanged) {
            try {
                await updateEmail(currentUser, newEmail);
                console.log('Email updated in Firebase Auth');
            } catch (emailError) {
                console.error('Email update error:', emailError);
                if (emailError.code === 'auth/requires-recent-login') {
                    showMessage('profileMessage', 'Name updated! To change email, please log out and log back in first.', 'success');
                    // Update display with current auth email
                    const fullName = `${firstName} ${lastName}`;
                    displayName.textContent = fullName;
                    displayEmail.textContent = currentUser.email;
                    await loadUserData();
                    return;
                }
                throw emailError; // Re-throw other errors
            }
        }
        
        // Update display
        const fullName = `${firstName} ${lastName}`;
        displayName.textContent = fullName;
        displayEmail.textContent = newEmail;
        
        showMessage('profileMessage', 'Profile updated successfully!', 'success');
        
        // Reload user data
        await loadUserData();
    } catch (error) {
        console.error('Error updating profile:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'auth/requires-recent-login') {
            showMessage('profileMessage', 'Please log out and log back in to update your email', 'error');
        } else if (error.code === 'auth/email-already-in-use') {
            showMessage('profileMessage', 'This email is already in use', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showMessage('profileMessage', 'Invalid email address', 'error');
        } else {
            showMessage('profileMessage', 'Failed to update profile: ' + (error.message || 'Unknown error'), 'error');
        }
    }
});

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    let strengthClass = 'strength-weak';

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    switch (strength) {
        case 0:
        case 1:
            strengthClass = 'strength-weak';
            break;
        case 2:
            strengthClass = 'strength-fair';
            break;
        case 3:
            strengthClass = 'strength-good';
            break;
        case 4:
        case 5:
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
if (newPasswordInput) {
    newPasswordInput.addEventListener('input', function() {
        checkPasswordStrength(this.value);
    });
}

// Confirm password validation
const confirmPasswordInput = document.getElementById('confirmNewPassword');
if (confirmPasswordInput && newPasswordInput) {
    confirmPasswordInput.addEventListener('input', function() {
        if (this.value && this.value !== newPasswordInput.value) {
            this.setCustomValidity('Passwords do not match');
        } else {
            this.setCustomValidity('');
        }
    });
}

// Handle password change form submission
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    // Validate passwords
    if (newPassword !== confirmNewPassword) {
        showMessage('passwordMessage', 'New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showMessage('passwordMessage', 'Password must be at least 8 characters', 'error');
        return;
    }
    
    if (!checkPasswordStrength(newPassword)) {
        showMessage('passwordMessage', 'Password is too weak. Please use a stronger password.', 'error');
        return;
    }
    
    showMessage('passwordMessage', 'Updating password...', 'info');
    
    try {
        // Re-authenticate user with current password
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        showMessage('passwordMessage', 'Password updated successfully!', 'success');
        
        // Clear form
        passwordForm.reset();
        document.getElementById('strengthFill').style.width = '0%';
    } catch (error) {
        console.error('Error updating password:', error);
        
        if (error.code === 'auth/wrong-password') {
            showMessage('passwordMessage', 'Current password is incorrect', 'error');
        } else if (error.code === 'auth/weak-password') {
            showMessage('passwordMessage', 'New password is too weak', 'error');
        } else {
            showMessage('passwordMessage', 'Failed to update password. Please try again.', 'error');
        }
    }
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to log out?')) {
        try {
            await signOut(auth);
            console.log('User logged out');
            window.location.href = 'main.html';
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Failed to log out. Please try again.');
        }
    }
});

// Show message function
function showMessage(elementId, text, type) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Input focus animations
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});