// Pay-per-call ROI calculator: parsing, math, formatting, and URL params.
// Dependency-free ES module. It runs in the browser (src/roi-calculator/ui.js) and in node (tests/roi-calculator.test.mjs).
// Definitions match guides/pay-per-call-profit-formula/index.html. Keep them in sync.

/** Largest value any input accepts. Above this the calculator shows an error instead of a result. */
export const MAX_VALUE = 1e12;

/** Example numbers the page starts with. They reproduce the worked example in the formula guide. */
export const DEFAULTS = {
  mode: "calls",
  spend: "4000",
  calls: "200",
  clicks: "2500",
  ctr: "8",
  bill: "62.5",
  payout: "40",
  tools: "300",
};

// label: shown in messages. example: what a valid entry looks like. required: false means blank counts as 0.
const SPECS = {
  spend: { label: "ad spend", example: "4000 or $4,000" },
  calls: { label: "calls", example: "200 or 1,250" },
  clicks: { label: "clicks", example: "2500 or 2,500" },
  ctr: { label: "click-to-call rate", example: "8 or 8%", percent: true },
  bill: { label: "billable rate", example: "62.5 or 62.5%", percent: true },
  payout: { label: "payout per billable call", example: "40 or $40.00" },
  tools: { label: "tracking and tool costs", example: "300 or $300", required: false },
};

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const NUMBER_SHAPE = /^\+?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * Parses one raw input. Returns { value, error }.
 * Accepts "$1,250.50", " 1 250 ", "€300", "40%", "1e6". Rejects "abc", "1.2.3", negatives, and out-of-range values.
 * A blank required field gives value null. A blank optional field gives 0.
 */
export function parseInput(raw, spec) {
  const { label, example, percent = false, required = true } = spec;
  const text = raw == null ? "" : String(raw).trim();
  if (text === "") {
    return required ? { value: null, error: `Enter ${label}.` } : { value: 0, error: null };
  }
  // Currency symbols (\p{Sc}), separators, and percent signs are decoration. Strip them before checking the number.
  const cleaned = text.replace(/[\s,%]/g, "").replace(/\p{Sc}/gu, "").replace(/−/g, "-");
  if (cleaned.startsWith("-")) {
    return { value: null, error: `${cap(label)} can't be negative.` };
  }
  if (!NUMBER_SHAPE.test(cleaned)) {
    return { value: null, error: `${cap(label)} must be a number, like ${example}.` };
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value > MAX_VALUE) {
    return { value: null, error: `${cap(label)} is above the limit of ${formatWhole(MAX_VALUE)}.` };
  }
  if (percent && value > 100) {
    return { value: null, error: `${cap(label)} must be 0 to 100%.` };
  }
  return { value, error: null };
}

/**
 * Calculates every output from the raw inputs (strings, as typed).
 * Returns { ok, errors, values, notes }:
 *   ok      true when every input needed for the current mode parsed cleanly
 *   errors  { field: message } for inline messages
 *   values  parsed inputs, plus computed metrics (null when undefined)
 *   notes   { metric: reason } for every metric that is null
 */
