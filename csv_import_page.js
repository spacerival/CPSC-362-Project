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

let currentUser = null;
let parsedTransactions = [];

// Category type mapping (essential/needs, wants, savings)
const categoryTypes = {
  // Essentials/Needs
  rent: "essential",
  utilities: "essential",
  healthcare: "essential",
  education: "essential",
  transportation: "essential",
  insurance: "essential",
  groceries: "essential",
  loans: "essential",

  // Wants
  shopping: "want",
  entertainment: "want",
  diningout: "want",
  leisuretravel: "want",

  // Savings
  savings: "savings",
  investment: "savings",
  retirement: "savings",
  emergency: "savings",

  // Income categories and other
  salary: null,
  freelance: null,
  business: null,
  gift: null,
  other: null,
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User logged in:", user.uid);
  } else {
    console.log("No user logged in, redirecting...");
    window.location.href = "login_index.html";
  }
});

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const uploadMessage = document.getElementById("uploadMessage");
const previewSection = document.getElementById("previewSection");
const previewList = document.getElementById("previewList");
const previewStats = document.getElementById("previewStats");
const importBtn = document.getElementById("importBtn");

uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragging");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragging");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

function showMessage(text, type) {
  uploadMessage.textContent = text;
  uploadMessage.className = `message ${type}`;
  uploadMessage.style.display = "block";

  setTimeout(() => {
    uploadMessage.style.display = "none";
  }, 5000);
}

function handleFile(file) {
  if (!file.name.endsWith(".csv")) {
    showMessage("Please upload a CSV file", "error");
    return;
  }

  showMessage("Processing file...", "info");

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: function (results) {
      processCSVData(results.data);
    },
    error: function (error) {
      showMessage("Error parsing CSV: " + error.message, "error");
    },
  });
}

function processCSVData(data) {
  const validCategories = [
    "rent",
    "utilities",
    "healthcare",
    "education",
    "transportation",
    "insurance",
    "groceries",
    "loans",
    "shopping",
    "entertainment",
    "diningout",
    "leisuretravel",
    "savings",
    "investment",
    "retirement",
    "emergency",
    "salary",
    "freelance",
    "business",
    "gift",
    "other",
  ];

  parsedTransactions = data.map((row, index) => {
    const errors = [];

    const type = row.type?.toLowerCase().trim();
    if (!type || (type !== "income" && type !== "expense")) {
      errors.push('Invalid type (must be "income" or "expense")');
    }

    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push("Invalid amount");
    }

    const category = row.category?.toLowerCase().trim();
    if (!category || !validCategories.includes(category)) {
      errors.push("Invalid category");
    }

    const description = row.description?.trim();
    if (!description) {
      errors.push("Description is required");
    }

    let date = null;
    if (row.date) {
      date = new Date(row.date);
      if (isNaN(date.getTime())) {
        errors.push("Invalid date format (use YYYY-MM-DD)");
      }
    } else {
      errors.push("Date is required");
    }

    return {
      type: type,
      amount: amount,
      category: category,
      categoryType: categoryTypes[category] || null,
      description: description,
      notes: row.notes?.trim() || "",
      date: date,
      errors: errors,
      valid: errors.length === 0,
    };
  });

  displayPreview();
}

