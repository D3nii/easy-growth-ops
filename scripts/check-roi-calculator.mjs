// Browser checks for the pay-per-call ROI calculator. Run after a build:
//   npm run build && npm run test:browser
// Uses puppeteer-core and the Chrome at CHROME_PATH (default /usr/bin/google-chrome).
// Not part of `node --test tests/`. Prints one PASS or FAIL line per case and exits 1 if any case fails.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const PAGE = "/tools/pay-per-call-roi-calculator/";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const BAD = /NaN|Infinity|undefined|null/;
const FIELD_IDS = ["spend", "calls", "clicks", "ctr", "bill", "payout", "tools"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Serves ./dist on a random local port. Directory paths map to their index.html. */
function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      let file = path.join(DIST, path.normalize(decodeURIComponent(pathname)));
      if (!file.startsWith(DIST + path.sep)) throw new Error("outside dist");
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function open(page, base, query = "") {
  await page.goto(`${base}${query}`, { waitUntil: "load" });
  await page.waitForSelector("#calc-rows .calc-row");
}

async function setMode(page, mode) {
  await page.click(`input[name="mode"][value="${mode}"]`);
}

/** Clears the field, then types the text. An empty string leaves it blank. */
async function setField(page, id, text) {
  const input = await page.$(`#${id}`);
  // Select the whole value with the keyboard, then delete it, so the field is empty before typing.
  await input.focus();
  await page.$eval(`#${id}`, (el) => el.select());
  await page.keyboard.press("Backspace");
  const left = await page.$eval(`#${id}`, (el) => el.value);
  if (left !== "") throw new Error(`could not clear #${id}: "${left}"`);
  if (text !== "") await input.type(text);
}

async function readRows(page) {
  return page.$$eval("#calc-rows .calc-row", (rows) =>
    rows.map((row) => ({
      label: row.querySelector("dt").textContent,
      value: row.querySelector(".calc-value").textContent,
      detail: row.querySelectorAll("dd")[1].textContent,
    })),
  );
}

async function readFields(page) {
  return page.evaluate((ids) => {
    const fields = Object.fromEntries(ids.map((id) => [id, document.getElementById(id).value]));
    return { mode: document.querySelector('input[name="mode"]:checked').value, ...fields };
  }, FIELD_IDS);
}

function rowByLabel(rows, label) {
  const row = rows.find((item) => item.label === label);
  assert.ok(row, `no row labeled "${label}"`);
  return row;
}

/** Fails if any row is empty, or if any row or <main> shows NaN, Infinity, undefined, or null. */
async function assertClean(page) {
  for (const row of await readRows(page)) {
    assert.ok(row.value !== "" && row.detail !== "", `row "${row.label}" rendered empty`);
    for (const text of [row.label, row.value, row.detail]) {
      assert.doesNotMatch(text, BAD, `bad text in row "${row.label}": ${text}`);
    }
  }
  const main = await page.$eval("main", (el) => el.textContent);
  const match = main.match(BAD);
  assert.equal(match, null, match ? `bad text in <main>: ...${main.slice(Math.max(0, match.index - 40), match.index + 40)}...` : "");
}

async function focusedName(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return "";
    return el.name === "mode" ? `mode:${el.value}` : el.id || el.tagName.toLowerCase();
  });
}

