// Build-time SEO helpers for the static site:
// - replaces __SITE_URL__ / __SITE_DOMAIN__ / __CONTACT_EMAIL__ / __UPDATED_*__ tokens in every page
// - emits sitemap.xml (with lastmod from git) and robots.txt pointing at SITE_URL
// - serves both files in `vite dev` too
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { CONTACT_EMAIL, PAGES, SITE_URL } from "../site.config.js";

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

export function buildInputs(root) {
  return Object.fromEntries(PAGES.map((page) => [page.name, resolve(root, page.file)]));
}

export default function sitePlugin(root) {
  const pageFor = (filename) => PAGES.find((page) => resolve(root, page.file) === resolve(filename));

  return {
    name: "egops-site",

    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const page = pageFor(ctx.filename);
        const updated = page ? lastModified(root, page) : isoDate(new Date());
        const out = html
          .replaceAll("__SITE_URL__", SITE_URL)
          .replaceAll("__SITE_DOMAIN__", SITE_DOMAIN)
          .replaceAll("__CONTACT_EMAIL__", CONTACT_EMAIL)
          .replaceAll("__UPDATED_ISO__", updated)
          .replaceAll("__UPDATED_HUMAN__", humanDate(updated));
        const leftover = out.match(/__[A-Z_]+__/);
        if (leftover) console.warn(`[egops-site] Unknown token ${leftover[0]} in ${ctx.filename}`);
        return out;
      },
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path === "/sitemap.xml") {
          res.setHeader("content-type", "application/xml; charset=utf-8");
          res.end(sitemapXml(root));
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
    },
  };
}
