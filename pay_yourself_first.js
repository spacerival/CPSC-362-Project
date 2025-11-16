import { doc, getDoc, getDocs, collection} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/*
    ================================
    PAY-YOURSELF-FIRST PROGRESS RING
    ================================
*/

let progressCircle = null;
let progressTooltip = null;
const CIRCLE_RADIUS = 100;
const CIRCLE_CIRCUMFERENCE = CIRCLE_RADIUS * 2 * Math.PI;

/**
 * Initialize progress ring elements
 */
function initProgressRing() {
    progressCircle = document.getElementById('progressCircle');
    progressTooltip = document.getElementById('tooltip');
    
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
        progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    }
}

/**
 * Set the progress of the savings goal ring
 * @param {number} percent - Progress percentage (0-100)
 */
function setProgress(percent) {
    if (!progressCircle) {
        initProgressRing();
    }
    
    const validPercent = Math.max(0, Math.min(100, percent));
    const offset = CIRCLE_CIRCUMFERENCE - (validPercent / 100) * CIRCLE_CIRCUMFERENCE;
    
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = offset;
    }
    
    if (progressTooltip) {
        progressTooltip.textContent = `${validPercent.toFixed(1)}% Complete`;
    }
}

/**
 * Calculate progress based on saved amount and goal
 * @param {number} savedAmount - Amount saved so far
 * @param {number} goalAmount - Total savings goal
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(savedAmount, goalAmount) {
    if (goalAmount <= 0) return 0;
    const percent = (savedAmount / goalAmount) * 100;
    return Math.min(100, percent);
}

/**
 * Calculate total savings from current month only
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 * @returns {number} Total amount saved this month
 */
export async function calculateTotalSavings(db, currentUser) {
    if (!currentUser) {
        console.log("No current user found");
        return 0;
    }
    
    console.log("Calculating total savings for user (current month only):", currentUser.uid);
    
    try {
        const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
        console.log("Transactions reference created for subcollection");
        
        const querySnapshot = await getDocs(transactionsRef);
        console.log("Query executed, found", querySnapshot.size, "documents");
        
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        console.log("Current month range:", startOfMonth, "to", endOfMonth);
        
        let totalSaved = 0;
        let transactionsThisMonth = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            const transaction = docSnapshot.data();
            
            // Filter for savings categories
            if (transaction.category === "savings" || 
                transaction.category === "investment" || 
                transaction.category === "retirement" || 
                transaction.category === "emergency") {
                
                // Convert transaction date
                let transactionDate;
                
                if (transaction.date && transaction.date.toDate) {
                    transactionDate = transaction.date.toDate();
                } else if (transaction.date instanceof Date) {
                    transactionDate = transaction.date;
                } else if (typeof transaction.date === 'string') {
                    transactionDate = new Date(transaction.date);
                } else {
                    console.warn('Unknown date format for transaction:', transaction);
                    return; // Skip this transaction
                }
                
                // Only count transactions from current month
                if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
                    console.log("Savings transaction from this month found:", transaction);
                    const amount = parseFloat(transaction.amount) || 0;
                    totalSaved += amount;
                    transactionsThisMonth++;
                }
            }
        });
        
        console.log(`Total saved this month: ${totalSaved} (from ${transactionsThisMonth} transactions)`);
        return totalSaved;
    } catch (error) {
        console.error("Error calculating total savings:", error);
        console.error("Error details:", error.message);
        return 0;
    }
}

/**
 * Load and display savings progress for Pay Yourself First plan
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 */
export async function loadSavingsProgress(db, currentUser) {
    if (!currentUser) return;
    
    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const monthlyIncome = userData.monthlyIncome || 0;
            const savingsType = userData.savingsType;
            const savingsValue = userData.savingsValue || 0;
            
            // Calculate goal amount
            let goalAmount = 0;
            if (savingsType === 'percentage') {
                goalAmount = (monthlyIncome * savingsValue) / 100;
            } else {
                goalAmount = savingsValue;
            }
            
            // Get total saved from current month only
            const totalSaved = await calculateTotalSavings(db, currentUser);
            
            // Update display
            const goalDisplay = document.getElementById('goal_display');
            const savedDisplay = document.getElementById('saved_display');
            
            if (goalDisplay) {
                if (savingsType === 'percentage') {
                    goalDisplay.textContent = `${savingsValue}% ($${goalAmount.toFixed(2)})`;
                } else {
                    goalDisplay.textContent = `$${goalAmount.toFixed(2)}`;
                }
            }
            
            if (savedDisplay) {
                savedDisplay.textContent = `$${totalSaved.toFixed(2)}`;
            }
            
            // Calculate and set progress
            const progress = calculateProgress(totalSaved, goalAmount);
            initProgressRing();
            setProgress(progress);
            
            console.log(`Goal: $${goalAmount}, Saved: $${totalSaved}, Progress: ${progress.toFixed(1)}%`);
        }
    } catch (error) {
        console.error("Error loading savings progress:", error);
    }
}

