import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/*
    ================================
    50/30/20 BUDGET PLAN FUNCTIONALITY
    ================================
*/

// Chart instances
let pieChart = null;
let stackedBarChart = null;

// Budget allocations (percentages)
const BUDGET_ALLOCATIONS = {
    needs: 50,
    wants: 30,
    savings: 20
};

/**
 * Initialize all charts and progress bars for 50/30/20 plan
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 */
export async function init503020Plan(db, currentUser) {
    console.log('Initializing 50/30/20 plan...');
    
    await loadBudgetData(db, currentUser);
    setupProgressBars();
}

/**
 * Load user's budget data and calculate spending
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 */
async function loadBudgetData(db, currentUser) {
    if (!currentUser) {
        console.log('No current user found');
        return;
    }
    
    try {
        // Get user's monthly income
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            console.log('User document not found');
            return;
        }
        
        const userData = userDoc.data();
        const monthlyIncome = userData.monthlyIncome || 0;
        
        console.log('Monthly Income:', monthlyIncome);
        
        // Calculate budget amounts
        const budgetAmounts = {
            needs: (monthlyIncome * BUDGET_ALLOCATIONS.needs) / 100,
            wants: (monthlyIncome * BUDGET_ALLOCATIONS.wants) / 100,
            savings: (monthlyIncome * BUDGET_ALLOCATIONS.savings) / 100
        };
        
        console.log('Budget Amounts:', budgetAmounts);
        
        // Get current month transactions
        const spending = await calculateCurrentMonthSpending(db, currentUser);
        
        console.log('Spending:', spending);
        
        // Update all visualizations
        updatePieChart(spending, budgetAmounts);
        updateStackedBarChart(db, currentUser, budgetAmounts);
        updateProgressBars(spending, budgetAmounts);
        
    } catch (error) {
        console.error('Error loading budget data:', error);
    }
}

/**
 * Calculate spending for current month by category
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 * @returns {object} Spending amounts by category
 */
async function calculateCurrentMonthSpending(db, currentUser) {
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const querySnapshot = await getDocs(transactionsRef);
    
    console.log('Total transactions found:', querySnapshot.size);
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    console.log('Date range:', startOfMonth, 'to', endOfMonth);
    
    const spending = {
        needs: 0,
        wants: 0,
        savings: 0
    };
    
    let transactionCount = 0;
    
    querySnapshot.forEach((docSnapshot) => {
        const transaction = docSnapshot.data();
        
        console.log('Transaction:', transaction);
        
        // Skip income transactions
        if (transaction.type === 'income') {
            console.log('Skipping income transaction');
            return;
        }
        
        // Convert transaction date
        let transactionDate = convertTransactionDate(transaction.date);
        if (!transactionDate) {
            console.log('Could not convert date for transaction');
            return;
        }
        
        console.log('Transaction date:', transactionDate);
        
        // Only count transactions from current month
        if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
            const amount = parseFloat(transaction.amount) || 0;
            const category = categorizeTransaction(transaction.category);
            
            console.log('Category:', category, 'Amount:', amount);
            
            if (category) {
                spending[category] += amount;
                transactionCount++;
            }
        } else {
            console.log('Transaction outside date range');
        }
    });
    
    console.log('Transactions this month:', transactionCount);
    console.log('Current month spending:', spending);
    return spending;
}

/**
 * Get weekly spending breakdown for current month
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 * @returns {Array} Array of weekly spending objects
 */
async function getWeeklyBreakdown(db, currentUser) {
    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    const querySnapshot = await getDocs(transactionsRef);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Initialize 4 weeks
    const weeks = [
        { needs: 0, wants: 0, savings: 0 },
        { needs: 0, wants: 0, savings: 0 },
        { needs: 0, wants: 0, savings: 0 },
        { needs: 0, wants: 0, savings: 0 }
    ];
    
    querySnapshot.forEach((docSnapshot) => {
        const transaction = docSnapshot.data();
        
        if (transaction.type === 'income') return;
        
        let transactionDate = convertTransactionDate(transaction.date);
        if (!transactionDate) return;
        
        if (transactionDate >= startOfMonth && transactionDate <= now) {
            const dayOfMonth = transactionDate.getDate();
            const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
            const amount = parseFloat(transaction.amount) || 0;
            const category = categorizeTransaction(transaction.category);
            
            if (category) {
                weeks[weekIndex][category] += amount;
            }
        }
    });
    
    return weeks;
}

/**
 * Categorize transaction into needs/wants/savings
 * @param {string} category - Transaction category
 * @returns {string|null} Budget category (needs/wants/savings)
 */
function categorizeTransaction(category) {
    // NEEDS: Essential expenses (50%)
    const needsCategories = ['rent', 'utilities', 'healthcare', 'education', 'transportation', 'insurance', 'groceries', 'loans'];
    
    // SAVINGS: Investments and savings (20%)
    const savingsCategories = ['investment', 'retirement', 'savings', 'emergency'];
    
    // WANTS: Non-essential expenses (30%)
    const wantsCategories = ['shopping', 'entertainment', 'diningout', 'leisuretravel'];
    
    console.log('Categorizing:', category);
    
    if (needsCategories.includes(category)) {
        console.log('→ Categorized as NEEDS');
        return 'needs';
    }
    if (savingsCategories.includes(category)) {
        console.log('→ Categorized as SAVINGS');
        return 'savings';
    }
    if (wantsCategories.includes(category)) {
        console.log('→ Categorized as WANTS');
        return 'wants';
    }
    
    console.log('→ Categorized as WANTS (default)');
    return 'wants'; // Default to wants for uncategorized
}

