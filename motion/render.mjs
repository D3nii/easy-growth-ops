// Renders motion compositions to MP4 by seeking each frame in headless Chrome and piping PNGs into ffmpeg.
//   node motion/render.mjs roi drops         full renders into public/walkthroughs/
//   node motion/render.mjs roi --stills 1,6  PNG stills into motion/out/ for review
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(root, "public", "walkthroughs");
const stillDir = join(root, "motion", "out");
const chrome = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    const file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

const args = process.argv.slice(2);
const stillsIdx = args.indexOf("--stills");
const stills = stillsIdx >= 0 ? args[stillsIdx + 1].split(",").map(Number) : null;
const names = args.filter((a, i) => !a.startsWith("--") && (stillsIdx < 0 || i !== stillsIdx + 1));

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars", "--font-render-hinting=none"],
});

for (const name of names) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error(`[${name}]`, e.message));
  await page.goto(`${base}/motion/${name}.html?render`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__ready === true");
  const { duration, fps } = await page.evaluate(() => window.__composition);
  const stage = await page.$(".stage");

  if (stills) {
    mkdirSync(stillDir, { recursive: true });
    for (const t of stills) {
      await page.evaluate((x) => window.__seek(x), t);
      const file = join(stillDir, `${name}-${t.toFixed(2)}.png`);
      writeFileSync(file, await stage.screenshot({ type: "png" }));
      console.log(file);
    }
    await page.close();
    continue;
  }

  mkdirSync(outDir, { recursive: true });
  const mp4 = join(outDir, `${name}.mp4`);
  const ff = spawn(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
      "-profile:v", "high", "-movflags", "+faststart", mp4,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const frames = Math.round(duration * fps);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((x) => window.__seek(x), i / fps);
    const buf = await stage.screenshot({ type: "png", optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
    if (i % 60 === 0) process.stdout.write(`\r${name}: ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((ok, fail) => ff.on("close", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c}`)))));
  console.log(`\r${name}: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s -> ${mp4}`);

  const poster = join(outDir, `${name}-poster.jpg`);
  await page.evaluate((x) => window.__seek(x), duration - 0.5);
  writeFileSync(poster, await stage.screenshot({ type: "jpeg", quality: 88 }));
  await page.close();
}

await browser.close();
server.close();
