import "./style.css";

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

const form = document.querySelector("#access-form");
const note = document.querySelector(".form-note");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  const company = String(data.get("company") || "").trim();

  if (!email.includes("@") || company.length < 2) {
    if (note) note.textContent = "Add a work email and company name.";
    return;
  }

  const existing = JSON.parse(localStorage.getItem("ego-access") || "[]");
  existing.push({ email, company, at: new Date().toISOString() });
  localStorage.setItem("ego-access", JSON.stringify(existing));

  form.classList.add("is-done");
  form.querySelector("button").textContent = "Request received";
  if (note) {
    note.textContent = "Thanks. We’ll write back when a seat is open.";
  }
});