/**
 * Convert transaction date to Date object
 * @param {*} date - Date in various formats
 * @returns {Date|null} Date object or null
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
 * Update pie chart with current spending
 * @param {object} spending - Current spending by category
 * @param {object} budgetAmounts - Budget allocations
 */
function updatePieChart(spending, budgetAmounts) {
    const canvas = document.getElementById('budgetPieChart');
    if (!canvas) {
        console.log('Pie chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    // Calculate percentages
    const totalIncome = budgetAmounts.needs / (BUDGET_ALLOCATIONS.needs / 100);
    const needsPercent = (spending.needs / totalIncome) * 100;
    const wantsPercent = (spending.wants / totalIncome) * 100;
    const savingsPercent = (spending.savings / totalIncome) * 100;
    
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Needs', 'Wants', 'Savings'],
            datasets: [{
                data: [needsPercent, wantsPercent, savingsPercent],
                backgroundColor: [
                    '#2f3899',  // Blue for needs
                    '#90EE90',  // Light green for wants
                    '#FFB347'   // Orange for savings
                ],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ${value.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update stacked bar chart with weekly breakdown
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 * @param {object} budgetAmounts - Budget allocations
 */
async function updateStackedBarChart(db, currentUser, budgetAmounts) {
    const canvas = document.getElementById('weeklyStackedChart');
    if (!canvas) {
        console.log('Stacked bar chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (stackedBarChart) {
        stackedBarChart.destroy();
    }
    
    const weeklyData = await getWeeklyBreakdown(db, currentUser);
    
    stackedBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
                {
                    label: 'Needs',
                    data: weeklyData.map(w => w.needs),
                    backgroundColor: '#2f3899',
                    borderColor: '#2f3899',
                    borderWidth: 1
                },
                {
                    label: 'Wants',
                    data: weeklyData.map(w => w.wants),
                    backgroundColor: '#90EE90',
                    borderColor: '#90EE90',
                    borderWidth: 1
                },
                {
                    label: 'Savings',
                    data: weeklyData.map(w => w.savings),
                    backgroundColor: '#FFB347',
                    borderColor: '#FFB347',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        },
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: '#e2e8f0'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 10,
                        usePointStyle: true
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
            }
        }
    });
}

/**
 * Setup and initialize progress bars
 */
function setupProgressBars() {
    // Progress bars will be updated by updateProgressBars function
    console.log('Progress bars setup complete');
}

/**
 * Update progress bars with current spending
 * @param {object} spending - Current spending by category
 * @param {object} budgetAmounts - Budget allocations
 */
function updateProgressBars(spending, budgetAmounts) {
    updateSingleProgressBar('needs', spending.needs, budgetAmounts.needs, BUDGET_ALLOCATIONS.needs);
    updateSingleProgressBar('wants', spending.wants, budgetAmounts.wants, BUDGET_ALLOCATIONS.wants);
    updateSingleProgressBar('savings', spending.savings, budgetAmounts.savings, BUDGET_ALLOCATIONS.savings);
}

/**
 * Update a single progress bar
 * @param {string} category - Category name (needs/wants/savings)
 * @param {number} spent - Amount spent
 * @param {number} budget - Budget amount
 * @param {number} targetPercent - Target percentage allocation
 */
function updateSingleProgressBar(category, spent, budget, targetPercent) {
    const progressFill = document.getElementById(`${category}ProgressFill`);
    const percentText = document.getElementById(`${category}Percent`);
    const amountText = document.getElementById(`${category}Amount`);
    const progressContainer = document.getElementById(`${category}Progress`);
    const alertText = document.getElementById(`${category}Alert`);
    
    if (!progressFill || !percentText || !amountText || !progressContainer) {
        console.log(`Progress bar elements for ${category} not found`);
        return;
    }
    
    // Calculate percentage of budget used
    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
    const displayPercent = Math.min(percentUsed, 100);
    
    // Update progress bar
    progressFill.style.width = displayPercent + '%';
    
    // Update text
    const totalIncome = budget / (targetPercent / 100);
    const actualPercent = (spent / totalIncome) * 100;
    percentText.textContent = `${actualPercent.toFixed(0)}%`;
    amountText.textContent = `$${spent.toFixed(2)} of $${budget.toFixed(2)}`;
    
    // Check if over budget
    if (percentUsed > 100) {
        progressContainer.classList.add('over-budget');
        if (alertText) {
            alertText.textContent = 'Over Budget!';
            alertText.style.display = 'block';
        }
    } else {
        progressContainer.classList.remove('over-budget');
        if (alertText) {
            alertText.style.display = 'none';
        }
    }
    
    // Color coding based on percentage
    if (percentUsed > 100) {
        progressFill.style.backgroundColor = '#ef4444'; // Red for over budget
    } else if (percentUsed > 80) {
        progressFill.style.backgroundColor = '#f59e0b'; // Orange for warning
    } else {
        // Default colors
        const colors = {
            needs: '#2f3899',
            wants: '#90EE90',
            savings: '#FFB347'
        };
        progressFill.style.backgroundColor = colors[category];
    }
}

/**
 * Refresh all data and charts
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 */
export async function refresh503020Data(db, currentUser) {
    console.log('Refreshing 50/30/20 data...');
    await loadBudgetData(db, currentUser);
}