export function calculate(raw = {}) {
  const mode = raw.mode === "clicks" ? "clicks" : "calls";
  const fields = ["spend", ...(mode === "clicks" ? ["clicks", "ctr"] : ["calls"]), "bill", "payout", "tools"];

  const errors = {};
  const values = { mode };
  for (const field of fields) {
    const parsed = parseInput(raw[field], SPECS[field]);
    values[field] = parsed.value;
    if (parsed.error) errors[field] = parsed.error;
  }
  const ok = Object.keys(errors).length === 0;
  const notes = {};

  const metricKeys = [
    "totalCalls",
    "billableCalls",
    "revenue",
    "totalCost",
    "netProfit",
    "roi",
    "roas",
    "revenueToSpend",
    "costPerCall",
    "costPerBillableCall",
    "breakEvenCostPerCall",
    "breakEvenPayout",
  ];

  if (!ok) {
    for (const key of metricKeys) {
      values[key] = null;
      notes[key] = "Fix the inputs above.";
    }
    return { ok, errors, values, notes };
  }

  const { spend, bill, payout, tools } = values;
  // Calls: typed directly, or clicks x click-to-call rate (no rounding).
  const totalCalls = mode === "clicks" ? (values.clicks * values.ctr) / 100 : values.calls;
  const billableCalls = (totalCalls * bill) / 100;
  const revenue = billableCalls * payout;
  const totalCost = spend + tools;
  const netProfit = revenue - spend - tools;

  values.totalCalls = totalCalls;
  values.billableCalls = billableCalls;
  values.revenue = revenue;
  values.totalCost = totalCost;
  values.netProfit = netProfit;

  // Each metric is null with a reason when its divisor is zero, or when the result is not finite.
  const metric = (key, compute, reason) => {
    const result = reason ? null : compute();
    if (result === null || !Number.isFinite(result)) {
      values[key] = null;
      notes[key] = reason || "Result is too large to show.";
    } else {
      values[key] = result;
    }
  };

  metric("roi", () => (netProfit / totalCost) * 100, totalCost > 0 ? null : "ROI can't be calculated when total cost is $0.");
  metric("roas", () => ((revenue - spend) / spend) * 100, spend > 0 ? null : "Needs ad spend above $0.");
  metric("revenueToSpend", () => revenue / spend, spend > 0 ? null : "Needs ad spend above $0.");
  metric("costPerCall", () => spend / totalCalls, totalCalls > 0 ? null : "No calls.");
  metric("breakEvenCostPerCall", () => (revenue - tools) / totalCalls, totalCalls > 0 ? null : "No calls.");
  metric("costPerBillableCall", () => spend / billableCalls, billableCalls > 0 ? null : "No billable calls.");
  metric("breakEvenPayout", () => totalCost / billableCalls, billableCalls > 0 ? null : "No billable calls.");

  return { ok, errors, values, notes };
}

/**
 * Rounds to a fixed number of decimals and turns -0 into 0, so output never shows "-0.0%".
 * Values so large that scaling overflows are returned unrounded, so Intl never prints "∞".
 */
function fixed(value, digits) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  if (!Number.isFinite(scaled)) return value;
  const rounded = Math.round(scaled) / factor;
  return rounded === 0 ? 0 : rounded;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const count = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const multiple = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** $1,234.50. Returns "n/a" for anything that is not a finite number. */
export function formatMoney(value) {
  return Number.isFinite(value) ? money.format(fixed(value, 2)) : "n/a";
}

/** 16.3%. Returns "n/a" for anything that is not a finite number. */
export function formatPercent(value) {
  return Number.isFinite(value) ? `${count.format(fixed(value, 1))}%` : "n/a";
}

/** 200.0. One decimal place, for call counts. */
export function formatCount(value) {
  return Number.isFinite(value) ? count.format(fixed(value, 1)) : "n/a";
}

/** 1.25x. Two decimal places, for revenue divided by ad spend. */
export function formatMultiple(value) {
  return Number.isFinite(value) ? `${multiple.format(fixed(value, 2))}x` : "n/a";
}

function formatWhole(value) {
  return Number.isFinite(value) ? whole.format(value) : "n/a";
}

/**
 * The output rows, in display order, as strings. Used by the UI and by the tests.
 * Each row: { key, label, value, detail, reason }. detail is the formula with the user's numbers,
 * reason explains a null value. A row is either a detail or a reason, never both.
 */