// ============================================
// SAVINGS GROWTH CHART FUNCTIONALITY
// ============================================

let savingsGrowthChart = null;
let currentChartPeriod = 'weekly';

/**
 * Create green gradient for chart fill
 */
function createSavingsGradient(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(67, 181, 129, 0.4)');
    gradient.addColorStop(0.5, 'rgba(67, 181, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(67, 181, 129, 0.0)');
    return gradient;
}

/**
 * Setup toggle button event listeners
 */
function setupChartToggleButtons(db, currentUser) {
    const toggleButtons = document.querySelectorAll('.time-toggle .toggle-btn');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update chart period
            currentChartPeriod = this.dataset.period;
            console.log('Switching to period:', currentChartPeriod);
            loadSavingsGrowthData(db, currentUser, currentChartPeriod);
        });
    });
}

/**
 * Get empty labels for a period (when no data exists)
 */
function getEmptyLabels(period) {
    if (period === 'weekly') {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    } else if (period === 'monthly') {
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    } else if (period === 'yearly') {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    return [];
}

/**
 * Aggregate transactions by time period
 */
function aggregateByPeriod(transactions, period) {
    transactions.sort((a, b) => a.date - b.date);
    
    const now = new Date();
    let labels = [];
    let data = [];

    if (period === 'weekly') {
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        data = new Array(7).fill(0);
        
        const today = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - today);
        startOfWeek.setHours(0, 0, 0, 0);
        
        let priorTotal = 0;
        transactions.forEach(t => {
            if (t.date < startOfWeek) {
                priorTotal += t.amount;
            }
        });
        
        transactions.forEach(t => {
            if (t.date >= startOfWeek && t.date <= now) {
                const dayIndex = t.date.getDay();
                data[dayIndex] += t.amount;
            }
        });
        
        let cumulativeTotal = priorTotal;
        for (let i = 0; i < data.length; i++) {
            cumulativeTotal += data[i];
            data[i] = cumulativeTotal;
        }
        
    } else if (period === 'monthly') {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        data = new Array(4).fill(0);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        let priorTotal = 0;
        transactions.forEach(t => {
            if (t.date < startOfMonth) {
                priorTotal += t.amount;
            }
        });
        
        transactions.forEach(t => {
            if (t.date >= startOfMonth && t.date <= now) {
                const dayOfMonth = t.date.getDate();
                const weekIndex = Math.floor((dayOfMonth - 1) / 7);
                if (weekIndex < 4) {
                    data[weekIndex] += t.amount;
                }
            }
        });
        
        let cumulativeTotal = priorTotal;
        for (let i = 0; i < data.length; i++) {
            cumulativeTotal += data[i];
            data[i] = cumulativeTotal;
        }
        
    } else if (period === 'yearly') {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        data = new Array(12).fill(0);
        
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        
        let priorTotal = 0;
        transactions.forEach(t => {
            if (t.date < startOfYear) {
                priorTotal += t.amount;
            }
        });
        
        transactions.forEach(t => {
            if (t.date.getFullYear() === currentYear) {
                const monthIndex = t.date.getMonth();
                data[monthIndex] += t.amount;
            }
        });
        
        let cumulativeTotal = priorTotal;
        for (let i = 0; i < data.length; i++) {
            cumulativeTotal += data[i];
            data[i] = cumulativeTotal;
        }
    }

    return { labels, data };
}

/**
 * Update the savings growth chart with new data
 */
function updateSavingsGrowthChart(aggregatedData) {
    if (!savingsGrowthChart) {
        console.log('Chart not initialized yet');
        return;
    }
    
    savingsGrowthChart.data.labels = aggregatedData.labels;
    savingsGrowthChart.data.datasets[0].data = aggregatedData.data;
    
    const ctx = savingsGrowthChart.ctx;
    savingsGrowthChart.data.datasets[0].backgroundColor = createSavingsGradient(ctx);
    
    savingsGrowthChart.update('active');
}

/**
 * Update stats summary below the chart
 */
