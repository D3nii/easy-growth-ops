// CTA click tracking.
// Every click on an element with data-cta (and every Calendly link, as a fallback) sends one
// `cta_click` event to Vercel Analytics (track) and, only when a real GA4 ID is configured, to GA4.
//
// Params (same for both):
//   cta_id     data-cta value, e.g. "home_hero_roi"
//   cta_label  visible link text
//   cta_type   "booking" | "trial" | "product" | "pricing" | "contact"
//   product    "roi" | "drops" | "both" | "none"
//   page       location.pathname, e.g. "/roi/"
//   link_url   destination href
import { track as vercelTrack } from "@vercel/analytics";
import { BOOK_URL, GA4_MEASUREMENT_ID } from "../site.config.js";

const PLACEHOLDER = /^G-X+$/i;
const VALID_GA4 = /^G-[A-Z0-9]{4,}$/i;

/** The configured ID, or "" when it is missing / still the placeholder. */
export function ga4Id() {
  const id = String(import.meta.env.VITE_GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID || "").trim();
  return VALID_GA4.test(id) && !PLACEHOLDER.test(id) ? id : "";
}

let gaReady = false;

/** Loads gtag.js only when a real measurement ID exists. Otherwise does nothing: no script, no requests. */
export function initGa4() {
  const id = ga4Id();
  if (!id || gaReady) return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself.
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  gaReady = true;
  return true;
}

function isBooking(href) {
  return href.startsWith(BOOK_URL) || /^https:\/\/calendly\.com\//.test(href);
}

function ctaParams(el) {
  const href = el.getAttribute("href") || "";
  const label = (el.getAttribute("data-cta-label") || el.textContent || "").replace(/\s+/g, " ").trim();
  return {
    cta_id: el.getAttribute("data-cta") || `${isBooking(href) ? "booking" : "link"}_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    cta_label: label.slice(0, 100),
    cta_type: el.getAttribute("data-cta-type") || (isBooking(href) ? "booking" : "product"),
    product: el.getAttribute("data-product") || "none",
    page: window.location.pathname,
    link_url: el.href || href,
  };
}

export function trackCta(params) {
  try {
    vercelTrack("cta_click", params);
  } catch {
    // Analytics must never break a click.
  }
  if (gaReady && typeof window.gtag === "function") {
    window.gtag("event", "cta_click", { ...params, transport_type: "beacon" });
  }
}

export function initCtaTracking() {
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const el = event.target.closest("a[data-cta], button[data-cta], a[href*='calendly.com/']");
      if (!el) return;
      trackCta(ctaParams(el));
    },
    { capture: true },
  );
}
