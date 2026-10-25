// Single source of truth for site-wide settings.
// HTML pages use these through build-time tokens (see scripts/vite-site-plugin.js):
//   __SITE_URL__       -> SITE_URL (no trailing slash)
//   __SITE_DOMAIN__    -> SITE_URL host without "www."
//   __CONTACT_EMAIL__  -> CONTACT_EMAIL
//   __MEDIA_PRICE__    -> MEDIA_PRICE (managed media buying page)
//   __MEDIA_MIN_SPEND__ -> MEDIA_MIN_SPEND (managed media buying page)
//   __MEDIA_FEE_ROWS__ -> <tr> rows built from MEDIA_FEE_TIERS (managed media buying page)
//   __MEDIA_FEE_TEXT__ -> MEDIA_FEE_TIERS + MEDIA_FEE_EXAMPLES as one plain sentence (FAQ + JSON-LD)
//   __MEDIA_FEE_EXAMPLES__ -> MEDIA_FEE_EXAMPLES
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
 * Managed media buying pricing (/managed-media-buying/). Final pricing from Danyal, Oct 25, 2026.
 * Defined once here. The page uses these through the __MEDIA_*__ build tokens (fee table, hero, FAQ,
 * FAQPage JSON-LD), and llms.txt reads them below, so editing them here updates every mention.
 */
export const MEDIA_PRICE = "From $2,000/month";
export const MEDIA_MIN_SPEND = "$10k a month";
export const MEDIA_FEE_TIERS = [
  { spend: "$10k to $50k", fee: "$2,000/month or 10% of monthly ad spend, whichever is higher" },
  { spend: "$50k to $100k", fee: "10% on the first $50k plus 8% on spend above $50k" },
  { spend: "Above $100k", fee: "Custom quote" },
];
export const MEDIA_FEE_EXAMPLES = "$5,000 at $50k spend, $9,000 at $100k spend";

const lowerFirst = (str) => str.charAt(0).toLowerCase() + str.slice(1);

