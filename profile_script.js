const toggle = document.getElementById("toggle");
const overview_button = document.getElementById("overview_button");
const spending_button = document.getElementById("spending_button");
const budget_button = document.getElementById("budget_button");
const transaction_button = document.getElementById("transaction_button");

const overview_section = document.getElementById("overview_section");
const spending_section = document.getElementById("spending_section");
const budget_section = document.getElementById("budget_section");
const transaction_section = document.getElementById("transaction_section");

toggle.addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("collapsed");
});

overview_button.addEventListener("click", () => {
    overview_section.style.display = "grid";
    spending_section.style.display= "none";
    budget_section.style.display = "none";
    transaction_section.style.display = "none";

});

spending_button.addEventListener("click", () => {
    spending_section.style.display= "grid";
    overview_section.style.display = "none";
    budget_section.style.display = "none";
    transaction_section.style.display = "none";

});

budget_button.addEventListener("click", () => {
    budget_section.style.display = "grid";
    overview_section.style.display = "none";
    spending_section.style.display= "none";
    transaction_section.style.display = "none";

});

transaction_button.addEventListener("click", () => {
    transaction_section.style.display = "grid";
    overview_section.style.display = "none";
    spending_section.style.display= "none";
    budget_section.style.display = "none";
})
