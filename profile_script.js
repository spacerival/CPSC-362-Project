import { initTransactions } from './transactions-module.js';

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
    overview_section.style.display = "grid";
    budget_section.style.display = "none";
    transactions_section.style.display = "none";
});

budget_button.addEventListener("click", () => {
    budget_section.style.display = "grid";
    overview_section.style.display = "none";
    transactions_section.style.display = "none";
});

transactions_button.addEventListener("click", () => {
    transactions_section.style.display = "block";
    overview_section.style.display = "none";
    budget_section.style.display = "none";
    
    // Initialize transactions when section is shown
    initTransactions();
});