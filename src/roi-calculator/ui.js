// UI for tools/pay-per-call-roi-calculator/. Logic lives in calc.js. This file only reads the form,
// shows errors and rows, and keeps the URL in sync.
import { buildRows, calculate, fromParams, toParams } from "./calc.js";

const form = document.querySelector("#calc-form");

if (form) {
  const rowsEl = document.querySelector("#calc-rows");
  const clicksGroup = document.querySelector("#group-clicks");
  const callsGroup = document.querySelector("#group-calls");
  const linkWrap = document.querySelector("#calc-link");
  const linkField = document.querySelector("#calc-link-field");
  const status = document.querySelector("#calc-status");
  const fields = ["spend", "calls", "clicks", "ctr", "bill", "payout", "tools"];

  const read = () => {
    const data = new FormData(form);
    const raw = { mode: data.get("mode") === "clicks" ? "clicks" : "calls" };
    for (const field of fields) raw[field] = String(data.get(field) ?? "");
    return raw;
  };

  const write = (raw) => {
    form.querySelector(`input[name="mode"][value="${raw.mode}"]`).checked = true;
    for (const field of fields) form.elements.namedItem(field).value = raw[field];
  };

  const showErrors = (errors) => {
    for (const field of fields) {
      const input = form.elements.namedItem(field);
      const errorEl = document.querySelector(`#${field}-error`);
      const message = errors[field] || "";
      errorEl.textContent = message;
      errorEl.hidden = message === "";
      // Removed, not "false", once the input is fixed. Only invalid inputs carry the attribute.
      if (message === "") input.removeAttribute("aria-invalid");
      else input.setAttribute("aria-invalid", "true");
    }
  };

  const renderRows = (rows) => {
    rowsEl.replaceChildren(
      ...rows.map((row) => {
        const div = document.createElement("div");
        div.className = "calc-row";
        const dt = document.createElement("dt");
        dt.textContent = row.label;
        const value = document.createElement("dd");
        value.className = "calc-value";
        value.textContent = row.value;
        const detail = document.createElement("dd");
        detail.className = row.reason ? "calc-formula calc-reason" : "calc-formula";
        detail.textContent = row.reason ?? row.detail;
        div.append(dt, value, detail);
        return div;
      }),
    );
  };

  const syncGroups = (mode) => {
    clicksGroup.hidden = mode !== "clicks";
    callsGroup.hidden = mode === "clicks";
  };

  const render = () => {
    const raw = read();
    const result = calculate(raw);
    showErrors(result.errors);
    renderRows(buildRows(result));
    syncGroups(raw.mode);
    return raw;
  };

  // Writes the current inputs into the address bar without adding history entries.
  const syncUrl = (raw) => {
    history.replaceState(null, "", `${location.pathname}?${toParams(raw)}`);
  };

  const onInput = () => syncUrl(render());

  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncUrl(render());
  });

  document.querySelector("#calc-reset").addEventListener("click", () => {
    write(fromParams({}));
    linkWrap.hidden = true;
    history.replaceState(null, "", location.pathname);
    render();
    status.textContent = "Reset to the example numbers.";
  });

  document.querySelector("#calc-copy").addEventListener("click", async () => {
    const url = new URL(location.href);
    url.search = toParams(read()).toString();
    url.hash = "";
    linkField.value = url.href;
    try {
      await navigator.clipboard.writeText(url.href);
      linkWrap.hidden = true;
      status.textContent = "Link copied. It opens with these numbers.";
    } catch {
      // No clipboard access (older browser, or a non-secure page). Show the link so it can be copied by hand.
      linkWrap.hidden = false;
      linkField.focus();
      linkField.select();
      status.textContent = "Couldn't copy automatically. The link is selected below: press Ctrl+C or Cmd+C.";
    }
  });

  // First paint: prefill from the URL. No params means the example numbers.
  write(fromParams(new URLSearchParams(location.search)));
  render();
}
