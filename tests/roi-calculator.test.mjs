// Tests for the pay-per-call ROI calculator's pure logic (src/roi-calculator/calc.js).
//   npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULTS,
  MAX_VALUE,
  buildRows,
  calculate,
  formatCount,
  formatMoney,
  formatMultiple,
  formatPercent,
  fromParams,
  parseInput,
  toParams,
} from "../src/roi-calculator/calc.js";

const SPEC = { label: "ad spend", example: "4000 or $4,000" };
const PCT = { label: "billable rate", example: "62.5 or 62.5%", percent: true };
const OPTIONAL = { label: "tracking and tool costs", example: "300 or $300", required: false };

/** Calculates from a partial raw input, filling the rest with the page defaults. */
const run = (overrides = {}) => calculate({ ...DEFAULTS, ...overrides });

const rowsFor = (overrides = {}) => buildRows(run(overrides));
const rowText = (rows, key) => rows.find((row) => row.key === key);

/** Every string the UI can show for these rows. Used to check that nothing prints NaN, Infinity, or undefined. */
function visibleText(rows) {
  return rows.flatMap((row) => [row.label, row.value, row.detail, row.reason].filter((s) => s != null));
}

function assertNoBadText(rows) {
  for (const text of visibleText(rows)) {
    assert.doesNotMatch(text, /NaN|Infinity|undefined|null/, `bad output: ${text}`);
  }
}

const near = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);
};

describe("worked example from the formula guide (defaults)", () => {
  const result = run();

  it("is ok with no errors", () => {
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, {});
  });

  it("computes every value by hand", () => {
    const v = result.values;
    near(v.totalCalls, 200);
    near(v.billableCalls, 125);
    near(v.revenue, 5000);
    near(v.totalCost, 4300);
    near(v.netProfit, 700);
    near(v.roi, (700 / 4300) * 100);
    near(v.roas, 25);
    near(v.revenueToSpend, 1.25);
    near(v.costPerCall, 20);
    near(v.costPerBillableCall, 32);
    near(v.breakEvenCostPerCall, 23.5);
    near(v.breakEvenPayout, 34.4);
  });

  it("shows the guide's rounded numbers", () => {
    const rows = rowsFor();
    const shown = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    assert.deepEqual(shown, {
      totalCalls: "200.0",
      billableCalls: "125.0",
      revenue: "$5,000.00",
      totalCost: "$4,300.00",
      netProfit: "$700.00",
      roi: "16.3%",
      roas: "25.0%",
      revenueToSpend: "1.25x",
      costPerCall: "$20.00",
      costPerBillableCall: "$32.00",
      breakEvenCostPerCall: "$23.50",
      breakEvenPayout: "$34.40",
    });
    assertNoBadText(rows);
  });

  it("matches the static worked example in the calculator page", () => {
    const html = readFileSync(fileURLToPath(new URL("../tools/pay-per-call-roi-calculator/index.html", import.meta.url)), "utf8");
    for (const row of rowsFor()) {
      assert.ok(html.includes(`<td>${row.value}</td>`), `static example is missing ${row.value} (${row.label})`);
    }
  });
});

describe("clicks mode", () => {
  it("gives the same results as typed calls when clicks x rate = calls", () => {
    const byCalls = run();
    const byClicks = run({ mode: "clicks", clicks: "2500", ctr: "8" });
    assert.equal(byClicks.ok, true);
    near(byClicks.values.totalCalls, 200);
    near(byClicks.values.netProfit, byCalls.values.netProfit);
    near(byClicks.values.roi, byCalls.values.roi);
  });

  it("keeps decimals in the call count (no rounding)", () => {
    const result = run({ mode: "clicks", clicks: "1001", ctr: "7.5" });
    near(result.values.totalCalls, 75.075);
    assert.equal(rowText(buildRows(result), "totalCalls").value, "75.1");
  });

  it("reports the clicks and rate in the formula", () => {
    const row = rowText(rowsFor({ mode: "clicks", clicks: "2500", ctr: "8" }), "totalCalls");
    assert.equal(row.detail, "2,500.0 clicks × 8.0% click-to-call");
  });

  it("ignores the typed call count in clicks mode, even when it is garbage", () => {
    const result = run({ mode: "clicks", calls: "abc", clicks: "2500", ctr: "8" });
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, {});
  });

  it("requires clicks and click-to-call rate", () => {
    const result = run({ mode: "clicks", clicks: "", ctr: "" });
    assert.equal(result.ok, false);
    assert.equal(result.errors.clicks, "Enter clicks.");
    assert.equal(result.errors.ctr, "Enter click-to-call rate.");
  });

  it("rejects a click-to-call rate above 100%", () => {
    const result = run({ mode: "clicks", ctr: "150" });
    assert.equal(result.errors.ctr, "Click-to-call rate must be 0 to 100%.");
  });
});