/** The fee tiers as one plain sentence, for the FAQ, its JSON-LD, and llms.txt. */
export const MEDIA_FEE_TEXT =
  "Management fee by monthly ad spend: " +
  MEDIA_FEE_TIERS.map((t) => `${lowerFirst(t.spend)}, ${lowerFirst(t.fee)}`).join("; ") +
  `. For example, ${MEDIA_FEE_EXAMPLES}.`;

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
    name: "pay-per-call-profit-formula",
    path: "/guides/pay-per-call-profit-formula/",
    file: "guides/pay-per-call-profit-formula/index.html",
    changefreq: "monthly",
    priority: "0.7",
    layout: "content",
    schema: "Article",
    published: "2026-10-08",
    title: "Pay-Per-Call Profit Formula: Profit, ROAS, ROI, Break-Even",
    h1: "How to Calculate Pay-Per-Call Profit, ROAS, and ROI (With Formulas)",
    description:
      "Pay-per-call net profit = call payout − Meta, Google, and TikTok spend − call-platform fees. ROAS vs ROI, break-even cost per call, and sheet formulas.",
    breadcrumb: "Pay-per-call profit formula",
    ogImage: "pay-per-call-profit-formula",
    ogImageAlt: "Pay-per-call profit formula: call payout minus ad spend minus call-platform fees, plus ROAS, ROI, and break-even cost per call.",
    guide: {
      section: "Formulas",
      summary:
        "Net profit, ROAS, ROI, revenue per call, and break-even cost per call for pay-per-call, with a worked example, common mistakes, and formulas to paste into a sheet.",
    },
    llms: {
      section: "Guides",
      title: "Pay-per-call profit formula",
      summary:
        "Formulas and definitions for pay-per-call buyers: net profit = call payout − ad spend (Meta + Google + TikTok) − call-platform fees; ROAS; ROI; revenue per call; cost per call vs cost per click; break-even cost per call and break-even ROAS.",
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
    lastmod: "2026-10-13",
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
        "ROI vs RedTrack for pay-per-call buyers: click-ID attribution and CAPI (RedTrack) vs a read-only Slack P&L per ad account (ROI), with RedTrack spend-sync tiers and prices as of Oct 2026.",
    },
  },
  {
    name: "aca-pay-per-call",
    path: "/verticals/aca-pay-per-call/",
    file: "verticals/aca-pay-per-call/index.html",
    changefreq: "monthly",
    priority: "0.7",
    layout: "content",
    schema: "Article",
    published: "2026-10-08",
    title: "ACA Pay-Per-Call for Media Buyers: OEP Profit Guide (2026)",
    h1: "ACA Pay-Per-Call on Meta and Google: A Media Buyer’s P&L Guide for Open Enrollment",
    description:
      "ACA pay-per-call for media buyers: how calls pay, the 2027 open enrollment calendar, Meta, Google, and TikTok rules for insurance ads, and intraday profit.",
    breadcrumb: "ACA pay-per-call",
    ogImage: "aca-pay-per-call",
    ogImageAlt: "ACA pay-per-call for media buyers: how ACA calls pay, the open enrollment calendar, and call payout next to Meta, Google, and TikTok spend.",
    guide: {
      section: "Verticals",
      summary:
        "How ACA calls pay, the 2027 open enrollment calendar (as of 8 October 2026), Meta, Google, and TikTok ad rules for insurance, and how to watch profit intraday.",
    },
    llms: {
      section: "Guides",
      title: "ACA pay-per-call for media buyers",
      summary:
        "ACA pay-per-call from the media buyer's side: ad → call platform → licensed buyer → payout per billable call; HealthCare.gov open enrollment for 2027 coverage (1 Nov 2026–15 Jan 2027, 15 Dec cutoff for 1 Jan coverage, per HealthCare.gov and CMS as of 8 October 2026); Meta Special Ad Category, Google call-only ad retirement, TikTok financial services policy, CMS marketing guidance for agents; and the ACA P&L.",
    },
  },
  {
    name: "pay-per-call-profit-tracking",
    path: "/guides/pay-per-call-profit-tracking/",
    file: "guides/pay-per-call-profit-tracking/index.html",
    changefreq: "monthly",
    priority: "0.7",
    layout: "content",
    schema: "Article",
    published: "2026-10-13",
    title: "Pay-Per-Call Profit Tracking: 5 Ways Compared (2026)",
    h1: "Pay-Per-Call Profit Tracking: Spreadsheet vs Call Platform vs Tracker vs Slack P&L",
    description:
      "Five ways to track pay-per-call profit: spreadsheet, call-platform reports, tracker, DIY automation, or Slack P&L. Compare them and pick one.",
    breadcrumb: "Pay-per-call profit tracking",
    ogImage: "pay-per-call-profit-tracking",
    ogImageAlt: "Pay-per-call profit tracking: spreadsheet, call platform, tracker, DIY automation, and Slack P&L compared.",
    guide: {
      section: "Methods",
      summary:
        "Five ways to track pay-per-call profit compared: a spreadsheet, call-platform reports, an ad tracker, a DIY build, and a Slack P&L. What each shows, its limits, dated tracker pricing, and how to choose.",
    },
    llms: {
      section: "Guides",
      title: "Pay-per-call profit tracking",
      summary:
        "Five ways to track pay-per-call profit: a spreadsheet, call-platform reporting (call-side, usually without ad spend), an ad tracker with call integration (RedTrack and ClickFlare prices as of 13 Oct 2026), a DIY Make or n8n build, and a Slack P&L (ROI, every 15–30 minutes, depending on setup). Includes a decision list and common mistakes.",
    },
  },
  {
    name: "ringba-google-ads-profit",
    path: "/integrations/ringba-google-ads-profit/",
    file: "integrations/ringba-google-ads-profit/index.html",
    changefreq: "monthly",
    priority: "0.7",
    layout: "content",
    schema: "TechArticle",
    published: "2026-10-21",
    title: "Ringba + Google Ads: Call Assets, Conversions, Profit (2026)",
    h1: "Ringba Google Ads Integration After Call-Only Ads: From Conversion Upload to Profit",
    description:
      "Google call-only ads end in Feb 2027. Move pay-per-call to call assets, check the Ringba upload, then see profit, not just conversions.",
    breadcrumb: "Ringba Google Ads integration",
    ogImage: "ringba-google-ads-profit",
    ogImageAlt: "Ringba + Google Ads: move from call-only ads to call assets, check the conversion upload, then see profit.",
    guide: {
      section: "Integrations",
      summary:
        "How to move from Google call-only ads to call assets before February 2027, connect Ringba's Google Ads integration, and see profit after spend and fees.",
    },
    llms: {
      section: "Guides",
      title: "Ringba Google Ads integration",
      summary:
        "Google removed new call-only ad creation in Feb 2026 and existing call ads stop serving in Feb 2027. Steps to move to call assets, Ringba's Google Ads integration doc (checked 21 Oct 2026), upload timing values, and why conversions are not profit.",
    },
  },
  {
    name: "managed-media-buying",
    path: "/managed-media-buying/",
    file: "managed-media-buying/index.html",
    changefreq: "monthly",
    priority: "0.7",
    llms: {
      section: "Services",
      title: "Managed media buying for pay-per-call",
      summary:
        `Done-for-you paid media for pay-per-call buyers: Danyal Jamil's team runs Google Search, Google Display, YouTube, Meta video, and Meta display ads. ${MEDIA_PRICE}. ${MEDIA_FEE_TEXT} Minimum ${MEDIA_MIN_SPEND} in ad spend, paid by the client directly to the platforms. The ROI Slack profit report is included. A small number of client spots.`,
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
