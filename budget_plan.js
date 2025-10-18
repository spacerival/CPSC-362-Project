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

const planForm = document.getElementById("plan_form");
const planSelect = document.getElementById("plan_select");
const planMsg = document.getElementById("plan_msg");
const planDisplay = document.getElementById("plan_display");
const currentPlanTxt = document.getElementById("current_plan_txt");
const changePlanButton = document.getElementById("change_plan_button");

onAuthStateChanged(auth, async(user) => {
    if (user) {
        currentUser = user;
        console.log('User logged in:', user.uid);

        // Get user's doc
        const userDocRef = doc(db, "users", user.uid);
        
    
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();

                if(userData.budgetPlan) {
                    // Show their saved plan
                    showPlan(userData.budgetPlan);
                } else {
                    // No plan yet - show form
                    showForm();
                }
            } else {
                // User doc doesn't exist
                showForm();
            }
        } catch (error) {
            console.error("Error getting user document: ", error);
            showForm();
        }
    } else {
        console.log('No user logged in, redirecting...');
        window.location.href = 'index.html';
    }
});

// If user hasn't chosen a budget plan, show form for selecting a plan 
function showForm() {
    planForm.style.display = "block";
    planDisplay.style.display = "none";
}

// If user has chosen a budget plan, show budget plan stats
function showPlan(planType) {
    planForm.style.display = "none";
    planDisplay.style.display = "block";
    currentPlanTxt.textContent = planType.charAt(0).toUpperCase() + planType.slice(1);
}


planForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    // throws error if user isn't logged in
    if(!currentUser) {
        showMessage("Please log in to save your budget plan", "error");
        return;
    }

    const selectedPlan = planSelect.value;

    // throws error if a plan was not selected
    if(!selectedPlan) {
        showMessage("Please select a plan first.", "error");
        return;
    }

    try {
        // Save plan to user's doc
        await setDoc(
            doc(db, "users", currentUser.uid),
            {budgetPlan: selectedPlan},
            {merge: true}   // merge ensures other fields are kept
        );

        showMessage("Budget plan saved successfully!", "success");
        console.log("Saving plan: ", selectedPlan);     // test to see if successfully saved
        showPlan(selectedPlan);
    } catch (error) {
        console.log("Error saving budget plan: ", error);
        console.error();
        showMessage("Failed to save budget plan. Try again.", "error");
    }
})

changePlanButton.addEventListener("click", () => {
    showForm();
})

function showMessage(text, type) {
    planMsg.textContent = text;
    planMsg.className = `message ${type}`;
    planMsg.style.display = 'block';
    
    setTimeout(() => {
        planMsg.style.display = 'none';
    }, 4000);
}