describe("input parsing", () => {
  it("accepts currency, commas, decimals, and spaces", () => {
    assert.equal(parseInput("$1,250.50", SPEC).value, 1250.5);
    assert.equal(parseInput(" 1 250 ", SPEC).value, 1250);
    assert.equal(parseInput("1 250", SPEC).value, 1250);
    assert.equal(parseInput("0.75", SPEC).value, 0.75);
    assert.equal(parseInput("4000", SPEC).value, 4000);
  });

  it("strips other currency symbols", () => {
    assert.equal(parseInput("€300", SPEC).value, 300);
    assert.equal(parseInput("£2,000.10", SPEC).value, 2000.1);
    assert.equal(parseInput("¥5000", SPEC).value, 5000);
  });

  it("strips percent signs from percentage fields", () => {
    assert.equal(parseInput("40%", PCT).value, 40);
    assert.equal(parseInput(" 62.5 % ", PCT).value, 62.5);
    assert.equal(parseInput("100", PCT).value, 100);
    assert.equal(parseInput("0", PCT).value, 0);
  });

  it("turns a blank required field into an 'Enter' message", () => {
    assert.deepEqual(parseInput("", SPEC), { value: null, error: "Enter ad spend." });
    assert.deepEqual(parseInput("   ", SPEC), { value: null, error: "Enter ad spend." });
    assert.deepEqual(parseInput(undefined, SPEC), { value: null, error: "Enter ad spend." });
  });

  it("treats a blank optional field as 0", () => {
    assert.deepEqual(parseInput("", OPTIONAL), { value: 0, error: null });
    assert.deepEqual(parseInput("  ", OPTIONAL), { value: 0, error: null });
    assert.equal(run({ tools: "" }).values.tools, 0);
    assert.equal(run({ tools: "" }).ok, true);
  });

  it("rejects negative numbers", () => {
    assert.equal(parseInput("-5", SPEC).error, "Ad spend can't be negative.");
    assert.equal(parseInput("-$5", SPEC).error, "Ad spend can't be negative.");
    assert.equal(parseInput("−5", SPEC).error, "Ad spend can't be negative.");
    assert.equal(parseInput("-0", SPEC).error, "Ad spend can't be negative.");
    assert.equal(run({ tools: "-1" }).errors.tools, "Tracking and tool costs can't be negative.");
  });

  it("rejects billable and click-to-call rates above 100", () => {
    assert.equal(parseInput("101", PCT).error, "Billable rate must be 0 to 100%.");
    assert.equal(parseInput("100.5%", PCT).error, "Billable rate must be 0 to 100%.");
    assert.equal(run({ bill: "150" }).errors.bill, "Billable rate must be 0 to 100%.");
  });

  it("rejects garbage with a clear message", () => {
    for (const text of ["abc", "1.2.3", "12x", "$", "%", "1-2", "."]) {
      const parsed = parseInput(text, SPEC);
      assert.equal(parsed.value, null, text);
      assert.equal(parsed.error, "Ad spend must be a number, like 4000 or $4,000.", text);
    }
    assert.equal(run({ payout: "forty" }).errors.payout, "Payout per billable call must be a number, like 40 or $40.00.");
  });

  it("caps huge values with a message and keeps them finite", () => {
    for (const text of ["1e15", "999999999999999", "1e400", "1000000000001"]) {
      const parsed = parseInput(text, SPEC);
      assert.equal(parsed.value, null, text);
      assert.equal(parsed.error, "Ad spend is above the limit of 1,000,000,000,000.", text);
    }
    assert.equal(parseInput(String(MAX_VALUE), SPEC).value, MAX_VALUE);
  });

  it("accepts plain exponent notation below the cap", () => {
    assert.equal(parseInput("1e6", SPEC).value, 1_000_000);
  });
});

