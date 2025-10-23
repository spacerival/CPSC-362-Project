let expenses = [];
let chart = null;

const categoryColors = {
    'Food': '#ff6384',
    'Transportation': '#36a2eb',
    'Entertainment': '#ffce56',
    'Shopping': '#4bc0c0',
    'Bills': '#9966ff',
    'Healthcare': '#ff9f40',
    'Other': '#c9cbcf'
};

const categoryIcons = {
    'Food': '🍔',
    'Transportation': '🚗',
    'Entertainment': '🎬',
    'Shopping': '🛍️',
    'Bills': '💡',
    'Healthcare': '⚕️',
    'Other': '📦'
};

function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0
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

function changeChartType(type) {
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
}

function addExpense() {
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    expenses.push({
        id: Date.now(),
        category: category,
        amount: amount,
        date: new Date()
    });
    
    document.getElementById('amount').value = '';
    updateDisplay();
}

function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    updateDisplay();
}

function updateDisplay() {
    updateChart();
    updateTransactionsList();
    updateStats();
}

function updateChart() {
    const categoryTotals = {};
    
    expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = 0;
        }
        categoryTotals[exp.category] += exp.amount;
    });
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map(label => categoryColors[label]);
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
}

function updateTransactionsList() {
    const listContainer = document.getElementById('transactionsList');
    
    if (expenses.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">No transactions yet. Start tracking your expenses!</div>
            </div>
        `;
        return;
    }
    
    const sortedExpenses = [...expenses].sort((a, b) => b.date - a.date);
    
    listContainer.innerHTML = sortedExpenses.map(exp => `
        <div class="transaction-item">
            <div class="transaction-icon" style="background-color: ${categoryColors[exp.category]}20; color: ${categoryColors[exp.category]}">
                ${categoryIcons[exp.category]}
            </div>
            <div class="transaction-details">
                <div class="transaction-category">${exp.category}</div>
                <div class="transaction-date">${formatDate(exp.date)}</div>
            </div>
            <div class="transaction-amount">$${exp.amount.toFixed(2)}</div>
            <button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button>
        </div>
    `).join('');
}

function updateStats() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('totalExpenses').textContent = '$' + total.toFixed(2);
    document.getElementById('totalBalance').textContent = '$' + (10000 - total).toFixed(2);
    document.getElementById('expenseCount').textContent = expenses.length;
    
    // Find top category
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
        document.getElementById('topCategory').textContent = topCategory[0];
        document.getElementById('topCategoryAmount').textContent = '$' + topCategory[1].toFixed(2);
    }
}

function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize
initChart();

// Allow Enter key to add expense
document.getElementById('amount').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addExpense();
    }
});
```

