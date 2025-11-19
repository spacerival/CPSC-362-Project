import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/*
    ================================
    ZERO-BASED BUDGET PLAN FUNCTIONALITY
    ================================
*/

// Chart instances
let incomeVsExpensesChart = null;
let categoryBreakdownChart = null;

// Current time period for income vs expenses chart
let currentTimePeriod = 'month';

// Category icons mapping
const categoryIcons = {
    'Living Essentials': '🏠',
    'Financial Obligations': '💳',
    'Transportation': '🚗',
    'Lifestyle': '🎉',
    'Growth & Health': '🌱',
    'Savings & Investments': '💰'
};

// Category to transaction category mapping
const categoryMapping = {
    'Living Essentials': ['rent', 'utilities', 'groceries'],
    'Financial Obligations': ['loans', 'insurance'],
    'Transportation': ['transportation'],
    'Lifestyle': ['shopping', 'entertainment', 'diningout', 'leisuretravel'],
    'Growth & Health': ['healthcare', 'education'],
    'Savings & Investments': ['savings', 'investment', 'retirement', 'emergency']
};

/**
 * Initialize Zero-Based Budget Plan
 */
export async function initZeroBasedPlan(db, currentUser) {
    console.log('Initializing Zero-Based Budget Plan...');
    
    await loadBudgetData(db, currentUser);
    setupEventListeners(db, currentUser);
}

/**
 * Load budget data and display
 */
async function loadBudgetData(db, currentUser) {
    if (!currentUser) {
        console.log('No current user found');
        return;
    }
    
    try {
        // Get user's budget data
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            console.log('User document not found');
            return;
        }
        
        const userData = userDoc.data();
        const budgetData = {
            'Living Essentials': userData.budgetLivingEssentials || 0,
            'Financial Obligations': userData.budgetFinancialObligations || 0,
            'Transportation': userData.budgetTransportation || 0,
            'Lifestyle': userData.budgetLifestyle || 0,
            'Growth & Health': userData.budgetGrowthHealth || 0,
            'Savings & Investments': userData.budgetSavingsInvestments || 0
        };
        
        console.log('Budget data:', budgetData);
        
        // Get actual expenses/savings from transactions
        const actualData = await calculateActualsByCategory(db, currentUser);
        
        console.log('Actual data:', actualData);
        
        // Update all displays
        updateSummaryCards(budgetData, actualData);
        updateBudgetTable(budgetData, actualData);
        await updateIncomeVsExpensesChart(db, currentUser, currentTimePeriod);
        updateCategoryBreakdownChart(budgetData, actualData);
        
    } catch (error) {
        console.error('Error loading budget data:', error);
    }
}

/**
 * Calculate actual spending/savings by category from transactions
 * For Savings & Investments: we track contributions (positive amount)
 * For other categories: we track expenses (negative impact on budget)
 */
async function calculateActualsByCategory(db, currentUser) {
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const querySnapshot = await getDocs(transactionsRef);
    
    const actuals = {
        'Living Essentials': 0,
        'Financial Obligations': 0,
        'Transportation': 0,
        'Lifestyle': 0,
        'Growth & Health': 0,
        'Savings & Investments': 0
    };
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    querySnapshot.forEach((docSnapshot) => {
        const transaction = docSnapshot.data();
        
        // Convert transaction date
        let transactionDate = convertTransactionDate(transaction.date);
        if (!transactionDate) return;
        
        // Only count transactions from current month
        if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
            const amount = parseFloat(transaction.amount) || 0;
            const category = transaction.category;
            
            // Map transaction category to budget category
            for (const [budgetCat, transactionCats] of Object.entries(categoryMapping)) {
                if (transactionCats.includes(category)) {
                    // For Savings & Investments, we track it regardless of type
                    // (both income type "savings" and expense type "savings" contribute)
                    if (budgetCat === 'Savings & Investments') {
                        actuals[budgetCat] += amount;
                    } else {
                        // For other categories, only count expenses
                        if (transaction.type === 'expense') {
                            actuals[budgetCat] += amount;
                        }
                    }
                    break;
                }
            }
        }
    });
    
    return actuals;
}

/**
 * Convert transaction date to Date object
 */
function convertTransactionDate(date) {
    if (date && date.toDate) {
        return date.toDate();
    } else if (date instanceof Date) {
        return date;
    } else if (typeof date === 'string') {
        return new Date(date);
    }
    return null;
}

/**
 * Update summary cards
 */
