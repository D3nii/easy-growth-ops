// Single source of truth for site-wide settings.
// HTML pages use these through build-time tokens (see scripts/vite-site-plugin.js):
//   __SITE_URL__     -> SITE_URL (no trailing slash)
//   __SITE_DOMAIN__  -> SITE_URL host without "www."

/**
 * Canonical origin. Every canonical, og:url, JSON-LD URL, sitemap <loc>, and the
 * robots.txt sitemap line use this. Vercel 308s the bare apex to www, so keep www.
 */
export const SITE_URL = "https://www.geteasygrowthops.co";

/** Pages built by Vite and listed in sitemap.xml. */
export const PAGES = [
  { name: "main", path: "/", file: "index.html", lastmod: "2026-09-16", changefreq: "weekly", priority: "1.0" },
  { name: "roi", path: "/roi/", file: "roi/index.html", lastmod: "2026-09-16", changefreq: "weekly", priority: "0.9" },
  { name: "drops", path: "/drops/", file: "drops/index.html", lastmod: "2026-09-16", changefreq: "weekly", priority: "0.8" },
];
