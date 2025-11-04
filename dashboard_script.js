import { updateGreeting } from "./user_greeting.js"
import { initTransactions } from './transactions-module.js';
import { initOverviewCharts } from './overview-charts.js';

console.log('dashboard_script.js loaded');

const toggle = document.getElementById("toggle");
const overview_button = document.getElementById("overview_button");
const budget_button = document.getElementById("budget_button");
const transactions_button = document.getElementById("transactions_button");

const overview_section = document.getElementById("overview_section");
const budget_section = document.getElementById("budget_section");
const transactions_section = document.getElementById("transactions_section");

toggle.addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("collapsed");
});

overview_button.addEventListener("click", () => {
    console.log('Overview button clicked');
    overview_section.style.display = "block";
    budget_section.style.display = "none";
    transactions_section.style.display = "none";

    updateGreeting();
    // Initialize charts when overview section is shown
    console.log('Calling initOverviewCharts from button click');
    initOverviewCharts();
});

budget_button.addEventListener("click", () => {
    console.log('Budget button clicked');
    budget_section.style.display = "grid";
    overview_section.style.display = "none";
    transactions_section.style.display = "none";
});

transactions_button.addEventListener("click", () => {
    console.log('Transactions button clicked');
    transactions_section.style.display = "block";
    overview_section.style.display = "none";
    budget_section.style.display = "none";
    
    // Initialize transactions when section is shown
    initTransactions();
});

// Initialize overview charts on page load (since overview is visible by default)
console.log('Calling initOverviewCharts on page load');
initOverviewCharts();