function updateSummaryCards(budgetData, actualData) {
    // Calculate total budget (everything allocated)
    const totalBudget = Object.values(budgetData).reduce((sum, val) => sum + val, 0);
    
    // Calculate total expenses (everything except savings)
    const totalExpenses = Object.entries(actualData)
        .filter(([category]) => category !== 'Savings & Investments')
        .reduce((sum, [, val]) => sum + val, 0);
    
    // Remaining = Total Budget - Total Expenses
    // Note: Savings are part of the budget but not an "expense"
    const remaining = totalBudget - totalExpenses;
    
    const totalBudgetEl = document.getElementById('totalBudgetValue');
    const totalExpensesEl = document.getElementById('totalExpensesValue');
    const remainingEl = document.getElementById('remainingValue');
    
    if (totalBudgetEl) totalBudgetEl.textContent = '$' + totalBudget.toFixed(2);
    if (totalExpensesEl) totalExpensesEl.textContent = '$' + totalExpenses.toFixed(2);
    
    if (remainingEl) {
        remainingEl.textContent = '$' + Math.abs(remaining).toFixed(2);
        remainingEl.className = 'card-value ' + (remaining >= 0 ? 'positive' : 'negative');
    }
}

/**
 * Update budget table
 */
function updateBudgetTable(budgetData, actualData) {
    const tableBody = document.getElementById('budgetTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    let totalBudget = 0;
    let totalActual = 0;
    let totalDifference = 0;
    
    for (const [category, budget] of Object.entries(budgetData)) {
        const actual = actualData[category] || 0;
        const difference = budget - actual;
        
        totalBudget += budget;
        totalActual += actual;
        totalDifference += difference;
        
        // Special handling for Savings & Investments
        let status = 'on-track';
        let statusText = 'On Track';
        let differenceDisplay = difference;
        
        if (category === 'Savings & Investments') {
            // For savings: positive difference means you're UNDER your goal (bad)
            // negative difference means you EXCEEDED your goal (good)
            if (budget === 0 && actual === 0) {
                status = 'perfect';
                statusText = 'No Goal Set';
            } else if (actual >= budget) {
                status = 'perfect';
                statusText = 'Goal Met! 🎉';
            } else if (actual >= budget * 0.9) {
                status = 'on-track';
                statusText = 'Almost There!';
            } else if (actual >= budget * 0.5) {
                status = 'warning';
                statusText = 'Behind Goal';
            } else {
                status = 'over-budget';
                statusText = 'Far Behind';
            }
        } else {
            // For expenses: normal logic
            if (actual === 0 && budget === 0) {
                status = 'perfect';
                statusText = 'No Budget';
            } else if (actual > budget) {
                status = 'over-budget';
                statusText = 'Over Budget';
            } else if (actual > budget * 0.9) {
                status = 'warning';
                statusText = 'Warning';
            } else if (actual === budget) {
                status = 'perfect';
                statusText = 'Perfect';
            }
        }
        
        const row = document.createElement('tr');
        
        // For Savings & Investments, show "Saved" instead of "Expenses"
        const actualLabel = category === 'Savings & Investments' ? 
            `<td class="budget-value" style="color: #28a745;">$${actual.toFixed(2)}</td>` :
            `<td class="expense-value">$${actual.toFixed(2)}</td>`;
        
        // For Savings & Investments, flip the difference color logic
        const differenceClass = category === 'Savings & Investments' ?
            (difference <= 0 ? 'positive' : 'negative') :
            (difference >= 0 ? 'positive' : 'negative');
        
        row.innerHTML = `
            <td>
                <div class="category-name">
                    <span class="category-icon">${categoryIcons[category] || '📦'}</span>
                    ${category}
                </div>
            </td>
            <td class="budget-value">$${budget.toFixed(2)}</td>
            ${actualLabel}
            <td class="difference-value ${differenceClass}">
                ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}
            </td>
            <td>
                <span class="status-badge ${status}">${statusText}</span>
            </td>
        `;
        
        tableBody.appendChild(row);
    }
    
    // Update totals in footer
    const totalBudgetCell = document.getElementById('totalBudgetCell');
    const totalExpensesCell = document.getElementById('totalExpensesCell');
    const totalDifferenceCell = document.getElementById('totalDifferenceCell');
    
    if (totalBudgetCell) totalBudgetCell.textContent = '$' + totalBudget.toFixed(2);
    if (totalExpensesCell) totalExpensesCell.textContent = '$' + totalActual.toFixed(2);
    if (totalDifferenceCell) {
        totalDifferenceCell.textContent = (totalDifference >= 0 ? '+' : '') + '$' + totalDifference.toFixed(2);
        totalDifferenceCell.style.color = totalDifference >= 0 ? '#28a745' : '#dc3545';
    }
}

/**
 * Update Income vs Expenses Chart
 */
async function updateIncomeVsExpensesChart(db, currentUser, period) {
    const canvas = document.getElementById('incomeVsExpensesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (incomeVsExpensesChart) {
        incomeVsExpensesChart.destroy();
    }
    
    const data = await getIncomeVsExpensesData(db, currentUser, period);
    
    incomeVsExpensesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Income',
                    data: data.income,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#28a745'
                },
                {
                    label: 'Expenses',
                    data: data.expenses,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#dc3545'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    },
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Get income vs expenses data for chart
 * Note: Expenses exclude savings contributions
 */
async function getIncomeVsExpensesData(db, currentUser, period) {
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const querySnapshot = await getDocs(transactionsRef);
    
    const now = new Date();
    let labels = [];
    let incomeData = [];
    let expensesData = [];
    
    if (period === 'week') {
        // Last 7 days
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        incomeData = new Array(7).fill(0);
        expensesData = new Array(7).fill(0);
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        querySnapshot.forEach((docSnapshot) => {
            const transaction = docSnapshot.data();
            const transactionDate = convertTransactionDate(transaction.date);
            
            if (transactionDate && transactionDate >= startOfWeek) {
                const dayIndex = transactionDate.getDay();
                const amount = parseFloat(transaction.amount) || 0;
                const category = transaction.category;
                
                // Check if it's a savings category
                const isSavings = ['savings', 'investment', 'retirement', 'emergency'].includes(category);
                
                if (transaction.type === 'income') {
                    incomeData[dayIndex] += amount;
                } else if (!isSavings) {
                    // Only count non-savings expenses
                    expensesData[dayIndex] += amount;
                }
            }
        });
        
    } else if (period === 'month') {
        // Last 4 weeks
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        incomeData = new Array(4).fill(0);
        expensesData = new Array(4).fill(0);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        querySnapshot.forEach((docSnapshot) => {
            const transaction = docSnapshot.data();
            const transactionDate = convertTransactionDate(transaction.date);
            
            if (transactionDate && transactionDate >= startOfMonth && transactionDate <= now) {
                const dayOfMonth = transactionDate.getDate();
                const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
                const amount = parseFloat(transaction.amount) || 0;
                const category = transaction.category;
                
                const isSavings = ['savings', 'investment', 'retirement', 'emergency'].includes(category);
                
                if (transaction.type === 'income') {
                    incomeData[weekIndex] += amount;
                } else if (!isSavings) {
                    expensesData[weekIndex] += amount;
                }
            }
        });
        
    } else if (period === 'year') {
        // Last 12 months
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        incomeData = new Array(12).fill(0);
        expensesData = new Array(12).fill(0);
        
        const currentYear = now.getFullYear();
        
        querySnapshot.forEach((docSnapshot) => {
            const transaction = docSnapshot.data();
            const transactionDate = convertTransactionDate(transaction.date);
            
            if (transactionDate && transactionDate.getFullYear() === currentYear) {
                const monthIndex = transactionDate.getMonth();
                const amount = parseFloat(transaction.amount) || 0;
                const category = transaction.category;
                
                const isSavings = ['savings', 'investment', 'retirement', 'emergency'].includes(category);
                
                if (transaction.type === 'income') {
                    incomeData[monthIndex] += amount;
                } else if (!isSavings) {
                    expensesData[monthIndex] += amount;
                }
            }
        });
    }
    
    return { labels, income: incomeData, expenses: expensesData };
}

/**
 * Update Category Breakdown Chart
 */
function updateCategoryBreakdownChart(budgetData, actualData) {
    const canvas = document.getElementById('categoryBreakdownChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (categoryBreakdownChart) {
        categoryBreakdownChart.destroy();
    }
    
    const categories = Object.keys(budgetData);
    const budgetValues = Object.values(budgetData);
    const actualValues = categories.map(cat => actualData[cat] || 0);
    
    categoryBreakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: 'Budget',
                    data: budgetValues,
                    backgroundColor: '#2f3899',
                    borderColor: '#2f3899',
                    borderWidth: 1
                },
                {
                    label: 'Actual',
                    data: actualValues,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    },
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners(db, currentUser) {
    // Time period selector
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            periodButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTimePeriod = this.dataset.period;
            await updateIncomeVsExpensesChart(db, currentUser, currentTimePeriod);
        });
    });
    
    // Chart type toggle
    const toggleButtons = document.querySelectorAll('.chart-type-toggle .toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            toggleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const chartType = this.dataset.type;
            
            if (categoryBreakdownChart) {
                categoryBreakdownChart.config.type = chartType;
                
                if (chartType === 'pie') {
                    categoryBreakdownChart.options.scales = {};
                    categoryBreakdownChart.options.plugins.legend.position = 'right';
                } else {
                    categoryBreakdownChart.options.scales = {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value;
                                }
                            }
                        }
                    };
                    categoryBreakdownChart.options.plugins.legend.position = 'top';
                }
                
                categoryBreakdownChart.update();
            }
        });
    });
}

/**
 * Refresh Zero-Based Budget data
 */
export async function refreshZeroBasedData(db, currentUser) {
    console.log('Refreshing Zero-Based Budget data...');
    await loadBudgetData(db, currentUser);
}