// Build-time SEO helpers for the static site:
// - renderPage(): per page, renders content pages (layout: "content") through scripts/content-layout.js,
//   replaces __SCHEMA_SITE_NODES__ with the shared Organization + WebSite JSON-LD (scripts/schema.js),
//   then replaces __SITE_URL__ / __SITE_DOMAIN__ / __CONTACT_EMAIL__ / __UPDATED_*__ tokens
// - emits sitemap.xml (with lastmod from git), robots.txt, llms.txt, and llms-full.txt from SITE_URL + PAGES
//   (llms-full.txt is llms.txt plus the plain text of every page's <main>, via scripts/main-text.js)
// - serves those four files in `vite dev` too
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parse } from "node-html-parser";
import { CONTACT_EMAIL, PAGES, SITE_URL } from "../site.config.js";
import { guideLinksHtml, renderContentPage } from "./content-layout.js";
import { mainText } from "./main-text.js";
import { SCHEMA_SITE_NODES_TOKEN, siteNodesJson } from "./schema.js";

const SITE_DOMAIN = new URL(SITE_URL).host.replace(/^www\./, "");

function isoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function git(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** Last time the page source changed: today if it has uncommitted edits, else its last commit date, else mtime. */
export function lastModified(root, page) {
  if (page.lastmod) return page.lastmod;
  const file = resolve(root, page.file);
  const rel = relative(root, file);
  const dirty = git(root, ["status", "--porcelain", "--", rel]);
  if (dirty) return isoDate(new Date());
  const committed = git(root, ["log", "-1", "--format=%cs", "--", rel]);
  if (/^\d{4}-\d{2}-\d{2}$/.test(committed)) return committed;
  try {
    return isoDate(statSync(file).mtime);
  } catch {
    return isoDate(new Date());
  }
}

function humanDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function sitemapXml(root) {
  const urls = PAGES.map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastModified(root, page)}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robotsTxt(root) {
  return readFileSync(resolve(root, "scripts/robots.template.txt"), "utf8").replaceAll("__SITE_URL__", SITE_URL);
}

/** llms.txt (https://llmstxt.org): the key pages, grouped, with one-line summaries. */
export function llmsTxt() {
  const sections = new Map();
  for (const page of PAGES.filter((p) => p.llms)) {
    const list = sections.get(page.llms.section) || [];
    list.push(`- [${page.llms.title}](${SITE_URL}${page.path}): ${page.llms.summary}`);
    sections.set(page.llms.section, list);
  }
  const body = [...sections].map(([name, lines]) => `## ${name}\n\n${lines.join("\n")}`).join("\n\n");
  return `# Easy Growth Ops

> Two Slack-delivered tools for performance marketers. ROI posts call payout from one call platform (Ringba, CallGrid, TrackDrive, Retreaver, or Phonexa) next to Meta Ads, Google Ads, and TikTok Ads spend in Slack every 15–30 minutes, depending on setup, read-only. Drops sends yesterday's winning Meta, Google, and TikTok ads to Slack each morning.

Full text of every page: ${SITE_URL}/llms-full.txt

Net profit in ROI = call payout − Meta spend − Google spend − TikTok spend − call-platform fees. ROI reports ROAS as a return, (revenue − spend) ÷ spend, so 0% is break-even on ad spend. The industry-standard ROAS (Google Ads' definition) is call payout ÷ ad spend, shown as a ratio or percentage (e.g. 1.25× or 125%); the two differ by exactly 100 percentage points. ROAS ignores call-platform fees; net profit and ROI subtract them. Pricing: ROI is $200 the first month (setup included), then $100/mo for the first 50 shops; Drops is $79/mo after a 14-day free trial; both are $150/mo.

${body}
`;
}

/**
 * llms-full.txt: llms.txt, then one section per page in PAGES order with the page's
 * rendered <main> as plain text. Every page is read from its source file through renderPage().
 */
export function llmsFullTxt(root) {
  const sections = PAGES.map((page) => {
    const html = renderPage(root, page, readFileSync(resolve(root, page.file), "utf8"));
    const main = parse(html).querySelector("main");
    if (!main) throw new Error(`[llms-full] ${page.file}: no <main> element`);
    const title = page.llms?.title || page.title || page.name;
    return `\n---\n\nPage: ${title}\nURL: ${SITE_URL}${page.path}\n\n${mainText(main)}\n`;
  });
  return llmsTxt() + sections.join("");
}

export function buildInputs(root) {
  return Object.fromEntries(PAGES.map((page) => [page.name, resolve(root, page.file)]));
}

/**
 * Full HTML for one page (page is its PAGES entry, or undefined for an unlisted HTML file):
 * content layout first, then the shared JSON-LD nodes, then the other build tokens.
 */
export function renderPage(root, page, html) {
  const updated = page ? lastModified(root, page) : isoDate(new Date());
  if (page?.layout === "content") html = renderContentPage(root, page, html);
  const out = html
    .replace(/<!--@guide-links:(\w+)-->/g, (_, prefix) => guideLinksHtml(prefix))
    .replaceAll(SCHEMA_SITE_NODES_TOKEN, () => siteNodesJson())
    .replaceAll("__SITE_URL__", SITE_URL)
    .replaceAll("__SITE_DOMAIN__", SITE_DOMAIN)
    .replaceAll("__CONTACT_EMAIL__", CONTACT_EMAIL)
    .replaceAll("__UPDATED_ISO__", updated)
    .replaceAll("__UPDATED_HUMAN__", humanDate(updated));
  const leftover = out.match(/__[A-Z_]+__/);
  if (leftover) console.warn(`[egops-site] Unknown token ${leftover[0]} in ${page?.file ?? "an unlisted page"}`);
  return out;
}

export default function sitePlugin(root) {
  const pageFor = (filename) => PAGES.find((page) => resolve(root, page.file) === resolve(filename));

  return {
    name: "egops-site",

    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        return renderPage(root, pageFor(ctx.filename), html);
      },
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path === "/sitemap.xml") {
          res.setHeader("content-type", "application/xml; charset=utf-8");
          res.end(sitemapXml(root));
        } else if (path === "/llms.txt") {
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(llmsTxt());
        } else if (path === "/llms-full.txt") {
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(llmsFullTxt(root));
        } else if (path === "/robots.txt") {
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(robotsTxt(root));
        } else {
          next();
        }
      });
    },

    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(root) });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(root) });
      this.emitFile({ type: "asset", fileName: "llms.txt", source: llmsTxt() });
      this.emitFile({ type: "asset", fileName: "llms-full.txt", source: llmsFullTxt(root) });
    },
  };
}
