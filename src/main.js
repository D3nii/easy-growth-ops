import "./style.css";

const ranges = {
  7: { roi: "3.84", spend: "$41,220", ret: "$158,280", period: "7 days" },
  30: { roi: "4.22", spend: "$128,410", ret: "$541,900", period: "30 days" },
  90: { roi: "3.91", spend: "$364,800", ret: "$1,426,400", period: "90 days" },
};

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

document.querySelectorAll("[data-range]").forEach((button) => {
  button.addEventListener("click", () => {
    const range = button.getAttribute("data-range");
    const next = ranges[range];
    if (!next) return;

    document.querySelectorAll("[data-range]").forEach((item) => {
      item.classList.toggle("is-on", item === button);
    });

    const roi = document.querySelector("[data-roi]");
    const spend = document.querySelector("[data-spend]");
    const ret = document.querySelector("[data-return]");
    const period = document.querySelector("[data-period]");
    if (roi) roi.textContent = next.roi;
    if (spend) spend.textContent = next.spend;
    if (ret) ret.textContent = next.ret;
    if (period) period.textContent = next.period;
  });
});

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
