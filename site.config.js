// Single source of truth for site-wide settings.
// HTML pages use these through build-time tokens (see scripts/vite-site-plugin.js):
//   __SITE_URL__       -> SITE_URL (no trailing slash)
//   __SITE_DOMAIN__    -> SITE_URL host without "www."
//   __CONTACT_EMAIL__  -> CONTACT_EMAIL
//   __UPDATED_ISO__    -> page last-modified date, e.g. 2026-10-08
//   __UPDATED_HUMAN__  -> page last-modified date, e.g. 8 October 2026

/**
 * Canonical origin. Every canonical, og:url, og:image, JSON-LD URL, sitemap <loc>, and the
 * robots.txt sitemap line use this. Vercel 308s the bare apex to www, so keep www.
 */
export const SITE_URL = "https://www.geteasygrowthops.co";

/**
 * GA4 measurement ID, e.g. "G-ABC123DEF4".
 * TODO(Danyal): paste the real ID here (or set VITE_GA4_MEASUREMENT_ID in Vercel).
 * While this is empty or the "G-XXXXXXXXXX" placeholder, gtag.js is never loaded
 * and nothing is sent to Google. Vercel Analytics keeps working either way.
 */
export const GA4_MEASUREMENT_ID = "";

/**
 * Public contact address shown in the footer and the legal pages.
 * TODO(Danyal): confirm this inbox exists (or replace it) before merging.
 */
export const CONTACT_EMAIL = "hello@geteasygrowthops.co";

/** Every booking / trial CTA opens this Calendly page. */
export const BOOK_URL = "https://calendly.com/danyal-jamil/30min";

/**
 * Pages built by Vite and listed in sitemap.xml.
 * lastmod is computed at build time from the last git commit that touched `file`
 * (falls back to the file's mtime). Set `lastmod: "YYYY-MM-DD"` to pin a date.
 */
export const PAGES = [
  { name: "main", path: "/", file: "index.html", changefreq: "weekly", priority: "1.0" },
  { name: "roi", path: "/roi/", file: "roi/index.html", changefreq: "weekly", priority: "0.9" },
  { name: "drops", path: "/drops/", file: "drops/index.html", changefreq: "weekly", priority: "0.8" },
  { name: "privacy", path: "/privacy/", file: "privacy/index.html", changefreq: "yearly", priority: "0.3" },
  { name: "terms", path: "/terms/", file: "terms/index.html", changefreq: "yearly", priority: "0.3" },
];
