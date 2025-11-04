// overview-charts.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

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
let chart = null;
let allTransactions = [];
let unsubscribe = null; // To store the listener unsubscribe function

const categoryColors = {
    'food': '#ff6384',
    'transportation': '#36a2eb',
    'entertainment': '#ffce56',
    'shopping': '#4bc0c0',
    'utilities': '#9966ff',
    'healthcare': '#ff9f40',
    'education': '#ff9f40',
    'rent': '#c9cbcf',
    'other': '#95a5a6'
};

const categoryIcons = {
    'food': '🍔',
    'transportation': '🚗',
    'entertainment': '🎬',
    'shopping': '🛍️',
    'utilities': '💡',
    'healthcare': '⚕️',
    'education': '📚',
    'rent': '🏠',
    'other': '📦'
};

const categoryLabels = {
    'food': 'Food & Dining',
    'transportation': 'Transportation',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'utilities': 'Utilities',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'rent': 'Rent',
    'other': 'Other'
};

export function initOverviewCharts() {
    console.log('initOverviewCharts called');
    
    if (!document.getElementById('expenseChart')) {
        console.log('ERROR: Chart canvas not found - make sure overview section is visible');
        return;
    }

    console.log('Chart canvas found, setting up auth listener');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            currentUser = user;
            setupRealtimeListener();
        } else {
            console.log('No user authenticated');
        }
    });
}

function setupRealtimeListener() {
    console.log('Setting up real-time listener for user:', currentUser.uid);
    
    // Unsubscribe from previous listener if it exists
    if (unsubscribe) {
        console.log('Unsubscribing from previous listener');
        unsubscribe();
    }

    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));

    console.log('Starting onSnapshot listener...');

    // Set up real-time listener using onSnapshot
    unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log('🔥 FIREBASE UPDATE DETECTED! Snapshot received with', querySnapshot.size, 'documents');
        
        allTransactions = [];
        querySnapshot.forEach((doc) => {
            allTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log('✅ Transactions loaded:', allTransactions.length);
        console.log('Transaction types:', allTransactions.map(t => t.type));
        
        // Initialize chart if not already created
        if (!chart) {
            console.log('Initializing chart for first time');
            initChart();
        } else {
            console.log('Chart already exists, will update it');
        }
        
        // Update all displays
        console.log('Calling updateDisplay()');
        updateDisplay();
        console.log('✅ Display updated successfully');
    }, (error) => {
        console.error('❌ ERROR listening to transactions:', error);
    });
    
    console.log('Real-time listener setup complete');
}

// Export function to manually refresh (optional)
export function refreshOverviewCharts() {
    if (chart && allTransactions.length > 0) {
        updateDisplay();
    }
}

function initChart() {
    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('expenseChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += '$' + context.parsed.toFixed(2);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            label += ' (' + percentage + '%)';
                            return label;
                        }
                    }
                }
            }
        }
    });
}

window.changeChartType = function(type) {
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    chart.config.type = type;
    
    if (type === 'bar') {
        chart.options.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '$' + value;
                    }
                },
                grid: {
                    color: '#f1f5f9'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        };
        chart.options.plugins.legend.display = false;
    } else {
        chart.options.scales = {};
        chart.options.plugins.legend.display = true;
    }
    
    chart.update();
};

function updateDisplay() {
    updateChart();
    updateStats();
    updateRecentTransactions();
}

function updateChart() {
    console.log('updateChart() called');
    
    if (!chart) {
        console.log('❌ Chart not initialized yet');
        return;
    }

    // Only show expenses in the chart
    const expenses = allTransactions.filter(t => t.type === 'expense');
    console.log('Filtering expenses:', expenses.length, 'expenses out of', allTransactions.length, 'total transactions');
    
    if (expenses.length === 0) {
        console.log('No expenses found, showing empty state');
        // Show empty state for chart
        chart.data.labels = ['No Expenses'];
        chart.data.datasets[0].data = [1];
        chart.data.datasets[0].backgroundColor = ['#e2e8f0'];
        chart.update();
        return;
    }

    const categoryTotals = {};
    
    expenses.forEach(exp => {
        const cat = exp.category || 'other';
        if (!categoryTotals[cat]) {
            categoryTotals[cat] = 0;
        }
        categoryTotals[cat] += exp.amount;
    });
    
    console.log('Category totals:', categoryTotals);
    
    const labels = Object.keys(categoryTotals).map(cat => categoryLabels[cat] || cat);
    const data = Object.values(categoryTotals);
    const colors = Object.keys(categoryTotals).map(cat => categoryColors[cat] || '#95a5a6');
    
    console.log('Updating chart with labels:', labels);
    console.log('Updating chart with data:', data);
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
    
    console.log('✅ Chart updated successfully');
}

function updateStats() {
    const expenses = allTransactions.filter(t => t.type === 'expense');
    const income = allTransactions.filter(t => t.type === 'income');
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const balance = totalIncome - totalExpenses;
    
    // Update stat values
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalBalanceEl = document.getElementById('totalBalance');
    const transactionCountEl = document.getElementById('transactionCount');
    
    if (totalExpensesEl) totalExpensesEl.textContent = '$' + totalExpenses.toFixed(2);
    if (totalIncomeEl) totalIncomeEl.textContent = '$' + totalIncome.toFixed(2);
    if (totalBalanceEl) totalBalanceEl.textContent = '$' + balance.toFixed(2);
    if (transactionCountEl) transactionCountEl.textContent = allTransactions.length;
    
    // Find top expense category
    const categoryTotals = {};
    expenses.forEach(exp => {
        const cat = exp.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topCategoryEl = document.getElementById('topCategory');
    const topCategoryAmountEl = document.getElementById('topCategoryAmount');
    
    if (topCategory && topCategoryEl && topCategoryAmountEl) {
        const categoryIcon = categoryIcons[topCategory[0]] || '📦';
        const categoryLabel = categoryLabels[topCategory[0]] || topCategory[0];
        topCategoryEl.textContent = categoryIcon + ' ' + categoryLabel;
        topCategoryAmountEl.textContent = '$' + topCategory[1].toFixed(2);
    } else if (topCategoryEl && topCategoryAmountEl) {
        topCategoryEl.textContent = '—';
        topCategoryAmountEl.textContent = '$0.00';
    }
}

function updateRecentTransactions() {
    const listContainer = document.getElementById('recentTransactionsList');
    
    if (!listContainer) return;
    
    if (allTransactions.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">No transactions yet. Start tracking your finances!</div>
            </div>
        `;
        return;
    }
    
    // Show only the 5 most recent transactions
    const recentTransactions = allTransactions.slice(0, 5);
    
    listContainer.innerHTML = recentTransactions.map(trans => {
        const date = trans.date.toDate ? trans.date.toDate() : new Date(trans.date);
        const category = trans.category || 'other';
        const icon = categoryIcons[category] || '📦';
        const label = categoryLabels[category] || category;
        const color = categoryColors[category] || '#95a5a6';
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon" style="background-color: ${color}20; color: ${color}">
                    ${icon}
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${label}</div>
                    <div class="transaction-date">${formatDate(date)}</div>
                </div>
                <div class="transaction-amount ${trans.type}">
                    ${trans.type === 'income' ? '+' : '-'}$${trans.amount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});