export function buildRows(result) {
  const { ok, values: v, notes } = result;
  const rowsFor = [
    ["totalCalls", "Calls", formatCount, () =>
      v.mode === "clicks"
        ? `${formatCount(v.clicks)} clicks × ${formatPercent(v.ctr)} click-to-call`
        : "Entered directly"],
    ["billableCalls", "Billable calls", formatCount, () => `${formatCount(v.totalCalls)} calls × ${formatPercent(v.bill)}`],
    ["revenue", "Revenue (call payout)", formatMoney, () => `${formatCount(v.billableCalls)} billable calls × ${formatMoney(v.payout)}`],
    ["totalCost", "Total cost", formatMoney, () => `${formatMoney(v.spend)} ad spend + ${formatMoney(v.tools)} tools`],
    ["netProfit", "Net profit", formatMoney, () => `${formatMoney(v.revenue)} − ${formatMoney(v.spend)} − ${formatMoney(v.tools)}`],
    ["roi", "ROI", formatPercent, () => `${formatMoney(v.netProfit)} ÷ ${formatMoney(v.totalCost)} × 100`],
    ["roas", "ROAS (return on ad spend)", formatPercent, () => `(${formatMoney(v.revenue)} − ${formatMoney(v.spend)}) ÷ ${formatMoney(v.spend)} × 100`],
    ["revenueToSpend", "Revenue / ad spend (how Google Ads shows ROAS)", formatMultiple, () => `${formatMoney(v.revenue)} ÷ ${formatMoney(v.spend)}`],
    ["costPerCall", "Cost per call (CPC)", formatMoney, () => `${formatMoney(v.spend)} ÷ ${formatCount(v.totalCalls)} calls`],
    ["costPerBillableCall", "Cost per billable call", formatMoney, () => `${formatMoney(v.spend)} ÷ ${formatCount(v.billableCalls)} billable calls`],
    ["breakEvenCostPerCall", "Break-even cost per call", formatMoney, () => `(${formatMoney(v.revenue)} − ${formatMoney(v.tools)}) ÷ ${formatCount(v.totalCalls)} calls`],
    ["breakEvenPayout", "Break-even payout per billable call", formatMoney, () => `${formatMoney(v.totalCost)} ÷ ${formatCount(v.billableCalls)} billable calls`],
  ];

  return rowsFor.map(([key, label, format, detail]) => {
    if (!ok) return { key, label, value: "-", detail: null, reason: notes[key] };
    if (v[key] === null) return { key, label, value: "n/a", detail: null, reason: notes[key] || "Not available for these inputs." };
    return { key, label, value: format(v[key]), detail: detail(), reason: null };
  });
}

const PARAM_KEYS = ["spend", "calls", "clicks", "ctr", "bill", "payout", "tools"];
const MAX_PARAM_LENGTH = 64;

/**
 * Raw inputs -> URLSearchParams for the shareable link. Only the active mode's fields are written.
 * Valid numbers are written as plain numbers ("$4,000" -> "4000"). Anything else is written as typed,
 * so a bad link still shows the same error after it is opened. Blank stays blank.
 */
export function toParams(raw = {}) {
  const mode = raw.mode === "clicks" ? "clicks" : "calls";
  const params = new URLSearchParams();
  params.set("mode", mode);
  const keys = PARAM_KEYS.filter((key) => {
    if (key === "calls") return mode === "calls";
    if (key === "clicks" || key === "ctr") return mode === "clicks";
    return true;
  });
  for (const key of keys) {
    const text = raw[key] == null ? "" : String(raw[key]).trim();
    let out = text;
    if (text !== "") {
      const parsed = parseInput(text, SPECS[key]);
      if (!parsed.error) out = String(parsed.value);
    }
    params.set(key, out.slice(0, MAX_PARAM_LENGTH));
  }
  return params;
}

/**
 * URLSearchParams (or a plain object) -> raw inputs for the form. A key that is missing gets its
 * default. A key that is present, even blank, is used as is. Values go through the same parser later.
 */
export function fromParams(params = {}) {
  const read = (key) => (typeof params.get === "function" ? params.get(key) : params[key]);
  const raw = { mode: read("mode") === "clicks" ? "clicks" : "calls" };
  for (const key of PARAM_KEYS) {
    const value = read(key);
    raw[key] = value == null ? DEFAULTS[key] : String(value).slice(0, MAX_PARAM_LENGTH);
  }
  return raw;
}