function displayPreview() {
  const validCount = parsedTransactions.filter((t) => t.valid).length;
  const errorCount = parsedTransactions.length - validCount;
  const totalIncome = parsedTransactions
    .filter((t) => t.valid && t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = parsedTransactions
    .filter((t) => t.valid && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  previewStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Total Transactions</div>
            <div class="stat-value">${parsedTransactions.length}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Valid</div>
            <div class="stat-value" style="color: #28a745;">${validCount}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Errors</div>
            <div class="stat-value" style="color: #dc3545;">${errorCount}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Total Income</div>
            <div class="stat-value" style="color: #28a745;">$${totalIncome.toFixed(
              2
            )}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Total Expenses</div>
            <div class="stat-value" style="color: #dc3545;">$${totalExpense.toFixed(
              2
            )}</div>
        </div>
    `;

  previewList.innerHTML = parsedTransactions
    .map((t, index) => {
      const errorClass = t.valid ? "" : "error";
      const dateStr =
        t.date && !isNaN(t.date.getTime())
          ? t.date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Invalid Date";

      return `
            <div class="transaction-item ${errorClass}">
                <div class="transaction-info">
                    <span class="transaction-type-badge ${t.type}">${
        t.type || "unknown"
      }</span>
                    <div class="transaction-category">${formatCategory(
                      t.category
                    )}</div>
                    <div class="transaction-description">${
                      t.description || "No description"
                    }</div>
                    ${
                      t.notes
                        ? `<div class="transaction-description" style="font-style: italic;">${t.notes}</div>`
                        : ""
                    }
                    <div class="transaction-date">${dateStr}</div>
                    ${
                      t.errors.length > 0
                        ? `<div class="error-text">⚠️ ${t.errors.join(
                            ", "
                          )}</div>`
                        : ""
                    }
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === "income" ? "+" : "-"}$${
        isNaN(t.amount) ? "0.00" : t.amount.toFixed(2)
      }
                </div>
            </div>
        `;
    })
    .join("");

  previewSection.style.display = "block";
  importBtn.disabled = validCount === 0;

  if (validCount > 0) {
    showMessage(
      `Found ${validCount} valid transaction(s) ready to import`,
      "success"
    );
  } else {
    showMessage(
      "No valid transactions found. Please check the errors above.",
      "error"
    );
  }
}

function formatCategory(category) {
  const categoryMap = {
    // Essentials/Needs
    rent: "Rent",
    utilities: "Utilities",
    healthcare: "Healthcare",
    education: "Education",
    transportation: "Transportation",
    insurance: "Insurance",
    groceries: "Groceries",
    loans: "Loans/Debt",
    // Wants
    shopping: "Shopping",
    entertainment: "Entertainment",
    diningout: "Dining Out",
    leisuretravel: "Leisure Travel",
    // Savings
    savings: "Savings Account",
    investment: "Investment",
    retirement: "Retirement",
    emergency: "Emergency Fund",
    // Income
    salary: "Salary",
    freelance: "Freelance",
    business: "Business",
    gift: "Gift",
    other: "Other",
  };
  return categoryMap[category] || category;
}

window.cancelImport = function () {
  previewSection.style.display = "none";
  parsedTransactions = [];
  fileInput.value = "";
  showMessage("Import cancelled", "info");
};

window.importTransactions = async function () {
  if (!currentUser) {
    showMessage("Please log in to import transactions", "error");
    return;
  }

  const validTransactions = parsedTransactions.filter((t) => t.valid);
  if (validTransactions.length === 0) {
    showMessage("No valid transactions to import", "error");
    return;
  }

  importBtn.disabled = true;
  importBtn.textContent = "Importing...";
  showMessage(
    `Importing ${validTransactions.length} transaction(s)...`,
    "info"
  );

  let successCount = 0;
  let errorCount = 0;

  for (const transaction of validTransactions) {
    try {
      await addDoc(collection(db, "users", currentUser.uid, "transactions"), {
        amount: transaction.amount,
        category: transaction.category,
        categoryType: transaction.categoryType,
        description: transaction.description,
        notes: transaction.notes,
        type: transaction.type,
        date: transaction.date,
        createdAt: serverTimestamp(),
      });
      successCount++;
    } catch (error) {
      console.error("Error importing transaction:", error);
      errorCount++;
    }
  }

  importBtn.textContent = "Import Transactions";

  if (successCount > 0) {
    showMessage(
      `Successfully imported ${successCount} transaction(s)${
        errorCount > 0 ? ` (${errorCount} failed)` : ""
      }. Redirecting...`,
      "success"
    );
    setTimeout(() => {
      window.location.href = "dashboard.html#transactions";
    }, 2000);
  } else {
    showMessage("Failed to import transactions. Please try again.", "error");
    importBtn.disabled = false;
  }
};