describe("calculator edge cases", () => {
  it("empty required field: no result, a dash, and a reason", () => {
    const result = run({ spend: "" });
    assert.equal(result.ok, false);
    assert.equal(result.errors.spend, "Enter ad spend.");
    const rows = buildRows(result);
    for (const row of rows) {
      assert.equal(row.value, "-", row.key);
      assert.equal(typeof row.reason, "string", row.key);
    }
    assertNoBadText(rows);
  });

  it("garbage in one field blocks every result", () => {
    const result = run({ bill: "1.2.3" });
    assert.equal(result.ok, false);
    assert.equal(result.values.netProfit, null);
    assert.ok(buildRows(result).every((row) => row.value === "-"));
  });

  it("zero spend: ROAS needs ad spend, ROI still defined when tools > 0", () => {
    const result = run({ spend: "0" });
    assert.equal(result.ok, true);
    assert.equal(result.values.roas, null);
    assert.equal(result.notes.roas, "Needs ad spend above $0.");
    assert.equal(result.values.revenueToSpend, null);
    near(result.values.roi, ((5000 - 300) / 300) * 100);
    const rows = buildRows(result);
    assert.equal(rowText(rows, "roas").value, "n/a");
    assert.equal(rowText(rows, "roas").reason, "Needs ad spend above $0.");
    assert.equal(rowText(rows, "roi").value, "1,566.7%");
    assertNoBadText(rows);
  });

  it("zero spend and zero tools: ROI can't be calculated", () => {
    const result = run({ spend: "0", tools: "0" });
    assert.equal(result.ok, true);
    assert.equal(result.values.roi, null);
    assert.equal(result.notes.roi, "ROI can't be calculated when total cost is $0.");
    assert.equal(result.values.roas, null);
    assert.equal(result.values.netProfit, 5000);
    assertNoBadText(buildRows(result));
  });

  it("zero calls: per-call metrics and break-even per call are n/a", () => {
    const result = run({ calls: "0" });
    assert.equal(result.ok, true);
    for (const key of ["costPerCall", "breakEvenCostPerCall"]) {
      assert.equal(result.values[key], null, key);
      assert.equal(result.notes[key], "No calls.", key);
    }
    for (const key of ["costPerBillableCall", "breakEvenPayout"]) {
      assert.equal(result.values[key], null, key);
      assert.equal(result.notes[key], "No billable calls.", key);
    }
    assertNoBadText(buildRows(result));
  });

  it("0% billable: revenue is 0, billable metrics are n/a", () => {
    const result = run({ bill: "0" });
    assert.equal(result.ok, true);
    assert.equal(result.values.revenue, 0);
    assert.equal(result.values.netProfit, -4300);
    assert.equal(result.values.costPerBillableCall, null);
    assert.equal(result.notes.costPerBillableCall, "No billable calls.");
    assert.equal(result.values.breakEvenPayout, null);
    assert.equal(result.values.costPerCall, 20);
    assertNoBadText(buildRows(result));
  });

  it("decimals in every field work", () => {
    const result = run({ spend: "1234.56", calls: "100.5", bill: "33.3", payout: "45.25", tools: "12.75" });
    near(result.values.billableCalls, 100.5 * 0.333);
    near(result.values.revenue, 100.5 * 0.333 * 45.25);
    near(result.values.netProfit, 100.5 * 0.333 * 45.25 - 1234.56 - 12.75);
    assertNoBadText(buildRows(result));
  });

  it("huge values stay finite and print without exponents", () => {
    const huge = run({ spend: "1e12", calls: "1e12", bill: "100", payout: "1e12", tools: "1e12" });
    assert.equal(huge.ok, true);
    for (const value of Object.values(huge.values)) {
      if (typeof value === "number") assert.ok(Number.isFinite(value));
    }
    const rows = buildRows(huge);
    assertNoBadText(rows);
    assert.doesNotMatch(visibleText(rows).join(" "), /e\+|e-\d/);
  });

  it("a value too big to show becomes a reason, not Infinity", () => {
    // Spend of 1e-300 makes ROAS = revenue / spend x 100 overflow to Infinity.
    const result = run({ spend: "1e-300", tools: "0", calls: "1", bill: "100", payout: "1e12" });
    assert.equal(result.ok, true);
    assert.equal(result.values.roas, null);
    assert.equal(result.notes.roas, "Result is too large to show.");
    assertNoBadText(buildRows(result));
  });

  it("no formatted output ever contains NaN, Infinity, or undefined", () => {
    const inputs = [
      {},
      { spend: "", calls: "", bill: "", payout: "", tools: "" },
      { spend: "0", calls: "0", bill: "0", payout: "0", tools: "0" },
      { spend: "-1" },
      { bill: "200" },
      { spend: "abc" },
      { mode: "clicks", clicks: "0", ctr: "0" },
      { mode: "clicks", clicks: "1e12", ctr: "100" },
      { spend: "1e12", tools: "1e12", calls: "1e12", bill: "0.001", payout: "1e12" },
      { spend: "0.0001", tools: "0", calls: "0.0001", bill: "0.0001", payout: "0.0001" },
    ];
    for (const overrides of inputs) {
      assertNoBadText(buildRows(run(overrides)));
    }
  });
});

