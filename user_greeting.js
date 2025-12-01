import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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

const userTxt = document.getElementById("user_txt");

const greetings = [
    "Hello",
    "Welcome",
    "Howdy there",
    "Good to see you",
    "Hola",
    "Ciao",
    "Bonjour",
    "Hallo",
    "Konnichiwa",
    "Xin chào",
    "Nǐ hǎo",
    "Hej",
    "Annyeonghaseyo"
]

function getRandomGreeting() {
    const idx = Math.floor(Math.random() * greetings.length);
    return greetings[idx];
}

export async function updateGreeting() {
    const user = auth.currentUser;
    if (user) {
        currentUser = user;
        console.log('User logged in:', user.uid);

        // Get user's doc
        const userDocRef = doc(db, "users", user.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();

                if(userData.firstName) {
                    const greeting = getRandomGreeting();
                    userTxt.textContent = `${greeting}, ${userData.firstName}!`;
                } else {
                    userTxt.textContent = "Hello User!";  // Default if first name is found
                }
            } else {
                console.warn("No user document found");
                userTxt.textContent = "Hello User!"; 
            }
        } catch (error) {
            console.error("Error getting user document: ", error);
            userTxt.textContent = "Hello User!"; 
        }
    } else {
        console.log('No user logged in, redirecting...');
        window.location.href = 'login_index.html';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if(user) {
            updateGreeting();
        }
    })
})