async function main() {
  if (!existsSync(path.join(DIST, PAGE, "index.html"))) {
    console.log("FAIL setup: dist has no calculator page. Run npm run build first.");
    process.exit(1);
  }
  if (!existsSync(CHROME)) {
    console.log(`FAIL setup: Chrome not found at ${CHROME}. Set CHROME_PATH.`);
    process.exit(1);
  }

  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}${PAGE}`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const failures = [];

  // Each case gets a fresh page. A failure is recorded and the run continues.
  const run = async (name, fn) => {
    const page = await browser.newPage();
    try {
      await fn(page);
      console.log(`PASS ${name}`);
    } catch (error) {
      failures.push(name);
      console.log(`FAIL ${name}: ${error.message}`);
    } finally {
      await page.close();
    }
  };

  try {
    await run("loads with no params and shows the worked example", async (page) => {
      await open(page, base);
      const rows = await readRows(page);
      assert.equal(rowByLabel(rows, "Net profit").value, "$700.00");
      assert.equal(rowByLabel(rows, "ROI").value, "16.3%");
      assert.equal(rowByLabel(rows, "ROAS (return on ad spend)").value, "25.0%");
    });

    await run("copy-link fallback stays hidden until it is needed", async (page) => {
      await open(page, base);
      const display = await page.$eval("#calc-link", (el) => getComputedStyle(el).display);
      assert.equal(display, "none");
    });

    const oddCases = [
      { name: "empty spend", fields: { spend: "" } },
      { name: 'spend "0" with tools "0"', fields: { spend: "0", tools: "0" } },
      { name: 'spend "0" with tools "50"', fields: { spend: "0", tools: "50" } },
      { name: 'calls "0"', fields: { calls: "0" } },
      { name: 'bill "0"', fields: { bill: "0" } },
      { name: 'bill "150"', fields: { bill: "150" } },
      { name: 'spend "-5"', fields: { spend: "-5" } },
      { name: 'spend "$1,250.50"', fields: { spend: "$1,250.50" } },
      { name: 'payout "€40"', fields: { payout: "€40" } },
      { name: 'spend "abc"', fields: { spend: "abc" } },
      { name: 'spend "1.2.3"', fields: { spend: "1.2.3" } },
      { name: 'huge spend "999999999999999"', fields: { spend: "999999999999999" } },
      {
        name: "huge spend, calls, and payout at 1000000000000",
        fields: { spend: "1000000000000", calls: "1000000000000", payout: "1000000000000" },
      },
      { name: 'clicks mode with clicks "0" and ctr "8"', mode: "clicks", fields: { clicks: "0", ctr: "8" } },
      { name: 'clicks mode with ctr "101"', mode: "clicks", fields: { ctr: "101" } },
    ];
    for (const item of oddCases) {
      await run(`odd input: ${item.name}`, async (page) => {
        await open(page, base);
        if (item.mode) await setMode(page, item.mode);
        for (const [id, text] of Object.entries(item.fields)) await setField(page, id, text);
        await assertClean(page);
      });
    }

    await run("zero spend: ROAS shows n/a with the reason", async (page) => {
      await open(page, base);
      await setField(page, "spend", "0");
      const roas = rowByLabel(await readRows(page), "ROAS (return on ad spend)");
      assert.equal(roas.value, "n/a");
      assert.equal(roas.detail, "Needs ad spend above $0.");
    });

    await run("zero spend and zero tools: ROI shows n/a with the reason", async (page) => {
      await open(page, base);
      await setField(page, "spend", "0");
      await setField(page, "tools", "0");
      const roi = rowByLabel(await readRows(page), "ROI");
      assert.equal(roi.value, "n/a");
      assert.equal(roi.detail, "ROI can't be calculated when total cost is $0.");
    });

    await run("switching mode hides the other group and its errors", async (page) => {
      await open(page, base);
      await setField(page, "calls", "abc");
      const callsError = () => page.$eval("#calls-error", (el) => ({ text: el.textContent, hidden: el.hidden }));
      assert.equal((await callsError()).hidden, false);
      await setMode(page, "clicks");
      const groups = await page.evaluate(() => ({
        calls: getComputedStyle(document.getElementById("group-calls")).display,
        clicks: getComputedStyle(document.getElementById("group-clicks")).display,
      }));
      assert.equal(groups.calls, "none");
      assert.notEqual(groups.clicks, "none");
      assert.equal((await callsError()).hidden, true);
      assert.equal(await page.$eval("#calls", (el) => el.hasAttribute("aria-invalid")), false);
      await setMode(page, "calls");
      assert.equal((await callsError()).hidden, false);
      assert.equal(await page.$eval("#calls", (el) => el.getAttribute("aria-invalid")), "true");
    });

    await run("query-param round trip gives the same fields and rows", async (page) => {
      await open(page, base);
      await setMode(page, "clicks");
      await setField(page, "spend", "4000");
      await setField(page, "clicks", "2500");
      await setField(page, "ctr", "8");
      await setField(page, "bill", "62.5");
      await setField(page, "payout", "40");
      await setField(page, "tools", "300");
      const url = await page.evaluate(() => location.href);
      const first = { fields: await readFields(page), rows: await readRows(page) };

      const second = await browser.newPage();
      try {
        await open(second, url);
        const replay = { fields: await readFields(second), rows: await readRows(second) };
        assert.deepEqual(replay, first);
      } finally {
        await second.close();
      }
    });

    await run("bad link shows inline errors and no NaN", async (page) => {
      await open(page, base, "?spend=abc&bill=500");
      const spend = await page.$eval("#spend-error", (el) => ({ text: el.textContent, hidden: el.hidden }));
      const bill = await page.$eval("#bill-error", (el) => ({ text: el.textContent, hidden: el.hidden }));
      assert.equal(spend.hidden, false);
      assert.equal(spend.text, "Ad spend must be a number, like 4000 or $4,000.");
      assert.equal(bill.hidden, false);
      assert.equal(bill.text, "Billable rate must be 0 to 100%.");
      assert.equal(await page.$eval("#spend", (el) => el.getAttribute("aria-invalid")), "true");
      const describedBy = await page.$eval("#spend", (el) => el.getAttribute("aria-describedby"));
      assert.ok(describedBy.split(" ").includes("spend-error"), `aria-describedby is ${describedBy}`);
      assert.equal(await page.$eval("#calls", (el) => el.hasAttribute("aria-invalid")), false);
      await assertClean(page);
    });

    await run("fixing an input clears its error and aria-invalid", async (page) => {
      await open(page, base, "?spend=abc");
      await setField(page, "spend", "4000");
      assert.equal(await page.$eval("#spend", (el) => el.hasAttribute("aria-invalid")), false);
      assert.equal(await page.$eval("#spend-error", (el) => el.hidden), true);
      await assertClean(page);
    });

    await run("no horizontal overflow at 375px wide", async (page) => {
      await page.setViewport({ width: 375, height: 800 });
      await open(page, base);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok((await overflow()) <= 375 + 1, `scrollWidth ${await overflow()} at default mode`);
      await setMode(page, "clicks");
      assert.ok((await overflow()) <= 375 + 1, `scrollWidth ${await overflow()} at clicks mode`);
    });

    await run("keyboard: Tab reaches the mode radios and spend, arrows change mode", async (page) => {
      await open(page, base);
      const order = [];
      for (let i = 0; i < 80 && order.at(-1) !== "spend"; i++) {
        await page.keyboard.press("Tab");
        order.push(await focusedName(page));
      }
      assert.equal(order.at(-1), "spend", `Tab never reached #spend. Focus order: ${order.join(", ")}`);
      assert.ok(order.includes("mode:calls"), `Tab skipped the checked radio. Focus order: ${order.join(", ")}`);

      await page.focus('input[name="mode"][value="calls"]');
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.$eval('input[name="mode"]:checked', (el) => el.value), "clicks");
    });
  } finally {
    await browser.close();
    server.close();
  }

  console.log(failures.length === 0 ? "All calculator browser checks passed." : `${failures.length} check(s) failed.`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.log(`FAIL setup: ${error.message}`);
  process.exit(1);
});