function updateSavingsStats(data) {
    const totalSavedStatEl = document.getElementById('totalSavedStat');
    const avgPerPeriodEl = document.getElementById('avgPerPeriod');
    const growthTrendEl = document.getElementById('growthTrend');
    
    if (!totalSavedStatEl || !avgPerPeriodEl || !growthTrendEl) {
        return;
    }
    
    const total = data[data.length - 1] || 0;
    
    let periodAmounts = [];
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            periodAmounts.push(data[i]);
        } else {
            periodAmounts.push(data[i] - data[i - 1]);
        }
    }
    
    const nonZeroAmounts = periodAmounts.filter(amount => amount > 0);
    const avg = nonZeroAmounts.length > 0 
        ? nonZeroAmounts.reduce((a, b) => a + b, 0) / nonZeroAmounts.length 
        : 0;
    
    let trend = 0;
    if (nonZeroAmounts.length > 1) {
        const firstPeriod = nonZeroAmounts[0];
        const lastPeriod = nonZeroAmounts[nonZeroAmounts.length - 1];
        if (firstPeriod > 0) {
            trend = ((lastPeriod - firstPeriod) / firstPeriod) * 100;
        }
    }
    
    totalSavedStatEl.textContent = '$' + total.toFixed(2);
    avgPerPeriodEl.textContent = '$' + avg.toFixed(2);
    
    if (trend > 0) {
        growthTrendEl.textContent = '+' + trend.toFixed(1) + '%';
        growthTrendEl.style.color = '#43b581';
    } else if (trend < 0) {
        growthTrendEl.textContent = trend.toFixed(1) + '%';
        growthTrendEl.style.color = '#ef4444';
    } else {
        growthTrendEl.textContent = '0%';
        growthTrendEl.style.color = '#64748b';
    }
}

/**
 * Load savings growth data from Firebase
 */
async function loadSavingsGrowthData(db, currentUser, period = 'weekly') {
    if (!currentUser) {
        console.log('No current user for savings growth chart');
        return;
    }
    
    try {
        console.log(`Loading savings growth data for period: ${period}`);
        
        const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
        const querySnapshot = await getDocs(transactionsRef);
        
        const savingsTransactions = [];
        
        querySnapshot.forEach((docSnapshot) => {
            const transaction = docSnapshot.data();
            
            if (transaction.category === "savings" || 
                transaction.category === "investment" || 
                transaction.category === "retirement" || 
                transaction.category === "emergency") {
                
                let transactionDate;
                
                if (transaction.date && transaction.date.toDate) {
                    transactionDate = transaction.date.toDate();
                } else if (transaction.date instanceof Date) {
                    transactionDate = transaction.date;
                } else if (typeof transaction.date === 'string') {
                    transactionDate = new Date(transaction.date);
                } else {
                    return;
                }
                
                savingsTransactions.push({
                    amount: parseFloat(transaction.amount) || 0,
                    date: transactionDate
                });
            }
        });
        
        console.log(`Found ${savingsTransactions.length} savings transactions`);
        
        if (savingsTransactions.length === 0) {
            updateSavingsGrowthChart({ 
                labels: getEmptyLabels(period), 
                data: new Array(getEmptyLabels(period).length).fill(0) 
            });
            updateSavingsStats([0]);
            return;
        }
        
        const aggregatedData = aggregateByPeriod(savingsTransactions, period);
        updateSavingsGrowthChart(aggregatedData);
        updateSavingsStats(aggregatedData.data);
        
    } catch (error) {
        console.error('Error loading savings growth data:', error);
    }
}

/**
 * Initialize the savings growth chart
 * @param {object} db - Firestore database instance
 * @param {object} currentUser - Current authenticated user
 */
export function initSavingsGrowthChart(db, currentUser) {
    const canvas = document.getElementById('savingsGrowthChart');
    
    if (!canvas) {
        console.log('Savings growth chart canvas not found');
        return;
    }
    
    console.log('Initializing savings growth chart...');
    
    const ctx = canvas.getContext('2d');
    
    if (savingsGrowthChart) {
        savingsGrowthChart.destroy();
    }
    
    savingsGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cumulative Savings',
                data: [],
                borderColor: '#43b581',
                backgroundColor: createSavingsGradient(ctx),
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#43b581',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#43b581',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
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
                            return 'Cumulative Savings: $' + context.parsed.y.toFixed(2);
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
                        },
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: '#e2e8f0',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    console.log('Chart initialized, loading data...');
    
    loadSavingsGrowthData(db, currentUser, currentChartPeriod);
    setupChartToggleButtons(db, currentUser);
}