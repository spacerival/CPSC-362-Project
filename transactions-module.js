// transactions-module.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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

let allTransactions = [];
let currentUser = null;
let isInitialized = false;

export function initTransactions() {
    if (isInitialized) {
        return;
    }
    
    isInitialized = true;
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadTransactions();
        }
    });
}

async function loadTransactions() {
    try {
        const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
        const q = query(transactionsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        allTransactions = [];
        querySnapshot.forEach((doc) => {
            allTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayTransactions(allTransactions);
        populateCategoryFilter();
        setupFilters();
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionList').innerHTML = 
            '<div class="empty-state"><h3>Error Loading Transactions</h3><p>Please try refreshing the page.</p></div>';
    }
}

function displayTransactions(transactions) {
    const listElement = document.getElementById('transactionList');

    if (transactions.length === 0) {
        listElement.innerHTML = `
            <div class="empty-state">
                <h3>No Transactions Yet</h3>
                <p>Start tracking your finances by adding your first transaction!</p>
                <a href="transaction.html" class="btn btn-primary">+ Add Transaction</a>
            </div>
        `;
        return;
    }

    listElement.innerHTML = transactions.map(transaction => {
        const date = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <span class="transaction-type-badge ${transaction.type}">${transaction.type}</span>
                    <div class="transaction-category">${formatCategory(transaction.category)}</div>
                    <div class="transaction-description">${transaction.description}</div>
                    ${transaction.notes ? `<div class="transaction-description" style="font-style: italic;">${transaction.notes}</div>` : ''}
                    <div class="transaction-date">${formattedDate}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

function formatCategory(category) {
    const categoryMap = {
        'food': 'Food & Dining',
        'transportation': 'Transportation',
        'shopping': 'Shopping',
        'entertainment': 'Entertainment',
        'utilities': 'Utilities',
        'healthcare': 'Healthcare',
        'education': 'Education',
        'rent': 'Rent',
        'salary': 'Salary',
        'freelance': 'Freelance',
        'investment': 'Investment',
        'business': 'Business',
        'gift': 'Gift',
        'other': 'Other'
    };
    return categoryMap[category] || category;
}

function populateCategoryFilter() {
    const categories = [...new Set(allTransactions.map(t => t.category))];
    const filterCategory = document.getElementById('filterCategory');
    
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = formatCategory(cat);
        filterCategory.appendChild(option);
    });
}

function setupFilters() {
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const sortBy = document.getElementById('sortBy');
    
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (filterCategory) filterCategory.addEventListener('change', applyFilters);
    if (sortBy) sortBy.addEventListener('change', applyFilters);
}

function applyFilters() {
    const typeFilter = document.getElementById('filterType').value;
    const categoryFilter = document.getElementById('filterCategory').value;
    const sortBy = document.getElementById('sortBy').value;

    let filtered = [...allTransactions];

    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }

    filtered.sort((a, b) => {
        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);

        switch (sortBy) {
            case 'date-asc':
                return dateA - dateB;
            case 'date-desc':
                return dateB - dateA;
            case 'amount-asc':
                return a.amount - b.amount;
            case 'amount-desc':
                return b.amount - a.amount;
            default:
                return dateB - dateA;
        }
    });

    displayTransactions(filtered);
}