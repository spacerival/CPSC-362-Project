// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDejcz9F-nLXaUE-fyLTE2FPKjfirBxQys",
  authDomain: "login-form-8b627.firebaseapp.com",
  projectId: "login-form-8b627",
  storageBucket: "login-form-8b627.firebasestorage.app",
  messagingSenderId: "629954794557",
  appId: "1:629954794557:web:51d41ddf80348532c50654",
  measurementId: "G-Q2ZFXF54WX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore();

// Message Display Function
function showMessage(elementId, text, type) {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 4000);
}

// Sign Up Handler
const signUp = document.getElementById('signupForm');
if (signUp) {
    signUp.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                const userData = {
                    email: email,
                    firstName: firstName,
                    lastName: lastName
                };
                
                const docRef = doc(db, "users", user.uid);
                setDoc(docRef, userData)
                    .then(() => {
                        showMessage('signupMessage', 'Account created successfully! Redirecting to sign in...', 'success');
                        console.log('Account created:', userData);
                        
                        setTimeout(() => {
                            // Switch to login page
                            if (typeof showPage === 'function') {
                                showPage('login');
                            }
                        }, 2000);
                    })
                    .catch((error) => {
                        console.error("Error writing document", error);
                        showMessage('signupMessage', 'Account created but failed to save user data', 'error');
                    });
            })
            .catch((error) => {
                const errorCode = error.code;
                if (errorCode == 'auth/email-already-in-use') {
                    showMessage('signupMessage', 'Email Address Already Exists!', 'error');
                } else {
                    showMessage('signupMessage', 'Unable to create User', 'error');
                }
                console.error('Signup error:', error);
            });
    });
}

// Sign In Handler
const signIn = document.getElementById('loginForm');
if (signIn) {
    signIn.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                showMessage('loginMessage', 'Login successful! Redirecting...', 'success');
                const user = userCredential.user;
                console.log('User logged in:', user);
                
                setTimeout(() => {
                    // Redirect to dashboard or home page
                    window.location.href = 'profile.html';
                }, 1500);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                
                if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                    showMessage('loginMessage', 'Incorrect email or password', 'error');
                } else if (errorCode === 'auth/user-not-found') {
                    showMessage('loginMessage', 'No account found with this email', 'error');
                } else if (errorCode === 'auth/invalid-email') {
                    showMessage('loginMessage', 'Invalid email address', 'error');
                } else {
                    showMessage('loginMessage', 'Login failed: ' + errorMessage, 'error');
                }
                console.error('Login error:', error);
            });
    });
}