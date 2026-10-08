// Renders the 1200x630 social preview images (og:image / twitter:image) into public/og/.
//   npm run og
// Needs Chrome or Chromium (CHROME_PATH to override).
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const template = pathToFileURL(join(root, "scripts/og/template.html")).href;
const outDir = join(root, "public/og");
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["home", "roi", "drops", "guides", "ringba-facebook-ads-profit-report"];

const candidates = [
  process.env.CHROME_PATH,
  "/usr/local/bin/google-chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = candidates.find((path) => existsSync(path));
if (!executablePath) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--allow-file-access-from-files", "--no-sandbox", "--font-render-hinting=none"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  for (const name of pages) {
    await page.goto(`${template}?page=${name}`, { waitUntil: "load" });
    await page.waitForSelector("body[data-ready]");
    const file = join(outDir, `${name}.png`);
    await page.screenshot({ path: file, type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log(`wrote ${file}`);
  }
} finally {
  await browser.close();
}
