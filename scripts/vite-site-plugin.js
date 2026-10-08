// Build-time SEO helpers for the static site:
// - replaces __SITE_URL__ / __SITE_DOMAIN__ tokens in every page (dev and build)
// - emits sitemap.xml and robots.txt pointing at SITE_URL
// - serves both files in `vite dev` too
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PAGES, SITE_URL } from "../site.config.js";

const SITE_DOMAIN = new URL(SITE_URL).host.replace(/^www\./, "");

export function sitemapXml() {
  const urls = PAGES.map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${page.lastmod}</lastmod>
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
  return {
    name: "egops-site",

    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const out = html.replaceAll("__SITE_URL__", SITE_URL).replaceAll("__SITE_DOMAIN__", SITE_DOMAIN);
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
          res.end(sitemapXml());
        } else if (path === "/robots.txt") {
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(robotsTxt(root));
        } else {
          next();
        }
      });
    },

    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(root) });
    },
  };
}
