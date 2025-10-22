import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDejcz9F-nLXaUE-fyLTE2FPKjfirBxQys",
  authDomain: "login-form-8b627.firebaseapp.com",
  projectId: "login-form-8b627",
  storageBucket: "login-form-8b627.firebasestorage.app",
  messagingSenderId: "629954794557",
  appId: "1:629954794557:web:51d41ddf80348532c50654",
  measurementId: "G-Q2ZFXF54WX",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const transactionForm = document.getElementById("transactionForm");
const messageDiv = document.getElementById("message");
const dateInput = document.getElementById("date");
const categorySelect = document.getElementById("category");
const typeRadios = document.querySelectorAll('input[name="type"]');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User logged in:", user.uid);
  } else {
    console.log("No user logged in, redirecting...");
    window.location.href = "index.html";
  }
});

dateInput.valueAsDate = new Date();

function updateCategories(type) {
  const incomeCategories = [
    { value: "", text: "Select a category" },
    { value: "salary", text: "Salary" },
    { value: "freelance", text: "Freelance" },
    { value: "investment", text: "Investment" },
    { value: "business", text: "Business" },
    { value: "gift", text: "Gift" },
    { value: "other", text: "Other" },
  ];

  const expenseCategories = [
    { value: "", text: "Select a category" },
    { value: "food", text: "Food & Dining" },
    { value: "transportation", text: "Transportation" },
    { value: "shopping", text: "Shopping" },
    { value: "entertainment", text: "Entertainment" },
    { value: "utilities", text: "Utilities" },
    { value: "healthcare", text: "Healthcare" },
    { value: "education", text: "Education" },
    { value: "rent", text: "Rent" },
    { value: "other", text: "Other" },
  ];

  const categories = type === "income" ? incomeCategories : expenseCategories;
  categorySelect.innerHTML = "";

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.value;
    option.textContent = cat.text;
    categorySelect.appendChild(option);
  });
}

typeRadios.forEach((radio) => {
  radio.addEventListener("change", function () {
    updateCategories(this.value);
  });
});

updateCategories("income");

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = "block";

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 4000);
}

transactionForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!currentUser) {
    showMessage("Please log in to add transactions", "error");
    return;
  }

  const formData = new FormData(this);
  const transaction = Object.fromEntries(formData.entries());

  if (
    !transaction.amount ||
    !transaction.date ||
    !transaction.category ||
    !transaction.description
  ) {
    showMessage("Please fill in all required fields", "error");
    return;
  }

  if (parseFloat(transaction.amount) <= 0) {
    showMessage("Amount must be greater than 0", "error");
    return;
  }

  showMessage("Adding transaction...", "success");

  try {
    const docRef = await addDoc(
      collection(db, "users", currentUser.uid, "transactions"),
      {
        amount: parseFloat(transaction.amount),
        category: transaction.category,
        description: transaction.description,
        notes: transaction.notes || "",
        type: transaction.type,
        date: new Date(transaction.date),
        createdAt: serverTimestamp(),
      }
    );

    console.log("Transaction added with ID:", docRef.id);
    showMessage("Transaction added successfully!", "success");

    setTimeout(() => {
      this.reset();
      dateInput.valueAsDate = new Date();
      updateCategories("income");
    }, 1500);
  } catch (error) {
    console.error("Error adding transaction:", error);
    showMessage("Failed to add transaction. Please try again.", "error");
  }
});

const inputs = document.querySelectorAll("input, select, textarea");
inputs.forEach((input) => {
  input.addEventListener("focus", function () {
    this.parentElement.style.transform = "translateY(-2px)";
  });

  input.addEventListener("blur", function () {
    this.parentElement.style.transform = "translateY(0)";
  });
});
