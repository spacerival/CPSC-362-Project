import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { init503020Plan } from "./fifty_thirty_twenty.js";
import { loadSavingsProgress, initSavingsGrowthChart } from "./pay_yourself_first.js";

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
const enteredIncome = document.getElementById("monthly_income");
const extraFields = document.getElementById("extra_fields");
const planMsg = document.getElementById("plan_msg");
const planDisplay = document.getElementById("plan_display");
const currentPlanTxt = document.getElementById("current_plan_txt");
const changePlanButton = document.getElementById("change_plan_button");
const plan1_section = document.getElementById("plan1");
const plan2_section = document.getElementById("plan2");
const plan3_section = document.getElementById("plan3");

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

function slideDown(element) {
    element.classList.add("active");
    element.style.maxHeight = element.scrollHeight + "px";
}

function slideUp(element) {
    element.style.maxHeight = element.scrollHeight + "px";
    requestAnimationFrame(() => {
        element.style.maxHeight = "0";
        element.classList.remove("active");
    })
}

planSelect.addEventListener("change", () => {
    const selectedPlan = planSelect.value;

    if(!selectedPlan) {
        slideUp(extraFields);
        extraFields.innerHTML = "";
        return;
    }

    slideUp(extraFields);

    setTimeout(() => {
        extraFields.innerHTML = "";
    
        if(selectedPlan === "zero-based") {
            displayZeroBasedForm(extraFields);

        } else if (selectedPlan === "pay-yourself-first") {
            extraFields.innerHTML = `
            <p>Set your savings goal before budgeting expenses:</p>
            <p>Choose a percentage-based or a set block savings budget</p>
            <label class="budget_font"></label>
            <label class="switch"> 
                <input id="savings_toggle" type="checkbox">
                <span class="slider round">
            </label>
            <div id="savings_type"></div>`;

            setSavingsToggle();
        }

        requestAnimationFrame(() => {
            slideDown(extraFields);
        });
    }, 400);

});

function updateTotals(incomeInput, categoryInputs, allocatedDisplay, remainingDisplay, saveButton) {
    const income = parseFloat(incomeInput.value) || 0;
    let totalAllocated = 0;

    categoryInputs.forEach(input => {
        totalAllocated += parseFloat(input.value) || 0;
    });

    const remaining = income - totalAllocated;

    allocatedDisplay.textContent = totalAllocated.toFixed(2);
    remainingDisplay.textContent = remaining.toFixed(2);

    checkOverBudget(remaining, allocatedDisplay, remainingDisplay, saveButton);
}

function checkOverBudget(remaining, allocatedDisplay, remainingDisplay, saveButton) {
    const banner = document.getElementById("popup_banner");
    const bannerTxt = document.getElementById("popup_txt");

    if(remaining < 0) {
        allocatedDisplay.style.color = "red";
        remainingDisplay.style.color = "red";
        saveButton.disabled = true;
        saveButton.classList.add("disabled_button");
        
        /*Show Popup*/
        bannerTxt.textContent = "⚠️Warning! Your budgeted expenses exceeds your total monthly income. Please reallocate your category budget to proceed."
        
        if(!banner.classList.contains("active")) {
            setTimeout(() => {
                if(remaining < 0) {
                    banner.classList.add("active");
                }
            }, 10);
        }
        
        banner.classList.remove("hidden");
    } else {
        allocatedDisplay.style.color = "";
        remainingDisplay.style.color = "";
        saveButton.disabled = false;
        saveButton.classList.remove("disabled_button");

        banner.classList.remove("active");

        setTimeout(() => {
            if(remaining >= 0) {
                banner.classList.add("hidden");
            }
        }, 400);
    }
}

function setZeroBasedTracking() {
    const incomeInput = document.getElementById("monthly_income");
    const categoryInputs = document.querySelectorAll(".category_input");
    const allocatedDisplay = document.getElementById("allocated");
    const remainingDisplay = document.getElementById("remaining");
    const saveButton = document.querySelector("#plan_form button[type='submit']");

    function handleInput() {
        updateTotals(incomeInput, categoryInputs, allocatedDisplay, remainingDisplay, saveButton);
    }

    incomeInput.addEventListener("input", handleInput);
    categoryInputs.forEach(input => input.addEventListener("input", handleInput));

    handleInput();
}

function displayZeroBasedForm(element){
    /*TO DO: Stylize Table*/
    element.innerHTML = `
            <p>Assign a planned budget for each category below:</p>
            <table id="category_table" class="center">
                <form>
                    <tr>
                        <th>Category</th>
                        <th>Budget Amount</th>
                    </tr>
                    <tr>
                        <td>
                            <label for="living_essent">Living Essentials</label>
                        </td>
                        <td>
                            <input type="number" id="living_essent" class="category_input" 
                                placeholder="rent, utilities, groceries" min="0" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label for="financial_oblig">Financial Obligations</label>
                        </td>
                        <td>
                            <input type="number" id="financial_oblig" class="category_input" 
                                        placeholder="debt, loans, insurance" min="0" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label for="transportation">Transportation</label>
                        </td>
                        <td>
                            <input type="number" id="transportation" class="category_input" 
                                                placeholder="transportation" min="0" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label for="lifestyle">Lifestyle</label>
                        </td>
                        <td>
                            <input type="number" id="lifestyle" class="category_input" 
                            placeholder="shopping, dining out, entertainment, leisure travel" min="0" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label for="growth_health">Growth & Health</label>
                        </td>
                        <td>
                            <input type="number" id="growth_health" class="category_input" 
                                    placeholder="education, healthcare" min="0" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label for="savings_investments">Savings & Investments</label>
                        </td>
                        <td>
                            <input type="number" id="savings_investments" class="category_input"
                            placeholder="savings account, investment, retirement, emergency funds"  min="0" required>
                        </td>
                    </tr>
                </form>
            </table>
            
            <div id="allocation_summary">
                <p><strong>Total Allocated:</strong> $<span id="allocated">0</span></p>
                <p><strong>Unallocated:</strong> $<span id="remaining">0</span></p>
            </div>`;

    setZeroBasedTracking();
}