describe("formatting", () => {
  it("formats money, percent, counts, and multiples", () => {
    assert.equal(formatMoney(700), "$700.00");
    assert.equal(formatMoney(-500), "-$500.00");
    assert.equal(formatMoney(1234567.891), "$1,234,567.89");
    assert.equal(formatPercent(16.2790697), "16.3%");
    assert.equal(formatPercent(-16), "-16.0%");
    assert.equal(formatCount(200), "200.0");
    assert.equal(formatMultiple(1.25), "1.25x");
  });

  it("never prints negative zero", () => {
    assert.equal(formatPercent(-0.04), "0.0%");
    assert.equal(formatMoney(-0.001), "$0.00");
    assert.equal(formatMultiple(-0), "0.00x");
  });

  it("prints n/a for values that are not finite", () => {
    assert.equal(formatMoney(Number.NaN), "n/a");
    assert.equal(formatPercent(Infinity), "n/a");
    assert.equal(formatCount(undefined), "n/a");
    assert.equal(formatMultiple(null), "n/a");
  });
});

describe("shareable URL params", () => {
  it("no params means the example numbers", () => {
    assert.deepEqual(fromParams(new URLSearchParams("")), DEFAULTS);
  });

  it("prefills from params and fills missing keys with defaults", () => {
    const raw = fromParams(new URLSearchParams("spend=5000&payout=35"));
    assert.equal(raw.spend, "5000");
    assert.equal(raw.payout, "35");
    assert.equal(raw.calls, DEFAULTS.calls);
    assert.equal(raw.mode, "calls");
  });

  it("round trips a scenario through toParams and fromParams", () => {
    const raw = { mode: "clicks", spend: "4000", calls: "200", clicks: "2500", ctr: "8", bill: "62.5", payout: "40", tools: "300" };
    const params = toParams(raw);
    const back = fromParams(new URLSearchParams(params.toString()));
    assert.deepEqual(calculate(back).values, calculate(raw).values);
    assert.equal(toParams(back).toString(), params.toString());
  });

  it("writes only the active mode's call fields", () => {
    const calls = toParams({ ...DEFAULTS, mode: "calls" });
    assert.equal(calls.get("mode"), "calls");
    assert.equal(calls.get("calls"), "200");
    assert.equal(calls.has("clicks"), false);
    assert.equal(calls.has("ctr"), false);

    const clicks = toParams({ ...DEFAULTS, mode: "clicks" });
    assert.equal(clicks.get("mode"), "clicks");
    assert.equal(clicks.has("calls"), false);
    assert.equal(clicks.get("ctr"), "8");
  });

  it("writes valid input as a plain number, keeping the URL short", () => {
    const params = toParams({ ...DEFAULTS, spend: "$4,000", bill: "62.5%", tools: " 300 " });
    assert.equal(params.get("spend"), "4000");
    assert.equal(params.get("bill"), "62.5");
    assert.equal(params.get("tools"), "300");
  });

  it("keeps blank fields blank, so an empty tools field stays empty in a link", () => {
    const params = toParams({ ...DEFAULTS, tools: "" });
    assert.equal(params.get("tools"), "");
    assert.equal(calculate(fromParams(params)).values.tools, 0);
  });

  it("keeps bad input as typed, so a bad link shows the normal error", () => {
    const params = toParams({ ...DEFAULTS, spend: "abc" });
    assert.equal(params.get("spend"), "abc");
    const result = calculate(fromParams(params));
    assert.equal(result.errors.spend, "Ad spend must be a number, like 4000 or $4,000.");
  });

  it("reads a bad mode as the calls mode and caps long values", () => {
    assert.equal(fromParams(new URLSearchParams("mode=bogus")).mode, "calls");
    const long = fromParams({ spend: "9".repeat(500) });
    assert.equal(long.spend.length, 64);
  });

  it("accepts a plain object as well as URLSearchParams", () => {
    assert.equal(fromParams({ spend: "100", mode: "clicks" }).spend, "100");
  });
});
