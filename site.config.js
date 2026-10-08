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
 * Public contact address shown in the footer and the legal pages (inbox confirmed).
 */
export const CONTACT_EMAIL = "hello@geteasygrowthops.co";

/** Every booking / trial CTA opens this Calendly page. */
export const BOOK_URL = "https://calendly.com/danyal-jamil/30min";

/**
 * Pages built by Vite and listed in sitemap.xml and llms.txt.
 * lastmod is computed at build time from the last git commit that touched `file`
 * (falls back to the file's mtime). Set `lastmod: "YYYY-MM-DD"` to pin a date.
 *
 * Content pages (`layout: "content"`) are rendered by scripts/content-layout.js with
 * layouts/content.html: the page's HTML file only holds the article body. Their entry
 * here supplies the <head> metadata, breadcrumbs, JSON-LD types, and the Guides hub card.
 *
 *   title          <title> and og:title (keep it at or under 60 characters)
 *   h1             article headline (JSON-LD headline)
 *   description    meta description and og:description
 *   breadcrumb     last breadcrumb label
 *   schema         "TechArticle" | "Article" | "CollectionPage"
 *                  FAQPage and HowTo JSON-LD are added automatically when the body
 *                  contains [data-faq] / ol[data-howto] blocks
 *   software       true adds the ROI SoftwareApplication node (only when the body states ROI's price)
 *   published      datePublished, YYYY-MM-DD
 *   ogImage        name of a PNG in public/og/ (render it with `npm run og`)
 *   ogImageAlt     alt text for that image
 *   guide          { section, summary } lists the page on /guides/
 *   llms           { section, summary } lists the page in /llms.txt
 */
export const PAGES = [
  {
    name: "main",
    path: "/",
    file: "index.html",
    changefreq: "weekly",
    priority: "1.0",
    llms: { section: "Products", title: "Easy Growth Ops", summary: "Home page: what ROI and Drops do, pricing, and FAQ." },
  },
  {
    name: "roi",
    path: "/roi/",
    file: "roi/index.html",
    changefreq: "weekly",
    priority: "0.9",
    llms: {
      section: "Products",
      title: "ROI: pay-per-call Slack P&L",
      summary:
        "Call payout from Ringba, CallGrid, TrackDrive, Retreaver, or Phonexa next to Meta, Google, and TikTok ad spend, posted to Slack every 15–30 minutes, depending on setup. Read-only. Pricing, comparison with RedTrack/Make/Looker Studio, and FAQ.",
    },
  },
  {
    name: "drops",
    path: "/drops/",
    file: "drops/index.html",
    changefreq: "weekly",
    priority: "0.8",
    llms: {
      section: "Products",
      title: "Drops: winning ads in Slack",
      summary: "Yesterday's winning Meta, Google, and TikTok ads in a Slack thread each morning. $79/mo after a 14-day free trial.",
    },
  },
  {
    name: "guides",
    path: "/guides/",
    file: "guides/index.html",
    changefreq: "weekly",
    priority: "0.6",
    layout: "content",
    schema: "CollectionPage",
    title: "Pay-per-call profit guides | Easy Growth Ops",
    h1: "Guides for pay-per-call media buyers.",
    description:
      "Guides for pay-per-call media buyers: how to see call payout next to Meta, Google, and TikTok ad spend, and how to build a profit report around your call platform.",
    breadcrumb: "Guides",
    ogImage: "guides",
    ogImageAlt: "Easy Growth Ops guides for pay-per-call media buyers.",
    llms: { section: "Guides", title: "Guides hub", summary: "Index of every Easy Growth Ops guide." },
  },
  {
    name: "ringba-facebook-ads-profit-report",
    path: "/integrations/ringba-facebook-ads-profit-report/",
    file: "integrations/ringba-facebook-ads-profit-report/index.html",
    changefreq: "monthly",
    priority: "0.7",
    layout: "content",
    schema: "TechArticle",
    software: true,
    published: "2026-10-08",
    title: "Ringba + Facebook Ads Profit Report (Meta Spend vs Payout)",
    h1: "Ringba + Facebook Ads Profit Report: See Call Payout Next to Meta Spend",
    description:
      "Ringba reports call revenue and payout; Meta reports spend. How to put them in one profit report: the formula, a manual Sheets method, a DIY API build, and ROI in Slack.",
    breadcrumb: "Ringba + Facebook Ads profit report",
    ogImage: "ringba-facebook-ads-profit-report",
    ogImageAlt: "Ringba + Facebook Ads profit report: call payout next to Meta spend, minus Ringba fees.",
    guide: {
      section: "Integrations",
      summary:
        "What Ringba reports, what its Facebook integration does, and three ways to see call payout next to Meta spend: a sheet, a DIY API build, or ROI in Slack.",
    },
    llms: {
      section: "Guides",
      title: "Ringba + Facebook Ads profit report",
      summary:
        "How to see Ringba call revenue or payout next to Meta ad spend: Ringba report columns, the Facebook Conversions API integration, the profit formula, and three ways to build the report.",
    },
  },
  {
    name: "redtrack-alternative-pay-per-call",
    path: "/compare/redtrack-alternative-pay-per-call/",
    file: "compare/redtrack-alternative-pay-per-call/index.html",
    changefreq: "monthly",
    priority: "0.7",
    layout: "content",
    schema: "Article",
    software: true,
    published: "2026-10-08",
    title: "RedTrack Alternative for Pay-Per-Call Buyers (2026) | ROI",
    h1: "RedTrack Alternative for Pay-Per-Call: When You Need Profit in Slack, Not Another Tracker",
    description:
      "RedTrack is an attribution tracker; ROI is a read-only Slack P&L for pay-per-call buyers. Who should stay on RedTrack, dated pricing, and how to use both.",
    breadcrumb: "RedTrack alternative for pay-per-call",
    ogImage: "redtrack-alternative-pay-per-call",
    ogImageAlt: "RedTrack alternative for pay-per-call: profit visibility in Slack vs click-ID attribution in a tracker.",
    guide: {
      section: "Comparisons",
      summary:
        "Attribution vs profit visibility: who should stay on RedTrack, what ROI does instead, a side-by-side table, dated pricing, and how to run both.",
    },
    llms: {
      section: "Guides",
      title: "RedTrack alternative for pay-per-call",
      summary:
        "ROI vs RedTrack for pay-per-call buyers: click-ID attribution and CAPI (RedTrack) vs a read-only Slack P&L per ad account (ROI), with RedTrack spend-sync tiers and prices as of 8 October 2026.",
    },
  },
  {
    name: "privacy",
    path: "/privacy/",
    file: "privacy/index.html",
    changefreq: "yearly",
    priority: "0.3",
    llms: { section: "Legal", title: "Privacy policy", summary: "What Easy Growth Ops collects and how read-only platform access is handled." },
  },
  {
    name: "terms",
    path: "/terms/",
    file: "terms/index.html",
    changefreq: "yearly",
    priority: "0.3",
    llms: { section: "Legal", title: "Terms of service", summary: "Terms for the ROI and Drops services." },
  },
];