function setSavingsToggle() {
    const savingsToggle = document.getElementById("savings_toggle");
    const savingsType = document.getElementById("savings_type");

    if(!savingsToggle || !savingsType) {
        console.warn("Savings toggle elements not found - skipping setup");
        return;
    }

    displaySavingsForm(savingsToggle.checked, savingsType);

    savingsToggle.addEventListener("change", () => {
        displaySavingsForm(savingsToggle.checked, savingsType);
    })
}

function displaySavingsForm(isBlock, element) {
    if(isBlock) {
        element.innerHTML = `<p><b>Block Savings</b></p>
        <label class="budget_font">How much do you aim to put into savings this month? ($)</label>
        <input type="number" id="block_amt" placeholder="e.g. 250">`;
    } else {
        element.innerHTML = `<p><b>Percentage Savings</b></p>
        <label class="budget_font">How much do you aim to put into savings this month? (%)</label>
        <input type="number" id="percent_amt" placeholder="e.g. 20">`;
    }
}

// If user hasn't chosen a budget plan, show form for selecting a plan 
function showForm() {
    planForm.style.display = "block";
    planDisplay.style.display = "none";
}

// If user has chosen a budget plan, show budget plan stats
async function showPlan(planType) {
    console.log('showPlan called with:', planType);
    
    planForm.style.display = "none";
    planDisplay.style.display = "block";
    currentPlanTxt.textContent = planType.charAt(0).toUpperCase() + planType.slice(1);
    plan1_section.style.display = "none";
    plan2_section.style.display = "none";
    plan3_section.style.display = "none";

    await new Promise(resolve => setTimeout(resolve, 100));

    if(planType === "50/30/20") {
        console.log('Initializing 50/30/20 plan...');
        plan1_section.style.display = "block";
        
        try {
            await init503020Plan(db, currentUser);
            console.log('50/30/20 plan initialized successfully');
        } catch (error) {
            console.error('Error initializing 50/30/20 plan:', error);
        }
    } else if (planType === "zero-based") {
        plan2_section.style.display = "grid";
    } else if (planType === "pay-yourself-first") {
        console.log('Initializing Pay Yourself First plan...');
        plan3_section.style.display = "grid";
        
        setTimeout(() => {
            loadSavingsProgress(db, currentUser);
            initSavingsGrowthChart(db, currentUser);
        }, 100);
    }
}


planForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    // throws error if user isn't logged in
    if(!currentUser) {
        showMessage("Please log in to save your budget plan", "error");
        return;
    }

    const selectedPlan = planSelect.value;
    const income = parseFloat(enteredIncome.value);

    // throws error if a plan was not selected
    if(!selectedPlan) {
        showMessage("Please select a plan first.", "error");
        return;
    }

    // throws error if income wasn't entered
    if(!income) {
        showMessage("Please enter in your monthly income first.", "error");
        return;
    }

    const userData = {
        budgetPlan: selectedPlan,
        monthlyIncome: income
    };

    // TO DO: log category budgets
    if(selectedPlan === "zero-based") {
        const living_essent = parseFloat(document.getElementById("living_essent")?.value) || 0;
        const financial_oblig = parseFloat(document.getElementById("financial_oblig")?.value) || 0;
        const transportation = parseFloat(document.getElementById("transportation")?.value) || 0;
        const lifestyle = parseFloat(document.getElementById("lifestyle")?.value) || 0;
        const growth_health = parseFloat(document.getElementById("growth_health")?.value) || 0;
        const savings_investments = parseFloat(document.getElementById("savings_investments")?.value) || 0;

        userData.budgetLivingEssentials = living_essent;
        userData.budgetFinancialObligations = financial_oblig;
        userData.budgetTransportation = transportation;
        userData.budgetLifestyle = lifestyle;
        userData.budgetGrowthHealth = growth_health;
        userData.budgetSavingsInvestments = savings_investments;
    }
    // log savings type and amount when applicable
    if(selectedPlan === "pay-yourself-first") {
        const savingsToggle = document.getElementById("savings_toggle");
        const isBlock = savingsToggle ? savingsToggle.checked : false;
        
        if (isBlock) {
            const blockAmt = parseFloat(document.getElementById("block_amt")?.value) || 0;
            userData.savingsType = "block";
            userData.savingsValue = blockAmt;
        } else {
            const percentAmt = parseFloat(document.getElementById("percent_amt")?.value) || 0;
            userData.savingsType = "percentage";
            userData.savingsValue = percentAmt;
        }
    }

    try {
        // Save plan to user's doc
        await setDoc(doc(db, "users", currentUser.uid), userData, {merge: true});
        // merge ensures other fields are kept

        showMessage("Budget plan saved successfully!", "success");
        console.log("Saving plan: ", selectedPlan);     // test to see if successfully saved
        console.log("Monthly Income: ", income);   
        await showPlan(selectedPlan);
    } catch (error) {
        console.log("Error saving budget plan: ", error);
        console.error();
        showMessage("Failed to save budget plan. Try again.", "error");
    }
})

changePlanButton.addEventListener("click", () => {
    showForm();
})

/*TO DO: Use popups instead */
function showMessage(text, type) {
    planMsg.textContent = text;
    planMsg.className = `message ${type}`;
    planMsg.style.display = 'block';
    planMsg.style.fontSize = '20px';
    
    setTimeout(() => {
        planMsg.style.display = 'none';
    }, 4000);
}

